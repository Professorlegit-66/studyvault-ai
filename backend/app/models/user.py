from datetime import datetime, date, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import String, DateTime, Date, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.conversation import Conversation
    from app.models.student_memory import Flashcard
    from app.models.companion_memory import CompanionMemory

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

    # --- Streak tracking (Overview dashboard "Active Study Streak" card) ---
    last_login_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    current_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # --- Email verification (OTP sent on registration) ---
    # Login is blocked until is_verified is True. The code+expiry pair is
    # overwritten each time a new code is generated (register or resend),
    # so only one code is ever valid at a time - no separate history table
    # needed for a feature this small.
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    verification_code: Mapped[Optional[str]] = mapped_column(String(6), nullable=True)
    verification_code_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # --- Email change verification ---
    # Set when a user requests a new email via PUT /me. user.email is only
    # ever updated once the OTP sent to this address is confirmed via
    # POST /auth/confirm-email-change. Reuses verification_code /
    # verification_code_expires_at (same one-code-at-a-time pattern as
    # registration) - the code is targeted at pending_email, not user.email,
    # while a change is in flight.
    pending_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    documents: Mapped[List["Document"]] = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    flashcards: Mapped[List["Flashcard"]] = relationship("Flashcard", back_populates="user", cascade="all, delete-orphan")
    companion_memories: Mapped[List["CompanionMemory"]] = relationship("CompanionMemory", back_populates="user", cascade="all, delete-orphan")