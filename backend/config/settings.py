from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    UPLOAD_DIR: str = "uploads"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8000"

    # ── Email / SMTP ──────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""          # e.g. yourapp@gmail.com
    SMTP_PASSWORD: str = ""      # App password (not login password)
    EMAIL_FROM_NAME: str = "Ba Book Corner"
    EMAIL_FROM: str = ""         # defaults to SMTP_USER if blank
    EMAIL_ENABLED: bool = False  # set True once SMTP is configured

    class Config:
        env_file = ".env"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def email_from_address(self) -> str:
        return self.EMAIL_FROM or self.SMTP_USER


@lru_cache()
def get_settings() -> Settings:
    return Settings()
