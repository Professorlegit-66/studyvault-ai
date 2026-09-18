import math
import traceback
from typing import Optional
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

class ChatQuery(BaseModel):
    query: str
    document_id: Optional[int] = None

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

        if request.document_id:
            stmt = stmt.where(Document.id == request.document_id)

        results = (await db.execute(stmt)).all()

        if not results:
            return ChatResponse(
                answer="No document chunks found in your vault. Please upload a document first.",
                sources=[]
            )

        # 1. Embed query vector
        emb_res = client.models.embed_content(
            model="gemini-embedding-001",
            contents=request.query
        )
        query_vector = list(emb_res.embeddings[0].values)

        # 2. Score similarity
        scored_chunks = []
        for chunk, doc in results:
            if chunk.embedding:
                chunk_vector = list(chunk.embedding)
                sim = cosine_similarity(query_vector, chunk_vector)
                scored_chunks.append((sim, chunk.content, doc.title))

        if not scored_chunks:
            return ChatResponse(
                answer="No processable document embeddings found.",
                sources=[]
            )

        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top_chunks = scored_chunks[:4]

        # Filter out sources if low similarity score
        sources = list(set([item[2] for item in top_chunks if item[0] > 0.1]))

        context = "\n\n---\n\n".join([item[1] for item in top_chunks])

        prompt = f"""You are StudyVault AI, a helpful and direct AI tutor.

Guidelines:
1. For academic or subject-specific questions, DO NOT use greetings (e.g., "Hello") or state that you have accessed the vault. Start your response directly with the answer, or use a natural lead-in like "Based on the provided context..."
2. Only confirm access to the vault if the user explicitly asks a meta-question like "Can you see my files?" or "Are you connected?"
3. Answer strictly and accurately using the provided context below. Cite relevant details from the context.

Context from Vault:
{context}

User Question: {request.query}
"""

        # Generate response disabling function calling to eliminate log warnings
        gen_res = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
            )
        )

        return ChatResponse(answer=gen_res.text, sources=sources)

    except errors.APIError as e:
        # Handle specific Google GenAI API errors
        if e.code == 503:
            raise HTTPException(
                status_code=503, 
                detail="The AI provider is currently experiencing high demand. Please try again in a few moments."
            )
        elif e.code == 429:
            # Same pattern as companion.py: return a normal 200 with an honest 
            # in-character message for free-tier quotas, rather than crashing the UI.
            print(f"[RAG Chat] Gemini rate limit hit: {e.message}")
            return ChatResponse(
                answer="I've hit my usage limit for the moment and can't respond right now. Please try again in a little while.",
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