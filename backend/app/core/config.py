import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./data/app.db"
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "dev-secret-key-32-chars-minimum")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL: str = os.environ.get("OPENAI_MODEL", "gemini-2.5-flash")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
