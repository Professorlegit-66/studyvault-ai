from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.core.security import verify_password, get_password_hash, create_access_token
from app.api.deps import get_current_user
from app.services.email_service import generate_otp, send_verification_email, OTP_EXPIRY_MINUTES

router = APIRouter(prefix="/auth", tags=["auth"])

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    full_name: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    hide_security_warning: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    pending_email: Optional[str] = None
    # Lets the frontend permanently suppress the post-login sensitive-data
    # warning banner once the user has checked "Don't show this again".
    hide_security_warning: bool = False

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class RegisterResponse(BaseModel):
    message: str
    email: str

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class ConfirmEmailChangeRequest(BaseModel):
    code: str


def _issue_and_send_otp(user: User, target_email: Optional[str] = None) -> None:
    """Generates a fresh OTP, stores it with an expiry, and emails it.

    Sends to target_email when given (used for email-change verification,
    where the code must go to the *new*, unconfirmed address rather than
    user.email), otherwise sends to user.email (registration/resend)."""
    code = generate_otp()
    user.verification_code = code
    user.verification_code_expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    send_verification_email(to_email=target_email or user.email, otp_code=code, user_name=user.name)


@router.post("/register", response_model=RegisterResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == user_data.email)
    existing_user = (await db.execute(stmt)).scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please sign in."
        )

    display_name = user_data.name or user_data.full_name or "Student"

    hashed_pwd = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_pwd,
        name=display_name,
        is_verified=False,
    )
    db.add(new_user)
    await db.flush()  # assigns new_user.id without committing yet

    try:
        _issue_and_send_otp(new_user)
    except Exception as e:
        await db.rollback()
        print(f"[Register] Failed to send verification email: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Account could not be created because the verification email failed to send. Please try again shortly.",
        )

    await db.commit()

    return RegisterResponse(
        message="Account created. Check your email for a verification code.",
        email=new_user.email,
    )


@router.post("/verify-email", response_model=Token)
async def verify_email(payload: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == payload.email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account found for this email.")

    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This account is already verified.")

    if not user.verification_code or not user.verification_code_expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No verification code is pending. Please request a new one.")

    if datetime.now(timezone.utc) > user.verification_code_expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This code has expired. Please request a new one.")

    if payload.code.strip() != user.verification_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect verification code.")

    user.is_verified = True
    user.verification_code = None
    user.verification_code_expires_at = None
    _update_login_streak(user)
    await db.commit()

    # Verification succeeds straight into a logged-in session, so the user
    # doesn't have to separately log in right after verifying.
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/resend-verification")
async def resend_verification(payload: ResendVerificationRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == payload.email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account found for this email.")

    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This account is already verified.")

    try:
        _issue_and_send_otp(user)
    except Exception as e:
        print(f"[Resend Verification] Failed to send email: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send the verification email. Please try again shortly.",
        )

    await db.commit()
    return {"message": "A new verification code has been sent."}


def _update_login_streak(user: User) -> None:
    """
    Updates user.current_streak and user.last_login_date in place, based on
    today's date (UTC) vs. the last recorded login date.

    - No previous login (or streak was already broken/reset) -> streak = 1
    - Already logged in today -> no change (prevents multiple logins/day from
      inflating the streak)
    - Last login was yesterday -> streak += 1
    - Last login was any earlier date -> streak resets to 1
    """
    today = datetime.now(timezone.utc).date()

    if user.last_login_date is None:
        user.current_streak = 1
    elif user.last_login_date == today:
        pass  # already counted today, don't double-increment
    elif user.last_login_date == today - timedelta(days=1):
        user.current_streak += 1
    else:
        user.current_streak = 1

    user.last_login_date = today

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == form_data.username)
    user = (await db.execute(stmt)).scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in.",
        )

    _update_login_streak(user)
    await db.commit()

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _update_login_streak(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.name:
        current_user.name = payload.name

    if payload.password:
        current_user.hashed_password = get_password_hash(payload.password)

    if payload.hide_security_warning is not None:
        current_user.hide_security_warning = payload.hide_security_warning

    if payload.email and payload.email != current_user.email:
        stmt = select(User).where(User.email == payload.email)
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="That email is already in use by another account.",
            )

        current_user.pending_email = payload.email
        try:
            _issue_and_send_otp(current_user, target_email=payload.email)
        except Exception as e:
            print(f"[Email Change] Failed to send verification email: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not send a verification code to the new email. Please try again shortly.",
            )
        # current_user.email is deliberately left untouched here - it only
        # changes once the code is confirmed via /auth/confirm-email-change.

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/confirm-email-change", response_model=UserResponse)
async def confirm_email_change(
    payload: ConfirmEmailChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.pending_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No email change is pending.")

    if not current_user.verification_code or not current_user.verification_code_expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No verification code is pending. Please request the change again.")

    if datetime.now(timezone.utc) > current_user.verification_code_expires_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This code has expired. Please request the change again.")

    if payload.code.strip() != current_user.verification_code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect verification code.")

    current_user.email = current_user.pending_email
    current_user.pending_email = None
    current_user.verification_code = None
    current_user.verification_code_expires_at = None

    await db.commit()
    await db.refresh(current_user)
    return current_user