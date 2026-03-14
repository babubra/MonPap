"""Конфигурация приложения — Pydantic Settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Настройки из переменных окружения (.env)."""

    # --- База данных ---
    DATABASE_URL: str = "postgresql+asyncpg://monpap:changeme@localhost:5432/monpap"

    # --- Безопасность ---
    JWT_SECRET: str = "changeme_jwt_secret_key_min_32_chars!!"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 дней
    ALLOWED_EMAILS: str = ""  # Через запятую: "a@b.com,c@d.com"

    # --- Gemini AI ---
    GEMINI_API_KEY: str = ""

    # --- SMTP (Magic Link) ---
    SMTP_HOST: str = "smtp.yandex.ru"
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""

    # --- Режим разработки ---
    DEV_MODE: bool = False

    @property
    def allowed_emails_list(self) -> list[str]:
        """Список разрешённых email."""
        return [e.strip().lower() for e in self.ALLOWED_EMAILS.split(",") if e.strip()]

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    """Кешированный синглтон настроек."""
    return Settings()
