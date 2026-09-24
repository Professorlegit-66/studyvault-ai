from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.chunk import DocumentChunk
from app.models.document import Document
from app.models.review_log import ReviewLog
from app.models.student_memory import Flashcard
from app.models.user import User
from app.services.flashcard_gen import generate_flashcards_from_text
from app.services.sm2 import calculate_sm2

router = APIRouter(prefix="/memory", tags=["Student Memory"])


class ReviewRequest(BaseModel):
    quality: int  # 0 to 5 SM-2 rating quality score


class SnippetFlashcardRequest(BaseModel):
    snippet: str
    title: str
    document_id: Optional[int] = None


class FlashcardResponse(BaseModel):
    id: int
    topic: str
    question: str
    answer: str
    document_id: Optional[int] = None
    repetition_number: int
    interval_days: int
    ease_factor: float
    next_review_at: datetime

    class Config:
        from_attributes = True


@router.get("/due", response_model=List[FlashcardResponse])
async def get_due_flashcards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    stmt = select(Flashcard).where(
        Flashcard.user_id == current_user.id,
        Flashcard.next_review_at <= now,
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/generate/{document_id}")
async def generate_cards_for_doc(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doc = (
        await db.execute(
            select(Document).where(
                Document.id == document_id, Document.user_id == current_user.id
            )
        )
    ).scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        chunk_rows = (
            await db.execute(
                select(DocumentChunk.content)
                .where(DocumentChunk.document_id == doc.id)
                .order_by(DocumentChunk.chunk_index)
            )
        ).scalars().all()

        raw_text = (
            "\n".join(chunk_rows)
            if chunk_rows
            else f"Study notes and key concepts regarding {doc.title}."
        )

        cards_data = await generate_flashcards_from_text(raw_text, topic=doc.title)

        created_cards = []
        for item in cards_data:
            card = Flashcard(
                user_id=current_user.id,
                document_id=doc.id,
                topic=doc.title,
                question=item.get("question", "Review concept"),
                answer=item.get("answer", "Refer to document notes."),
            )
            db.add(card)
            created_cards.append(card)

        await db.commit()
        return {
            "message": f"Successfully generated {len(created_cards)} flashcards!",
            "count": len(created_cards),
        }
    except Exception as e:
        print(f"Flashcard generation router error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-from-snippet")
async def generate_flashcard_from_snippet(
    payload: SnippetFlashcardRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not payload.snippet.strip():
        raise HTTPException(status_code=400, detail="Snippet text cannot be empty")

    try:
        cards_data = await generate_flashcards_from_text(payload.snippet, topic=payload.title)

        created_cards = []
        for item in cards_data:
            card = Flashcard(
                user_id=current_user.id,
                document_id=payload.document_id,
                topic=payload.title,
                question=item.get("question", "Review concept"),
                answer=item.get("answer", "Refer to document notes."),
            )
            db.add(card)
            created_cards.append(card)

        await db.commit()
        return {
            "message": f"Successfully generated {len(created_cards)} flashcard(s) from snippet!",
            "count": len(created_cards),
        }
    except Exception as e:
        print(f"Snippet flashcard generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/cards/{card_id}")
async def delete_flashcard(
    card_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Flashcard).where(
        Flashcard.id == card_id,
        Flashcard.user_id == current_user.id,
    )
    card = (await db.execute(stmt)).scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    # Unbind associated review logs so heatmap activity is permanently preserved
    await db.execute(
        update(ReviewLog)
        .where(ReviewLog.flashcard_id == card_id)
        .values(flashcard_id=None)
    )

    await db.delete(card)
    await db.commit()
    return {"message": "Flashcard deleted successfully, activity log preserved"}


@router.post("/review/{card_id}", response_model=FlashcardResponse)
async def review_flashcard(
    card_id: int,
    payload: ReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Flashcard).where(
        Flashcard.id == card_id,
        Flashcard.user_id == current_user.id,
    )
    card = (await db.execute(stmt)).scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    rep, interval, ef, next_review = calculate_sm2(
        quality=payload.quality,
        repetition=card.repetition_number,
        interval=card.interval_days,
        ease_factor=card.ease_factor,
    )

    now = datetime.now(timezone.utc)

    # 1. Update Flashcard SM-2 stats
    card.repetition_number = rep
    card.interval_days = interval
    card.ease_factor = ef
    card.next_review_at = next_review
    card.last_reviewed_at = now

    # 2. Actively update User Study Streak based on UTC study actions
    today = now.date()
    if current_user.last_login_date != today:
        if current_user.last_login_date == today - timedelta(days=1):
            current_user.current_streak = (current_user.current_streak or 0) + 1
        else:
            current_user.current_streak = 1
        current_user.last_login_date = today

    # 3. Log review activity inside an isolated nested transaction
    try:
        async with db.begin_nested():
            review_entry = ReviewLog(
                user_id=current_user.id,
                flashcard_id=card.id,
                quality=payload.quality,
                reviewed_at=now,
            )
            db.add(review_entry)
    except Exception as log_err:
        print(f"[Student Memory] ReviewLog insert warning: {log_err}")

    try:
        await db.commit()
        await db.refresh(card)
        return card
    except Exception as commit_err:
        await db.rollback()
        print(f"[Student Memory] Review commit error: {commit_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record review progress.",
        )


@router.delete("/orphaned")
async def delete_orphaned_flashcards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Flashcard).where(
        Flashcard.user_id == current_user.id,
        Flashcard.document_id == None,
    )
    cards = (await db.execute(stmt)).scalars().all()
    count = len(cards)
    for card in cards:
        # Also preserve heatmap logs for bulk-deleted orphaned cards
        await db.execute(
            update(ReviewLog)
            .where(ReviewLog.flashcard_id == card.id)
            .values(flashcard_id=None)
        )
        await db.delete(card)
        
    await db.commit()
    return {"message": f"Successfully deleted {count} orphaned flashcard(s)", "count": count}