from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "StudyVault AI"
    PROJECT_NAME: str = "StudyVault AI"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/studyvault_db"
    JWT_SECRET_KEY: str = "default_fallback_jwt_secret_key_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    GEMINI_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()