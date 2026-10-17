from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    postgres_url: str = "postgresql://docnest:docnest@localhost:5432/docnest"
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "cloudvault-files"
    chroma_host: str = "localhost"
    chroma_port: int = 8000
    ollama_base_url: str = "http://localhost:11434"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    frontend_url: str = "http://localhost:5173"
    dev_skip_verify: bool = False
    storage_quota_gb: int = 5
    cors_origins: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
