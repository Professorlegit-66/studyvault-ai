from datetime import datetime, date, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import String, DateTime, Date, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.conversation import Conversation
    from app.models.student_memory import Flashcard

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc)
    )

    # --- Streak tracking (added for Overview dashboard "Active Study Streak" card) ---
    # last_login_date: the calendar date (UTC) of the user's most recent login.
    # Nullable because existing users won't have a value until they next log in.
    last_login_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    # current_streak: number of consecutive days logged in, ending at last_login_date.
    # Defaults to 0 for new/never-logged-in users.
    current_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    documents: Mapped[List["Document"]] = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    flashcards: Mapped[List["Flashcard"]] = relationship("Flashcard", back_populates="user", cascade="all, delete-orphan")