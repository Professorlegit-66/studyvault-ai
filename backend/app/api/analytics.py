from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.models.student_memory import Flashcard
from app.models.document import Document
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/summary")
async def get_analytics_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Total documents uploaded
    doc_count = (await db.execute(
        select(func.count(Document.id)).where(Document.user_id == current_user.id)
    )).scalar() or 0

    # Total flashcards created
    total_cards = (await db.execute(
        select(func.count(Flashcard.id)).where(Flashcard.user_id == current_user.id)
    )).scalar() or 0

    # Cards due today or overdue
    now = datetime.now(timezone.utc)
    due_cards = (await db.execute(
        select(func.count(Flashcard.id)).where(
            and_(Flashcard.user_id == current_user.id, Flashcard.next_review_at <= now)
        )
    )).scalar() or 0

    # Average ease factor
    avg_ease = (await db.execute(
        select(func.avg(Flashcard.ease_factor)).where(Flashcard.user_id == current_user.id)
    )).scalar() or 2.5

    return {
        "documents_count": doc_count,
        "total_flashcards": total_cards,
        "due_flashcards": due_cards,
        "average_ease_factor": round(float(avg_ease), 2),
        "retention_score": min(100, int((total_cards - due_cards) / max(1, total_cards) * 100))
    }