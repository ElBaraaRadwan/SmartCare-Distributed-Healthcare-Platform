from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Service Configuration
    port: int = 8000
    host: str = "0.0.0.0"
    environment: str = "development"

    # MinIO Configuration
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "prescriptions"
    minio_secure: bool = False

    # File Upload Configuration
    max_file_size_mb: int = 10
    allowed_extensions: List[str] = ["jpg", "jpeg", "png", "pdf"]

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
