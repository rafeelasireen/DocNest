from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# Auth schemas
class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class VerifyRequest(BaseModel):
    token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str


# User schemas
class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# Document schemas
class DocumentScore(BaseModel):
    completeness: int
    readability: int
    structure: int
    overall: int


class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    size: int
    upload_date: datetime
    current_version_number: int = 1
    summary: str | None = None
    score: dict[str, Any] | None = None
    processing_status: str = "pending"

    model_config = {"from_attributes": True}


class RenameDocumentRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=512)


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    storage_used: int
    storage_quota: int


class DocumentUploadResponse(BaseModel):
    id: UUID
    filename: str
    size: int


class DocumentVersionResponse(BaseModel):
    id: UUID
    version_number: int
    size: int
    created_at: datetime

    model_config = {"from_attributes": True}


class VersionListResponse(BaseModel):
    versions: list[DocumentVersionResponse]


class SummarizeRequest(BaseModel):
    document_id: UUID


class SummarizeResponse(BaseModel):
    summary: str


# Chat schemas
class ChatRequest(BaseModel):
    document_id: UUID
    question: str = Field(min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    answer: str
    source_page: int | None = None
    source_version: int | None = None


class ChatMessageResponse(BaseModel):
    id: UUID
    question: str
    answer: str
    source_page: int | None = None
    source_version: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatHistoryResponse(BaseModel):
    messages: list[ChatMessageResponse]


# Audit schemas
class AuditLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    action: str
    resource_type: str
    resource_id: str | None
    timestamp: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    logs: list[AuditLogResponse]
