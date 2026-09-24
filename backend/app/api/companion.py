import json
import traceback
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from google import genai
from google.genai import types, errors
import httpx

from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.companion_memory import CompanionMemory
from app.config import settings

router = APIRouter(prefix="/companion", tags=["companion"])

client = genai.Client(api_key=settings.GEMINI_API_KEY)

ACTIVE_COMPANION_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
]

class MessageCreate(BaseModel):
    message: Optional[str] = None
    content: Optional[str] = None
    text: Optional[str] = None
    edit_message_id: Optional[int] = None

    @property
    def actual_text(self) -> str:
        return self.message or self.content or self.text or ""

@router.get("/conversations", response_model=List[dict])
async def get_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Conversation)
        .where(
            Conversation.user_id == current_user.id,
            ~Conversation.title.like("rag_%"),
        )
        .order_by(desc(Conversation.created_at))
    )
    convos = (await db.execute(stmt)).scalars().all()
    return [{"id": c.id, "title": c.title, "created_at": c.created_at.isoformat()} for c in convos]

@router.post("/conversations", response_model=dict)
async def create_conversation(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    convo = Conversation(user_id=current_user.id, title="New Chat")
    db.add(convo)
    await db.commit()
    await db.refresh(convo)
    return {"id": convo.id, "title": convo.title, "created_at": convo.created_at.isoformat()}

@router.delete("/conversations/{convo_id}")
async def delete_conversation(
    convo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Conversation).where(
        Conversation.id == convo_id, Conversation.user_id == current_user.id
    )
    convo = (await db.execute(stmt)).scalar_one_or_none()
    if convo:
        msg_stmt = select(Message).where(Message.conversation_id == convo.id)
        msgs = (await db.execute(msg_stmt)).scalars().all()
        for m in msgs:
            await db.delete(m)
        await db.delete(convo)
        await db.commit()
    return {"message": "Conversation deleted successfully"}

@router.get("/memories", response_model=List[dict])
async def get_memories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(CompanionMemory)
        .where(CompanionMemory.user_id == current_user.id)
        .order_by(desc(CompanionMemory.created_at))
    )
    memories = (await db.execute(stmt)).scalars().all()
    return [{"id": m.id, "content": m.content, "created_at": m.created_at.isoformat()} for m in memories]

@router.delete("/memories/{memory_id}")
async def delete_memory(
    memory_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CompanionMemory).where(
        CompanionMemory.id == memory_id, CompanionMemory.user_id == current_user.id
    )
    mem = (await db.execute(stmt)).scalar_one_or_none()
    if mem:
        await db.delete(mem)
        await db.commit()
    return {"message": "Memory deleted successfully"}

