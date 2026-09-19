import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from google import genai
from google.genai import types

from app.database import get_db
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.companion_memory import CompanionMemory
from app.api.deps import get_current_user
from app.config import settings

router = APIRouter(prefix="/companion", tags=["AI Companion"])

client = genai.Client(api_key=settings.GEMINI_API_KEY)

HISTORY_WINDOW = 20

class ConversationResponse(BaseModel):
    id: int
    title: str
    created_at: datetime

    class Config:
        from_attributes = True

class MessageResponse(BaseModel):
    id: int
    sender: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class MemoryResponse(BaseModel):
    id: int
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    remembered: Optional[str] = None

@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(desc(Conversation.created_at))
    )
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    convo = Conversation(user_id=current_user.id, title="New Chat")
    db.add(convo)
    await db.commit()
    await db.refresh(convo)
    return convo

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
    )
    convo = (await db.execute(stmt)).scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(convo)
    await db.commit()
    return {"message": "Conversation deleted successfully"}

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    convo_stmt = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
    )
    convo = (await db.execute(convo_stmt)).scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg_stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    result = await db.execute(msg_stmt)
    return result.scalars().all()

@router.get("/memories", response_model=List[MemoryResponse])
async def list_memories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(CompanionMemory)
        .where(CompanionMemory.user_id == current_user.id)
        .order_by(desc(CompanionMemory.created_at))
    )
    result = await db.execute(stmt)
    return result.scalars().all()

@router.delete("/memories/{memory_id}")
async def delete_memory(
    memory_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CompanionMemory).where(
        CompanionMemory.id == memory_id,
        CompanionMemory.user_id == current_user.id,
    )
    memory = (await db.execute(stmt)).scalar_one_or_none()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    await db.delete(memory)
    await db.commit()
    return {"message": "Memory deleted successfully"}

def _build_prompt(memories: List[CompanionMemory], history: List[Message], new_message: str) -> str:
    memory_block = (
        "\n".join(f"- {m.content}" for m in memories)
        if memories
        else "(no saved facts about this user yet)"
    )
    history_block = (
        "\n".join(f"{m.sender.upper()}: {m.content}" for m in history)
        if history
        else "(this is the start of the conversation)"
    )

    return f"""You are a friendly, general-purpose AI companion inside StudyVault AI.

Known facts about this user:
{memory_block}

Recent conversation history:
{history_block}

New message from user: {new_message}

If and only if the user explicitly requests to store a personal fact for future chats (e.g., "remember that...", "keep in mind..."), extract that fact into the "remember" key. Otherwise, set "remember" to null.
"""

@router.post("/conversations/{conversation_id}/chat", response_model=ChatResponse)
async def chat_with_companion(
    conversation_id: int,
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    convo_stmt = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
    )
    convo = (await db.execute(convo_stmt)).scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    memories_stmt = select(CompanionMemory).where(CompanionMemory.user_id == current_user.id)
    memories = (await db.execute(memories_stmt)).scalars().all()

    history_stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(desc(Message.created_at))
        .limit(HISTORY_WINDOW)
    )
    recent_history = list(reversed((await db.execute(history_stmt)).scalars().all()))

    prompt = _build_prompt(memories, recent_history, payload.message)

    reply_text = "Sorry, I couldn't come up with a response just now."
    remembered_fact: Optional[str] = None

    try:
        gen_res = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.6,
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {
                        "reply": {"type": "STRING"},
                        "remember": {"type": "STRING", "nullable": True}
                    },
                    "required": ["reply"]
                }
            ),
        )

        parsed = json.loads(gen_res.text.strip())
        reply_text = parsed.get("reply", reply_text)
        remember_value = parsed.get("remember")
        if remember_value and remember_value.lower() != "null":
            remembered_fact = remember_value.strip()

    except Exception as e:
        error_str = str(e)
        if "RESOURCE_EXHAUSTED" in error_str or "429" in error_str:
            print(f"[Companion Chat] Gemini rate limit hit: {e}")
            reply_text = "I've hit my usage limit for the moment. Please try again shortly."
        else:
            print(f"[Companion Chat] Generation/parsing failed: {e}")
            reply_text = "Sorry, something went wrong generating a response. Please try again."

    user_msg = Message(conversation_id=conversation_id, sender="user", content=payload.message)
    ai_msg = Message(conversation_id=conversation_id, sender="ai", content=reply_text)
    db.add(user_msg)
    db.add(ai_msg)

    # Save memory if extracted and not already present
    if remembered_fact:
        existing_memories = [m.content.lower() for m in memories]
        if remembered_fact.lower() not in existing_memories:
            new_memory = CompanionMemory(user_id=current_user.id, content=remembered_fact)
            db.add(new_memory)

    if convo.title == "New Chat":
        convo.title = payload.message.strip()[:40] + ("..." if len(payload.message.strip()) > 40 else "")

    await db.commit()

    return ChatResponse(reply=reply_text, remembered=remembered_fact)