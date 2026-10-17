import io
import logging
from uuid import UUID

from minio import Minio
from minio.error import S3Error
from sqlalchemy.orm import Session

from config import settings
from models.user import Document, DocumentVersion

logger = logging.getLogger(__name__)


class MinioService:
    def __init__(self):
        self.client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=False,
        )
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            if not self.client.bucket_exists(settings.minio_bucket):
                self.client.make_bucket(settings.minio_bucket)
        except S3Error as e:
            logger.warning("MinIO bucket check failed: %s", e)

    def current_path(self, user_id: UUID, document_id: UUID) -> str:
        return f"user_{user_id}/{document_id}/current.pdf"

    def version_path(self, user_id: UUID, document_id: UUID, version_number: int) -> str:
        return f"user_{user_id}/versions/{document_id}/v{version_number}.pdf"

    def _put_bytes(self, path: str, file_data: bytes) -> None:
        self.client.put_object(
            settings.minio_bucket,
            path,
            io.BytesIO(file_data),
            length=len(file_data),
            content_type="application/pdf",
        )

    def upload_current(self, document: Document, file_data: bytes) -> str:
        path = self.current_path(document.user_id, document.id)
        self._put_bytes(path, file_data)
        return path

    def download(self, minio_path: str) -> bytes:
        response = self.client.get_object(settings.minio_bucket, minio_path)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    def delete(self, minio_path: str) -> None:
        try:
            self.client.remove_object(settings.minio_bucket, minio_path)
        except S3Error as e:
            logger.warning("Failed to delete MinIO object %s: %s", minio_path, e)

    def delete_prefix(self, prefix: str) -> None:
        try:
            objects = self.client.list_objects(
                settings.minio_bucket, prefix=prefix, recursive=True
            )
            for obj in objects:
                self.client.remove_object(settings.minio_bucket, obj.object_name)
        except S3Error as e:
            logger.warning("Failed to delete MinIO prefix %s: %s", prefix, e)

    def delete_document_files(self, document: Document) -> None:
        seen: set[str] = set()

        if document.minio_path:
            seen.add(document.minio_path)
            self.delete(document.minio_path)

        for version in document.versions:
            if version.minio_path not in seen:
                seen.add(version.minio_path)
                self.delete(version.minio_path)

        version_prefix = f"user_{document.user_id}/versions/{document.id}/"
        self.delete_prefix(version_prefix)

        current = self.current_path(document.user_id, document.id)
        if current not in seen:
            self.delete(current)

        doc_prefix = f"user_{document.user_id}/{document.id}/"
        self.delete_prefix(doc_prefix)

    def next_version_number(self, db: Session, document_id: UUID) -> int:
        existing = (
            db.query(DocumentVersion)
            .filter(DocumentVersion.document_id == document_id)
            .order_by(DocumentVersion.version_number.desc())
            .first()
        )
        return (existing.version_number + 1) if existing else 1

    def create_version(self, db: Session, document: Document, file_data: bytes) -> DocumentVersion:
        version_number = self.next_version_number(db, document.id)
        path = self.version_path(document.user_id, document.id, version_number)
        self._put_bytes(path, file_data)

        version = DocumentVersion(
            document_id=document.id,
            version_number=version_number,
            minio_path=path,
            size=len(file_data),
        )
        db.add(version)
        db.commit()
        db.refresh(version)
        return version

    def restore_version(self, db: Session, document: Document, version: DocumentVersion) -> None:
        file_data = self.download(version.minio_path)
        path = self.upload_current(document, file_data)
        document.minio_path = path
        document.size = version.size
        document.current_version_number = version.version_number
        db.commit()

    def get_user_storage_bytes(self, db: Session, user_id: UUID) -> int:
        docs = db.query(Document).filter(Document.user_id == user_id).all()
        total = sum(d.size for d in docs)
        versions = (
            db.query(DocumentVersion)
            .join(Document)
            .filter(Document.user_id == user_id)
            .all()
        )
        total += sum(v.size for v in versions)
        return total

    def list_user_files(self, user_id: UUID) -> list[str]:
        objects = self.client.list_objects(
            settings.minio_bucket, prefix=f"user_{user_id}/", recursive=True
        )
        return [obj.object_name for obj in objects]


minio_service = MinioService()
