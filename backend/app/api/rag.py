import math
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
from app.models.document import Document
from app.models.chunk import DocumentChunk
from app.models.conversation import Conversation
from app.models.message import Message
from app.config import settings

router = APIRouter(prefix="/rag", tags=["rag"])

client = genai.Client(api_key=settings.GEMINI_API_KEY)

MIN_SIMILARITY_THRESHOLD = 0.25


class ChatQuery(BaseModel):
    query: str
    document_id: Optional[int] = None
    document_ids: Optional[List[int]] = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[str]


def cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))
    norm_b = math.sqrt(sum(b * b for b in vec2))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)


async def _get_or_create_rag_conversation(
    db: AsyncSession, user_id: int, title_key: str
) -> Conversation:
    stmt = select(Conversation).where(
        Conversation.user_id == user_id, Conversation.title == title_key
    )
    convo = (await db.execute(stmt)).scalar_one_or_none()
    if not convo:
        convo = Conversation(user_id=user_id, title=title_key)
        db.add(convo)
        await db.commit()
        await db.refresh(convo)
    return convo


@router.get("/history", response_model=List[dict])
async def get_rag_chat_history(
    document_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    title_key = f"rag_doc_{document_id}" if document_id else "rag_global"
    stmt = select(Conversation).where(
        Conversation.user_id == current_user.id, Conversation.title == title_key
    )
    convo = (await db.execute(stmt)).scalar_one_or_none()
    if not convo:
        return []

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
            "text": m.content,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.delete("/history")
async def clear_rag_chat_history(
    document_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    title_key = f"rag_doc_{document_id}" if document_id else "rag_global"
    stmt = select(Conversation).where(
        Conversation.user_id == current_user.id, Conversation.title == title_key
    )
    convo = (await db.execute(stmt)).scalar_one_or_none()
    if convo:
        await db.delete(convo)
        await db.commit()
    return {"message": "Chat history cleared successfully"}


@router.post("/chat", response_model=ChatResponse)
async def chat_with_docs(
    request: ChatQuery,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    answer_text = "I could not generate a response."
    formatted_sources = []

    try:
        stmt = (
            select(DocumentChunk, Document)
            .join(Document, DocumentChunk.document_id == Document.id)
            .where(Document.user_id == current_user.id)
        )

        if request.document_ids:
            stmt = stmt.where(Document.id.in_(request.document_ids))
        elif request.document_id:
            stmt = stmt.where(Document.id == request.document_id)

        results = (await db.execute(stmt)).all()

        if not results:
            return ChatResponse(
                answer="No document chunks found in your vault. Please upload a document first.",
                sources=[],
            )

        emb_res = None
        last_emb_error = None

        for attempt in range(3):
            try:
                emb_res = await client.aio.models.embed_content(
                    model="gemini-embedding-001", contents=request.query
                )
                break
            except Exception as emb_ex:
                last_emb_error = emb_ex
                print(f"[RAG Embedding Retry {attempt+1}/3] Failed: {emb_ex}")
                await asyncio.sleep(2)

        if not emb_res:
            raise HTTPException(
                status_code=429,
                detail="Embedding rate limit or usage limit reached. Please wait a moment and try again.",
            )

        query_vector = list(emb_res.embeddings[0].values)

        scored_chunks = []
        for chunk, doc in results:
            if chunk.embedding:
                chunk_vector = list(chunk.embedding)
                sim = cosine_similarity(query_vector, chunk_vector)
                if sim >= MIN_SIMILARITY_THRESHOLD:
                    scored_chunks.append(
                        (sim, chunk.content, doc.title, chunk.chunk_index, chunk.page_number)
                    )

        if not scored_chunks:
            return ChatResponse(
                answer="I couldn't find relevant details in your uploaded document(s) to answer this query.",
                sources=[],
            )

        scored_chunks.sort(key=lambda x: x[0], reverse=True)

        selected_count = (
            len(request.document_ids) if request.document_ids else 1
        )
        target_chunk_limit = min(max(selected_count * 2, 4), 10)

        top_chunks = []
        seen_docs = set()

        for item in scored_chunks:
            sim, content, title, chunk_idx, page_num = item
            if title not in seen_docs and len(top_chunks) < target_chunk_limit:
                top_chunks.append(item)
                seen_docs.add(title)

        for item in scored_chunks:
            if len(top_chunks) >= target_chunk_limit:
                break
            if item not in top_chunks:
                top_chunks.append(item)

        formatted_sources = list(
            set(
                [
                    f"{item[2]} (p. {item[4]})" if item[4] else item[2]
                    for item in top_chunks
                ]
            )
        )

        context_blocks = [
            f"[Source: {item[2]}{f', p. {item[4]}' if item[4] else ''}]\n{item[1]}"
            for item in top_chunks
        ]
        context = "\n\n---\n\n".join(context_blocks)

        is_multi_mode = (
            request.document_ids is not None and len(request.document_ids) > 1
        )
        multi_prompt_instruction = (
            "4. Compare and contrast the provided sources. Explicitly note where the documents agree, complement each other, or present contradictions."
            if is_multi_mode
            else ""
        )

        prompt = f"""You are StudyVault AI, a precise academic tutor assistant.

Guidelines:
1. Start directly with the answer. Do NOT use greetings (e.g., "Hello") or state "Based on the provided context."
2. Answer strictly using the provided Context from Vault below. If the information is not present, state clearly that it is missing from the document.
3. Cite sources inline naturally using the exact document title and page number format, e.g. [Document Title, p. X] or [Document Title].
{multi_prompt_instruction}

Context from Vault:
{context}

User Question: {request.query}
"""

        models_to_try = [
            "gemini-3.6-flash",
            "gemini-3.7-flash",
            "gemini-flash-latest",
        ]

        gen_res = None
        last_error = None

        for model_name in models_to_try:
            try:
                gen_res = await asyncio.wait_for(
                    client.aio.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            temperature=0.2,
                        ),
                    ),
                    timeout=5.0  # Reduced to 5s for ultra-fast failover
                )
                print(f"[RAG Success] Generated response using model: {model_name}")
                break
            except asyncio.TimeoutError:
                print(f"[RAG Model Fallback] Model '{model_name}' timed out after 5s, trying next...")
                continue
            except Exception as ex:
                last_error = ex
                print(f"[RAG Model Fallback] Model '{model_name}' failed, trying next... Error: {ex}")

        # Fallback to Groq Cloud (Llama 3.1) if all Gemini models fail
        if not gen_res or not gen_res.text:
            print("[RAG Fallback] Gemini exhausted. Switching to Groq Cloud (Llama 3.1)...")
            if not settings.GROQ_API_KEY:
                raise HTTPException(status_code=503, detail="Gemini is unavailable and GROQ_API_KEY is not configured.")
                
            try:
                # 30-second timeout is plenty for Groq's LPUs
                async with httpx.AsyncClient(timeout=30.0) as cloud_client:
                    response = await cloud_client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                        "model": "openai/gpt-oss-20b", # Updated from llama-3.1-8b-instant
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.2
                    }
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        answer_text = data["choices"][0]["message"]["content"].strip()
                        print("[RAG Success] Generated response using Groq Cloud!")
                    elif response.status_code == 429:
                         raise Exception("Groq Cloud rate limit reached.")
                    else:
                        raise Exception(f"Groq API error {response.status_code}: {response.text}")
                        
            except Exception as cloud_ex:
                print(f"[RAG Groq Failed] {cloud_ex}")
                if last_error:
                    raise last_error
                raise HTTPException(status_code=503, detail="All AI providers (Gemini and Groq) are currently unavailable.")
        else:
            answer_text = gen_res.text.strip()

        title_key = (
            f"rag_doc_{request.document_id}"
            if request.document_id
            else "rag_global"
        )
        convo = await _get_or_create_rag_conversation(
            db, current_user.id, title_key
        )
        db.add(
            Message(
                conversation_id=convo.id, sender="user", content=request.query
            )
        )
        db.add(
            Message(conversation_id=convo.id, sender="ai", content=answer_text)
        )
        await db.commit()

        return ChatResponse(answer=answer_text, sources=formatted_sources)

    except errors.APIError as e:
        print(f"\n>>> GEMINI API ERROR: code={getattr(e, 'code', 'N/A')} message={getattr(e, 'message', str(e))} <<<\n")
        if e.code == 503:
            raise HTTPException(
                status_code=503,
                detail="The AI provider is currently experiencing high demand. Please try again shortly.",
            )
        elif e.code == 429:
            print(f"[RAG Chat] Gemini rate limit hit: {e.message}")
            return ChatResponse(
                answer="I've hit my usage limit for the moment. Please try again in a little while.",
                sources=[],
            )
        else:
            raise HTTPException(
                status_code=502, detail=f"AI Provider Error: {e.message}"
            )

    except Exception as e:
        print("\n=== RAG CHAT ERROR TRACEBACK ===")
        traceback.print_exc()
        print(f"Raw Exception: {str(e)}")
        print("================================\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected internal server error occurred: {str(e)}",
        )