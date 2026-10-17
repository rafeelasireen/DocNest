import secrets
import uuid
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config import settings
from database.postgres import get_db
from dependencies import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from models.schemas import (
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
    VerifyRequest,
)
from models.user import EmailVerificationToken, User, UserRole
from services.ai_service import log_audit
from services.email_service import send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=MessageResponse)
def register(body: RegisterRequest, db: Annotated[Session, Depends(get_db)]):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=UserRole.user,
        is_verified=settings.dev_skip_verify,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if not settings.dev_skip_verify:
        token = secrets.token_urlsafe(32)
        verification = EmailVerificationToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(hours=24),
        )
        db.add(verification)
        db.commit()
        send_verification_email(user.email, token)
    else:
        log_audit(db, user.id, "register", "user", str(user.id))

    return MessageResponse(message="Registration successful. Please check your email to verify your account.")


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Annotated[Session, Depends(get_db)]):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please check your inbox.",
        )

    log_audit(db, user.id, "login", "user", str(user.id))
    token = create_access_token(user)
    return TokenResponse(access_token=token)


@router.post("/verify", response_model=MessageResponse)
def verify_email(body: VerifyRequest, db: Annotated[Session, Depends(get_db)]):
    record = (
        db.query(EmailVerificationToken)
        .filter(EmailVerificationToken.token == body.token)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token")

    if record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification token expired")

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_verified = True
    db.delete(record)
    db.commit()

    return MessageResponse(message="Email verified successfully. You can now log in.")