@router.get("/conversations/{convo_id}/messages", response_model=List[dict])
async def get_messages(
    convo_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Conversation).where(
        Conversation.id == convo_id, Conversation.user_id == current_user.id
    )
    convo = (await db.execute(stmt)).scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg_stmt = (
        select(Message)
        .where(Message.conversation_id == convo.id)
        .order_by(Message.created_at)
    )
    messages = (await db.execute(msg_stmt)).scalars().all()
    
    return [
        {
            "id": m.id,
            "sender": m.sender,
            "text": m.content.replace("\\n", "\n") if m.content else "",      
            "content": m.content.replace("\\n", "\n") if m.content else "",    
            "message": m.content.replace("\\n", "\n") if m.content else "",    
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]

@router.post("/conversations/{convo_id}/chat", response_model=dict)
async def chat_with_companion(
    convo_id: int,
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_msg_text = payload.actual_text
    
    if not user_msg_text:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    stmt = select(Conversation).where(
        Conversation.id == convo_id,
        Conversation.user_id == current_user.id,
        ~Conversation.title.like("rag_%"),
    )
    convo = (await db.execute(stmt)).scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if payload.edit_message_id:
        target_msg_stmt = select(Message).where(
            Message.id == payload.edit_message_id, 
            Message.conversation_id == convo.id
        )
        target_msg = (await db.execute(target_msg_stmt)).scalar_one_or_none()
        if target_msg:
            subsequent_msgs_stmt = select(Message).where(
                Message.conversation_id == convo.id,
                Message.id >= target_msg.id
            )
            subsequent_msgs = (await db.execute(subsequent_msgs_stmt)).scalars().all()
            for sm in subsequent_msgs:
                await db.delete(sm)
            await db.commit()

    mem_stmt = select(CompanionMemory).where(CompanionMemory.user_id == current_user.id)
    memories = (await db.execute(mem_stmt)).scalars().all()
    memory_context = "\n".join([f"- {m.content}" for m in memories]) if memories else "None recorded yet."

    hist_stmt = (
        select(Message)
        .where(Message.conversation_id == convo.id)
        .order_by(desc(Message.created_at))
        .limit(20)
    )
    history_messages = (await db.execute(hist_stmt)).scalars().all()
    history_messages.reverse()

    is_first_turn = len(history_messages) == 0
    history_text = "\n".join([f"{m.sender.capitalize()}: {m.content}" for m in history_messages])

    greeting_instruction = (
        "This is the very first message in this conversation. Welcome the user warmly and invite them to share what's on their mind."
        if is_first_turn
        else "This is an ongoing conversation. Do NOT include any introductory greetings, hellos, or welcome back lines (such as 'Hey Talha!'). Continue the conversation naturally, warmly, and helpfully without repeating greetings."
    )

    prompt = f"""You are StudyVault AI's Companion, a warm, supportive, and friendly general-purpose mentor.
User Name: {current_user.name}

Stored Memories about the User:
{memory_context}

Chat History:
{history_text}
User: {user_msg_text}

Instructions:
- {greeting_instruction}
- **CRITICAL**: When the user asks you to "explain" specific items from a previous list, **do not** just repeat or parrot the bullet points back. Provide a detailed, practical breakdown of how the feature works, its architecture, and how it can be implemented.
- If the user explicitly asks you to remember something about them (e.g., "remember that I like Python"), include that fact in the 'remember' field. Otherwise, set 'remember' to null.

Output in JSON format with keys:
- "reply": string (your conversational response. You MUST use Markdown formatting here for readability. Use **bolding** for emphasis, bullet points for lists, and normal blank lines between paragraphs for spacing.)
- "remember": string or null (fact to store, if any)
"""

    gen_res = None
    last_error = None

    for model_name in ACTIVE_COMPANION_MODELS:
        try:
            gen_res = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.6,
                        response_mime_type="application/json",
                        response_schema={
                            "type": "OBJECT",
                            "properties": {
                                "reply": {"type": "STRING"},
                                "remember": {"type": "STRING", "nullable": True},
                            },
                            "required": ["reply"],
                        },
                    ),
                ),
                timeout=5.0,  # Reduced to 5s for ultra-fast failover
            )
            print(f"[Companion Success] Generated response using model: {model_name}")
            break
        except asyncio.TimeoutError:
            print(f"[Companion Fallback] Model '{model_name}' timed out after 5s, trying next...")
            continue
        except Exception as e:
            last_error = e
            print(f"[Companion Fallback] Model '{model_name}' failed: {e}")
            continue

    reply_text = "Sorry, I couldn't come up with a response just now."
    remembered_fact = None

    # Fallback to Groq Cloud (Llama 3.1) if all Gemini models fail
    if not gen_res or not gen_res.text:
        print("[Companion Fallback] Gemini exhausted. Switching to Groq Cloud...")
        try:
            if not settings.GROQ_API_KEY:
                raise Exception("GROQ_API_KEY not configured")
                
            async with httpx.AsyncClient(timeout=30.0) as cloud_client:
                response = await cloud_client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "openai/gpt-oss-20b",
                        "messages": [{"role": "user", "content": prompt + "\n\nRespond using strictly valid JSON with keys 'reply' and 'remember'."}],
                        "temperature": 0.6,
                        "response_format": {"type": "json_object"}
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    groq_raw = data["choices"][0]["message"]["content"].strip()
                    try:
                        parsed = json.loads(groq_raw)
                        reply_text = parsed.get("reply", "I'm here for you!")
                        remember_value = parsed.get("remember")
                        
                        if remember_value and str(remember_value).lower() != "null":
                            remembered_fact = str(remember_value).strip()
                            
                    except Exception as parse_err:
                        print(f"[Companion JSON Parse Error] {parse_err}")
                        reply_text = groq_raw
                        
                    print("[Companion Success] Generated response using Groq Cloud!")
                else:
                    raise Exception(f"Groq API error {response.status_code}: {response.text}")
                
        except Exception as cloud_ex:
            print(f"[Companion Groq Failed] {cloud_ex}")
            reply_text = "I'm having a little trouble connecting to my thought process right now, but I'm still here!"
    else:
        try:
            raw_text = gen_res.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]

            parsed = json.loads(raw_text.strip())
            reply_text = parsed.get("reply", reply_text)
            remember_value = parsed.get("remember")
            if remember_value and str(remember_value).lower() != "null":
                remembered_fact = str(remember_value).strip()
        except Exception as parse_err:
            print(f"[Companion JSON Parse Error] {parse_err}")
            reply_text = gen_res.text

    # Sanitize any literal escape sequences returned by the model
    reply_text = reply_text.replace("\\n", "\n")
            
    if remembered_fact:
        db.add(CompanionMemory(user_id=current_user.id, content=remembered_fact))

    if convo.title == "New Chat":
        convo.title = user_msg_text[:30] + ("..." if len(user_msg_text) > 30 else "")

    db.add(Message(conversation_id=convo.id, sender="user", content=user_msg_text))
    db.add(Message(conversation_id=convo.id, sender="ai", content=reply_text))
    await db.commit()

    return {
        "reply": reply_text,
        "text": reply_text,  
        "content": reply_text, 
        "remembered": remembered_fact,
    }