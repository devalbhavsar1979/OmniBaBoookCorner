from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    UPLOAD_DIR: str = "uploads"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8000,http://app.boookcorner.in:8000,http://app.boookcorner.in:3000"

    # Public-facing base URL of the backend (no trailing slash).
    # Used to build absolute image/link URLs for WhatsApp/Facebook share previews.
    # e.g. "http://app.boookcorner.in:1000" — must be reachable by WhatsApp/Facebook's
    # crawlers from the internet (not localhost).
    PUBLIC_BASE_URL: str = "http://app.boookcorner.in:8000"

    # ── Email / SMTP ──────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""          # e.g. yourapp@gmail.com
    SMTP_PASSWORD: str = ""      # App password (not login password)
    EMAIL_FROM_NAME: str = "Ba Book Corner"
    EMAIL_FROM: str = ""         # defaults to SMTP_USER if blank
    EMAIL_ENABLED: bool = False  # set True once SMTP is configured

    # ── Gemini (cover scan) ───────────────────────────────────
    GEMINI_API_KEY: str = ""

    # ── Issue Register ────────────────────────────────────────
    OVERDUE_DAYS: int = 14  # days after which an issued book is flagged as overdue

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