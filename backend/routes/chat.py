from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.postgres import get_db
from dependencies import get_current_user, is_admin
from models.schemas import ChatHistoryResponse, ChatMessageResponse, ChatRequest, ChatResponse
from models.user import ChatHistory, Document, User
from services.rag_service import rag_service

router = APIRouter(prefix="/chat", tags=["chat"])


def _get_document_or_404(db: Session, doc_id: UUID, user: User) -> Document:
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if doc.user_id != user.id and not is_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return doc


@router.post("", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    doc = _get_document_or_404(db, body.document_id, user)

    if doc.processing_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document is not ready for chat. Please wait until processing is complete.",
        )

    answer, source_page, source_version = rag_service.query(
        doc.id,
        body.question,
        document_version=doc.current_version_number or 1,
    )

    record = ChatHistory(
        user_id=user.id,
        document_id=doc.id,
        question=body.question,
        answer=answer,
        source_page=source_page,
        source_version=source_version,
    )
    db.add(record)
    db.commit()

    return ChatResponse(
        answer=answer,
        source_page=source_page,
        source_version=source_version,
    )


@router.get("/{document_id}", response_model=ChatHistoryResponse)
def get_chat_history(
    document_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    doc = _get_document_or_404(db, document_id, user)
    messages = (
        db.query(ChatHistory)
        .filter(ChatHistory.document_id == doc.id, ChatHistory.user_id == user.id)
        .order_by(ChatHistory.created_at.asc())
        .all()
    )
    return ChatHistoryResponse(messages=[ChatMessageResponse.model_validate(m) for m in messages])
