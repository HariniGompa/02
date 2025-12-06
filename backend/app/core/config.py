import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Loan Eligibility Prediction System"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "LEPS Backend"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",  # Default React dev server
        "http://localhost:8000",  # Default FastAPI dev server
    ]
    
    # Database
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    
    # ML Model Paths
    MODEL_PATH: str = "app/ml/artifacts/logistic.pkl"
    TRANSFORMER_PATH: str = "app/ml/artifacts/transformer.joblib"
    
    # File Uploads
    UPLOAD_FOLDER: str = "uploads"
    MAX_CONTENT_LENGTH: int = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS: set = {"pdf", "png", "jpg", "jpeg"}
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
