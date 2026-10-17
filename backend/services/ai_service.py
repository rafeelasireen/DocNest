import logging
from uuid import UUID

from sqlalchemy.orm import Session

from models.user import AuditLog, Document
from services.minio_service import minio_service
from services.rag_service import rag_service
from services.scoring_service import score_document

logger = logging.getLogger(__name__)


def log_audit(
    db: Session,
    user_id: UUID,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
) -> None:
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
    )
    db.add(log)
    db.commit()


def process_document(document_id: UUID) -> None:
    from database.postgres import SessionLocal

    db = SessionLocal()
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return

        document.processing_status = "processing"
        db.commit()

        pdf_bytes = minio_service.download(document.minio_path)
        full_text = rag_service.index_document(
            document.id, pdf_bytes, document.current_version_number or 1
        )
        summary = rag_service.summarize(full_text) if full_text else "Empty document."
        score = score_document(full_text) if full_text else None

        document.summary = summary
        document.score = score
        document.processing_status = "completed"
        db.commit()

        log_audit(db, document.user_id, "summarize", "document", str(document.id))
    except Exception as e:
        logger.error("Document processing failed for %s: %s", document_id, e)
        document = db.query(Document).filter(Document.id == document_id).first()
        if document:
            document.processing_status = "failed"
            db.commit()
    finally:
        db.close()
