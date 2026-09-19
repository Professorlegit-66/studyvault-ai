from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.review_log import ReviewLog
from app.models.student_memory import Flashcard
from app.models.user import User

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
        total_review_logs = 0

        # 2. Query ReviewLog table for accurate review activity count
        try:
            logs_stmt = select(ReviewLog).where(ReviewLog.user_id == current_user.id)
            logs = (await db.execute(logs_stmt)).scalars().all()
            total_review_logs = len(logs)

            for log in logs:
                dt = log.reviewed_at
                if dt is not None:
                    # Normalize UTC timezone
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    
                    # Format as ISO YYYY-MM-DD
                    date_str = dt.strftime("%Y-%m-%d")
                    date_counts[date_str] = date_counts.get(date_str, 0) + 1
        except Exception as log_err:
            print(f"[Analytics] ReviewLog query error: {log_err}")
            await db.rollback()

        # 3. Fallback to Flashcard last_reviewed_at if ReviewLog table is empty
        if total_review_logs == 0:
            for card in cards:
                if card.last_reviewed_at:
                    dt = card.last_reviewed_at
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    date_str = dt.strftime("%Y-%m-%d")
                    date_counts[date_str] = date_counts.get(date_str, 0) + 1

        heatmap = [{"date": d, "count": c} for d, c in date_counts.items()]
        total_actions = max(total_review_logs, sum(date_counts.values()))

        # 4. Retention score calculation
        if cards:
            # Ease factor calculation (default base ease factor in SM-2 is 2.5)
            total_ease = sum(getattr(c, "ease_factor", 2.5) or 2.5 for c in cards)
            avg_ease = total_ease / len(cards)
            ease_score = min(100.0, (avg_ease / 2.5) * 100)

            # Count cards that have ever been reviewed or repeated
            reviewed_count = sum(
                1 for c in cards 
                if (c.last_reviewed_at is not None or (getattr(c, "repetition_number", 0) or 0) > 0)
            )
            reviewed_ratio = (reviewed_count / len(cards)) * 100

            # Compute weighted retention score
            if reviewed_count > 0 or total_actions > 0:
                retention_score = round((0.7 * ease_score) + (0.3 * max(reviewed_ratio, 100.0 if total_actions > 0 else 0.0)))
            else:
                retention_score = 100 if len(cards) > 0 else 0
        else:
            retention_score = 100

        streak = (
            current_user.current_streak
            if (current_user.current_streak and current_user.current_streak > 0)
            else 1
        )

        return {
            "retention_score": min(100, max(0, retention_score)),
            "current_streak": streak,
            "total_reviews": total_actions,
            "heatmap": heatmap,
        }
    except Exception as e:
        print(f"Analytics summary error: {e}")
        return {
            "retention_score": 100,
            "current_streak": 1,
            "total_reviews": 0,
            "heatmap": [],
        }