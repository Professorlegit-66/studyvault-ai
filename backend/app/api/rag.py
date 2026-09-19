import math
import traceback
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from google import genai
from google.genai import types, errors

from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.chunk import DocumentChunk
from app.config import settings

router = APIRouter(prefix="/rag", tags=["rag"])

client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Similarity threshold to filter out noise
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

@router.post("/chat", response_model=ChatResponse)
async def chat_with_docs(
    request: ChatQuery,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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
                sources=[]
            )

        # 1. Embed user query
        emb_res = client.models.embed_content(
            model="gemini-embedding-001",
            contents=request.query
        )
        query_vector = list(emb_res.embeddings[0].values)

        # 2. Score similarity across chunks
        scored_chunks = []
        for chunk, doc in results:
            if chunk.embedding:
                chunk_vector = list(chunk.embedding)
                sim = cosine_similarity(query_vector, chunk_vector)
                if sim >= MIN_SIMILARITY_THRESHOLD:
                    scored_chunks.append((sim, chunk.content, doc.title, chunk.chunk_index))

        if not scored_chunks:
            return ChatResponse(
                answer="I couldn't find relevant details in your uploaded document(s) to answer this query.",
                sources=[]
            )

        # Sort descending by relevance score
        scored_chunks.sort(key=lambda x: x[0], reverse=True)

        # Dynamic chunk scaling: 2-4 chunks per selected doc, capped between 4 and 10
        selected_count = len(request.document_ids) if request.document_ids else 1
        target_chunk_limit = min(max(selected_count * 2, 4), 10)

        # Fair representation across selected documents
        top_chunks = []
        seen_docs = set()
        
        for item in scored_chunks:
            sim, content, title, chunk_idx = item
            if title not in seen_docs and len(top_chunks) < target_chunk_limit:
                top_chunks.append(item)
                seen_docs.add(title)

        for item in scored_chunks:
            if len(top_chunks) >= target_chunk_limit:
                break
            if item not in top_chunks:
                top_chunks.append(item)

        sources = list(set([item[2] for item in top_chunks]))

        # Format context with document title and chunk index metadata
        context_blocks = [
            f"[Source: {item[2]} | Chunk #{item[3]}]\n{item[1]}"
            for item in top_chunks
        ]
        context = "\n\n---\n\n".join(context_blocks)

        is_multi_mode = request.document_ids is not None and len(request.document_ids) > 1
        multi_prompt_instruction = (
            "4. Compare and contrast the provided sources. Explicitly note where the documents agree, complement each other, or present contradictions."
            if is_multi_mode
            else ""
        )

        prompt = f"""You are StudyVault AI, a precise academic tutor assistant.

Guidelines:
1. Start directly with the answer. Do NOT use greetings (e.g., "Hello") or state "Based on the provided context."
2. Answer strictly using the provided Context from Vault below. If the information is not present, state clearly that it is missing from the document.
3. Cite sources naturally using the document titles provided in the context blocks.
{multi_prompt_instruction}

Context from Vault:
{context}

User Question: {request.query}
"""

        gen_res = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
            )
        )

        return ChatResponse(answer=gen_res.text, sources=sources)

    except errors.APIError as e:
        if e.code == 503:
            raise HTTPException(
                status_code=503, 
                detail="The AI provider is currently experiencing high demand. Please try again shortly."
            )
        elif e.code == 429:
            print(f"[RAG Chat] Gemini rate limit hit: {e.message}")
            return ChatResponse(
                answer="I've hit my usage limit for the moment. Please try again in a little while.",
                sources=[]
            )
        else:
            raise HTTPException(
                status_code=502, 
                detail=f"AI Provider Error: {e.message}"
            )

    except Exception as e:
        print("\n=== RAG CHAT ERROR TRACEBACK ===")
        traceback.print_exc()
        print("================================\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected internal server error occurred."
        )