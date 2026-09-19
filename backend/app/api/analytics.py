from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from app.database import get_db
from app.models.student_memory import Flashcard
from app.models.user import User
from app.api.deps import get_current_user

# Safely handle ReviewLog import
try:
    from app.models.review_log import ReviewLog
    HAS_REVIEW_LOG = True
except ImportError:
    HAS_REVIEW_LOG = False

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/summary")
async def get_analytics_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        # 1. Fetch user flashcards
        cards_stmt = select(Flashcard).where(Flashcard.user_id == current_user.id)
        cards = (await db.execute(cards_stmt)).scalars().all()

        date_counts = {}
        logs = []

        # 2. Attempt to query ReviewLog table if model exists
        if HAS_REVIEW_LOG:
            try:
                logs_stmt = select(ReviewLog).where(ReviewLog.user_id == current_user.id)
                logs = (await db.execute(logs_stmt)).scalars().all()
                
                for log in logs:
                    dt = log.reviewed_at
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    date_str = dt.astimezone().strftime("%Y-%m-%d")
                    date_counts[date_str] = date_counts.get(date_str, 0) + 1
            except Exception as log_err:
                # Table does not exist in DB yet; rollback transaction to keep connection clean
                await db.rollback()

        # 3. Merge/Fallback to legacy Flashcard timestamps
        for card in cards:
            if card.last_reviewed_at:
                dt = card.last_reviewed_at
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                date_str = dt.astimezone().strftime("%Y-%m-%d")
                if date_str not in date_counts:
                    date_counts[date_str] = 1

        heatmap = [{"date": d, "count": c} for d, c in date_counts.items()]
        total_reviews = max(len(logs), sum(date_counts.values()))

        # 4. Retention calculation
        if cards:
            total_ease = sum(c.ease_factor for c in cards)
            avg_ease = total_ease / len(cards)
            ease_score = min(100.0, (avg_ease / 2.5) * 100)
            
            reviewed_count = sum(1 for c in cards if c.last_reviewed_at is not None)
            reviewed_ratio = (reviewed_count / len(cards)) * 100
            
            retention_score = round((0.7 * ease_score) + (0.3 * reviewed_ratio)) if reviewed_count > 0 else 0
        else:
            retention_score = 0

        streak = current_user.current_streak if (current_user.current_streak and current_user.current_streak > 0) else 1

        return {
            "retention_score": min(100, max(0, retention_score)),
            "current_streak": streak,
            "total_reviews": total_reviews,
            "heatmap": heatmap
        }
    except Exception as e:
        print(f"Analytics summary error: {e}")
        return {
            "retention_score": 0,
            "current_streak": 1,
            "total_reviews": 0,
            "heatmap": []
        }