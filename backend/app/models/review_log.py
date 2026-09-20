from datetime import datetime, timezone
from sqlalchemy import ForeignKey, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from typing import Optional

class ReviewLog(Base):
    __tablename__ = "review_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    flashcard_id: Mapped[Optional[int]] = mapped_column(ForeignKey("flashcards.id", ondelete="SET NULL"), nullable=True)

    # Matches the real Postgres column: an integer 0-5 SM-2 quality score,
    # not a string label. The old `rating: str` mapping named a column that
    # never existed in the DB, so every insert AND every analytics query
    # against this table failed silently via the nested-savepoint catch.
    quality: Mapped[int] = mapped_column(Integer, nullable=False)

    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)