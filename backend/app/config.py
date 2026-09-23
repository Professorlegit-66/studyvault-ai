from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List

class Settings(BaseSettings):
    APP_NAME: str = "StudyVault AI"
    PROJECT_NAME: str = "StudyVault AI"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/studyvault_db"
    JWT_SECRET_KEY: str = "default_fallback_jwt_secret_key_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: str | None = None

    GMAIL_ADDRESS: Optional[str] = None
    GMAIL_APP_PASSWORD: Optional[str] = None

    # Brevo (transactional email over HTTPS) - replaces raw Gmail SMTP.
    # Render's outbound network blocks/times out on SMTP ports (587/465),
    # so verification emails are sent via Brevo's HTTP API instead, which
    # travels over port 443 like any other API call and isn't affected by
    # that restriction. BREVO_FROM_EMAIL must be a sender address verified
    # in the Brevo dashboard (Senders, Domains & Dedicated IPs -> Senders).
    BREVO_API_KEY: Optional[str] = None
    BREVO_FROM_EMAIL: Optional[str] = None

    # CORS_ORIGINS is read as a JSON array string from the environment, e.g.
    # CORS_ORIGINS=["https://your-app.vercel.app","http://localhost:5173"]
    # pydantic-settings parses this automatically for List[str] fields.
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()