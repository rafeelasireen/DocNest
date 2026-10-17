from typing import Annotated
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from config import settings
from database.postgres import get_db
from dependencies import can_delete, can_restore, can_upload, get_current_user, is_admin
from models.schemas import (
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
    MessageResponse,
    RenameDocumentRequest,
    SummarizeRequest,
    SummarizeResponse,
    VersionListResponse,
)
from models.user import Document, DocumentVersion, User
from services.ai_service import log_audit, process_document
from services.minio_service import minio_service
from services.rag_service import rag_service

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB


def _get_document_or_404(db: Session, doc_id: UUID, user: User) -> Document:
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if doc.user_id != user.id and not is_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return doc


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    file: UploadFile = File(...),
):
    if not can_upload(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Viewers cannot upload")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are allowed")

    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File exceeds 20 MB limit")

    document = Document(
        user_id=user.id,
        filename=file.filename,
        minio_path="",
        size=len(content),
        current_version_number=1,
        processing_status="pending",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    document.minio_path = minio_service.upload_current(document, content)
    db.commit()

    log_audit(db, user.id, "upload", "document", str(document.id))
    background_tasks.add_task(process_document, document.id)

    return DocumentUploadResponse(id=document.id, filename=document.filename, size=document.size)


@router.get("", response_model=DocumentListResponse)
def list_documents(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    query = db.query(Document)
    if not is_admin(user):
        query = query.filter(Document.user_id == user.id)
    documents = query.order_by(Document.upload_date.desc()).all()

    storage_used = minio_service.get_user_storage_bytes(db, user.id)
    storage_quota = settings.storage_quota_gb * 1024 * 1024 * 1024

    return DocumentListResponse(
        documents=[DocumentResponse.model_validate(d) for d in documents],
        storage_used=storage_used,
        storage_quota=storage_quota,
    )


@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(
    doc_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    doc = _get_document_or_404(db, doc_id, user)
    return DocumentResponse.model_validate(doc)


@router.patch("/{doc_id}", response_model=DocumentResponse)
def rename_document(
    doc_id: UUID,
    body: RenameDocumentRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    if not can_upload(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Viewers cannot rename documents")

    doc = _get_document_or_404(db, doc_id, user)
    doc.filename = body.filename.strip()
    db.commit()
    db.refresh(doc)

    log_audit(db, user.id, "rename", "document", str(doc.id))
    return DocumentResponse.model_validate(doc)


@router.delete("/{doc_id}", response_model=MessageResponse)
def delete_document(
    doc_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    if not can_delete(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Viewers cannot delete")

    doc = _get_document_or_404(db, doc_id, user)

    minio_service.delete_document_files(doc)
    rag_service.delete_collection(doc.id)

    log_audit(db, user.id, "delete", "document", str(doc.id))
    db.delete(doc)
    db.commit()

    return MessageResponse(message="Document and all related data deleted")


@router.post("/{doc_id}/reprocess", response_model=MessageResponse)
def reprocess_document(
    doc_id: UUID,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    doc = _get_document_or_404(db, doc_id, user)
    if not can_upload(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewers cannot reprocess documents",
        )
    doc.processing_status = "pending"
    doc.summary = None
    doc.score = None
    rag_service.delete_collection(doc.id)
    db.commit()
    background_tasks.add_task(process_document, doc.id)
    return MessageResponse(message="Document reprocessing started")


@router.post("/{doc_id}/update", response_model=DocumentUploadResponse)
async def update_document(
    doc_id: UUID,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    file: UploadFile = File(...),
):
    if not can_upload(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Viewers cannot update documents")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are allowed")

    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File exceeds 20 MB limit")

    doc = _get_document_or_404(db, doc_id, user)

    if doc.processing_status in ("pending", "processing"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document is still processing. Wait until it completes before updating.",
        )

    current_bytes = minio_service.download(doc.minio_path)
    minio_service.create_version(db, doc, current_bytes)

    doc.minio_path = minio_service.upload_current(doc, content)
    doc.size = len(content)
    doc.current_version_number += 1
    doc.upload_date = datetime.utcnow()
    doc.summary = None
    doc.score = None
    doc.processing_status = "pending"
    rag_service.delete_collection(doc.id)
    db.commit()

    log_audit(db, user.id, "update", "document", str(doc.id))
    background_tasks.add_task(process_document, doc.id)

    return DocumentUploadResponse(id=doc.id, filename=doc.filename, size=doc.size)


@router.get("/{doc_id}/download")
def download_document(
    doc_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    doc = _get_document_or_404(db, doc_id, user)
    data = minio_service.download(doc.minio_path)
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{doc.filename}"'},
    )


@router.get("/{doc_id}/versions", response_model=VersionListResponse)
def list_versions(
    doc_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    doc = _get_document_or_404(db, doc_id, user)
    versions = (
        db.query(DocumentVersion)
        .filter(DocumentVersion.document_id == doc.id)
        .order_by(DocumentVersion.version_number.desc())
        .all()
    )
    return VersionListResponse(versions=versions)


@router.get("/{doc_id}/versions/{version_id}/download")
def download_version(
    doc_id: UUID,
    version_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    doc = _get_document_or_404(db, doc_id, user)
    version = (
        db.query(DocumentVersion)
        .filter(DocumentVersion.id == version_id, DocumentVersion.document_id == doc.id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    data = minio_service.download(version.minio_path)
    base_name = doc.filename.rsplit(".", 1)[0] if "." in doc.filename else doc.filename
    filename = f"{base_name}-v{version.version_number}.pdf"
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{doc_id}/restore/{version_id}", response_model=MessageResponse)
def restore_version(
    doc_id: UUID,
    version_id: UUID,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    if not can_restore(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Viewers cannot restore")

    doc = _get_document_or_404(db, doc_id, user)
    version = (
        db.query(DocumentVersion)
        .filter(DocumentVersion.id == version_id, DocumentVersion.document_id == doc.id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    if doc.processing_status in ("pending", "processing"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document is still processing. Wait until it completes before restoring.",
        )

    minio_service.restore_version(db, doc, version)
    doc.summary = None
    doc.score = None
    doc.processing_status = "pending"
    rag_service.delete_collection(doc.id)
    db.commit()

    log_audit(db, user.id, "restore", "document", str(doc.id))
    background_tasks.add_task(process_document, doc.id)

    return MessageResponse(
        message=f"Restored to version {version.version_number}. Reprocessing started."
    )


@router.get("/{doc_id}/score")
def get_score(
    doc_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    doc = _get_document_or_404(db, doc_id, user)
    if not doc.score:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Score not available yet")
    return doc.score


@router.post("/summarize", response_model=SummarizeResponse)
def summarize_document(
    body: SummarizeRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    doc = _get_document_or_404(db, body.document_id, user)
    if doc.summary:
        return SummarizeResponse(summary=doc.summary)

    pdf_bytes = minio_service.download(doc.minio_path)
    pages = rag_service.extract_text_from_pdf(pdf_bytes)
    full_text = "\n\n".join(p["text"] for p in pages)
    summary = rag_service.summarize(full_text)
    doc.summary = summary
    db.commit()

    log_audit(db, user.id, "summarize", "document", str(doc.id))
    return SummarizeResponse(summary=summary)
