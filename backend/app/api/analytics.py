from datetime import datetime, timezone, timedelta, date
from typing import Optional

from fastapi import APIRouter, Depends, Header
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
    x_client_utc_offset: Optional[int] = Header(default=None, alias="X-Client-UTC-Offset"),
):
    try:
        # 1. BULLETPROOF STREAK EVALUATION
        today = datetime.now(timezone.utc).date()
        last_login = current_user.last_login_date
        if isinstance(last_login, datetime):
            last_login = last_login.date()

        streak_updated = False

        if last_login != today:
            if last_login == today - timedelta(days=1):
                current_user.current_streak = (current_user.current_streak or 0) + 1
            else:
                current_user.current_streak = 1
            current_user.last_login_date = today
            streak_updated = True
        elif not current_user.current_streak or current_user.current_streak <= 0:
            current_user.current_streak = 1
            streak_updated = True

        if streak_updated:
            db.add(current_user)
            await db.commit()
            await db.refresh(current_user)

        # 2. FETCH REVIEW LOGS & APPLY LOCAL TIMEZONE TO HEATMAP
        client_offset = x_client_utc_offset if x_client_utc_offset is not None else 0
        date_counts = {}
        
        logs_stmt = select(ReviewLog).where(ReviewLog.user_id == current_user.id)
        logs = (await db.execute(logs_stmt)).scalars().all()
        
        # Keep track of which cards have real logs
        cards_with_logs = {log.flashcard_id for log in logs if log.flashcard_id}

        for log in logs:
            dt = log.reviewed_at
            if dt:
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                # Shift UTC timestamp to Pakistan Standard Time (or local client time)
                local_dt = dt - timedelta(minutes=client_offset)
                date_str = local_dt.strftime("%Y-%m-%d")
                date_counts[date_str] = date_counts.get(date_str, 0) + 1

        # 3. RESTORE LEGACY REVIEWS
        cards_stmt = select(Flashcard).where(Flashcard.user_id == current_user.id)
        cards = (await db.execute(cards_stmt)).scalars().all()

        for card in cards:
            # If a card has legacy history from before the schema fix, count it!
            if card.id not in cards_with_logs and card.last_reviewed_at:
                dt = card.last_reviewed_at
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                local_dt = dt - timedelta(minutes=client_offset)
                date_str = local_dt.strftime("%Y-%m-%d")
                date_counts[date_str] = date_counts.get(date_str, 0) + 1

        heatmap = [{"date": d, "count": c} for d, c in date_counts.items()]
        total_actions = sum(date_counts.values())

        # 4. RETENTION SCORE MATH
        if cards:
            total_cards = len(cards)
            total_ease = sum(getattr(c, "ease_factor", 2.5) or 2.5 for c in cards)
            avg_ease = total_ease / total_cards
            ease_score = min(100.0, (avg_ease / 2.5) * 100)

            mastered_cards = sum(
                1 for c in cards 
                if ((getattr(c, "interval_days", 0) or 0) >= 3) or ((getattr(c, "repetition_number", 0) or 0) >= 2)
            )
            mastery_ratio = (mastered_cards / total_cards) * 100

            calculated_retention = round((0.6 * ease_score) + (0.4 * mastery_ratio))
            retention_score = min(100, max(0, calculated_retention))
        else:
            retention_score = 0

        return {
            "retention_score": retention_score,
            "current_streak": current_user.current_streak,
            "total_reviews": total_actions,
            "heatmap": heatmap,
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "retention_score": 0,
            "current_streak": 1,
            "total_reviews": 0,
            "heatmap": [],
        }