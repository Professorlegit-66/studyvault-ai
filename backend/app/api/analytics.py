from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
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

        # 2. Query ReviewLog table cleanly
        try:
            logs_stmt = select(ReviewLog).where(ReviewLog.user_id == current_user.id)
            logs = (await db.execute(logs_stmt)).scalars().all()
            total_review_logs = len(logs)

            for log in logs:
                dt = log.reviewed_at
                if dt:
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    # Extract ISO date string YYYY-MM-DD
                    date_str = dt.strftime("%Y-%m-%d")
                    date_counts[date_str] = date_counts.get(date_str, 0) + 1
        except Exception as log_err:
            print(f"[Analytics] ReviewLog query error: {log_err}")
            await db.rollback()

        # 3. Fallback count from Flashcard last_reviewed_at if logs table was empty
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

        # 4. Dynamic Real Retention Score Calculation
        if cards:
            total_cards = len(cards)
            
            # SM-2 Ease Factor Component (Standard baseline ease is 2.5)
            total_ease = sum(getattr(c, "ease_factor", 2.5) or 2.5 for c in cards)
            avg_ease = total_ease / total_cards
            ease_score = min(100.0, (avg_ease / 2.5) * 100)

            # Active Recall Mastery Ratio
            mastered_cards = sum(
                1 for c in cards 
                if (getattr(c, "interval_days", 1) or 1) >= 3 or (getattr(c, "repetition_number", 0) or 0) >= 2
            )
            mastery_ratio = (mastered_cards / total_cards) * 100

            # Real Retention Formula: 60% Ease Factor + 40% Recall Mastery Ratio
            calculated_retention = round((0.6 * ease_score) + (0.4 * mastery_ratio))
            retention_score = min(100, max(15, calculated_retention))
        else:
            retention_score = 0

        streak = (
            current_user.current_streak
            if (current_user.current_streak and current_user.current_streak > 0)
            else 1
        )

        return {
            "retention_score": retention_score,
            "current_streak": streak,
            "total_reviews": total_actions,
            "heatmap": heatmap,
        }
    except Exception as e:
        print(f"Analytics summary error: {e}")
        return {
            "retention_score": 0,
            "current_streak": 1,
            "total_reviews": 0,
            "heatmap": [],
        }