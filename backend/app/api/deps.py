"""FastAPI dependencies — получение текущего пользователя."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import verify_token
from app.db.models import User
from app.db.session import get_db

settings = get_settings()
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Извлекает текущего пользователя из JWT.

    В DEV_MODE без токена — возвращает/создаёт dev-пользователя.
    """
    # DEV_MODE: если нет токена — автологин
    if settings.DEV_MODE and credentials is None:
        dev_email = settings.allowed_emails_list[0] if settings.allowed_emails_list else "dev@monpap.local"
        result = await db.execute(select(User).where(User.email == dev_email))
        user = result.scalar_one_or_none()
        if not user:
            user = User(email=dev_email)
            db.add(user)
            await db.flush()
        return user

    # Обычный режим: требуем токен
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
        )

    payload = verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидный или просроченный токен",
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидный токен",
        )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )

    return user
