"""JWT-токены — создание и верификация."""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Создаёт JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_magic_token(email: str) -> str:
    """Создаёт короткоживущий JWT для Magic Link (15 минут)."""
    return create_access_token(
        {"sub": email, "purpose": "magic_link"},
        expires_delta=timedelta(minutes=15),
    )


def verify_token(token: str) -> dict | None:
    """Верифицирует JWT и возвращает payload. None при ошибке."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None
