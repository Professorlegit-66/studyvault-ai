from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User

class CompanionMemory(Base):
    """
    A fact the AI Companion has been told to remember about a user.
    Deliberately separate from the 'Student Memory' flashcard feature
    (models/student_memory.py, the Flashcard model) - different concept,
    different table, kept apart to avoid confusion between the two.

    Memories are per-user, not per-conversation: something remembered in
    one chat thread is available in every other thread for that user,
    which is the whole point of "remembering".
    """
    __tablename__ = "companion_memories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship("User", back_populates="companion_memories")