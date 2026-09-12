from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.document import Document

class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # document_id is intentionally nullable and uses ON DELETE SET NULL, not
    # CASCADE: deleting a document should NOT wipe out flashcards generated
    # from it. Those cards carry real SM-2 review progress (repetition_number,
    # ease_factor, next_review_at) earned by the user studying them - that's
    # worth more than the source document, which may just be getting tidied
    # up or removed as a duplicate. A card with document_id = NULL is a
    # normal, supported "detached" state (same as snippet-generated cards,
    # which never had a document_id in the first place).
    document_id: Mapped[int | None] = mapped_column(ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    
    topic: Mapped[str] = mapped_column(String(150), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    
    repetition_number: Mapped[int] = mapped_column(default=0)
    interval_days: Mapped[int] = mapped_column(default=1)
    ease_factor: Mapped[float] = mapped_column(default=2.5)
    next_review_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship("User", back_populates="flashcards")
    document: Mapped["Document | None"] = relationship("Document", backref="flashcards")