from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.postgres import get_db
from dependencies import get_current_user, is_admin
from models.schemas import AuditLogListResponse, AuditLogResponse, UserResponse
from models.user import AuditLog, User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/audit-logs", response_model=AuditLogListResponse)
def get_audit_logs(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    if not is_admin(user):
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(200).all()
    return AuditLogListResponse(logs=[AuditLogResponse.model_validate(log) for log in logs])


@router.get("/me", response_model=UserResponse)
def get_me(user: Annotated[User, Depends(get_current_user)]):
    return UserResponse.model_validate(user)
