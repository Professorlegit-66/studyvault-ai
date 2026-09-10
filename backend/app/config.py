from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "StudyVault AI"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    
    JWT_SECRET_KEY: str = "super-secret-jwt-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    class Config:
        env_file = ".env"

settings = Settings()