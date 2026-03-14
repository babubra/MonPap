"""Auth API — Magic Link + PIN-код аутентификация."""

import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.email import send_magic_link
from app.core.security import create_access_token, create_magic_token, verify_token
from app.db.models import User, UserSettings, MagicCode
from app.db.session import get_db
from app.schemas import AuthRequest, PinVerifyRequest, TokenResponse, UserResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


def _generate_pin() -> str:
    """Генерирует 6-значный PIN-код."""
    return f"{random.randint(100000, 999999)}"


async def _get_or_create_user(db: AsyncSession, email: str) -> User:
    """Получает или создаёт пользователя по email."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        user = User(email=email)
        db.add(user)
        await db.flush()
        # Создаём настройки по умолчанию
        db.add(UserSettings(user_id=user.id))
        await db.flush()
    return user


@router.post("/request-link", status_code=status.HTTP_200_OK)
async def request_magic_link(
    body: AuthRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Запрос Magic Link + PIN-код на email.

    В DEV_MODE — сразу возвращает токен (без отправки письма).
    """
    email = body.email.lower().strip()

    # DEV_MODE — возвращаем токен сразу (без проверки белого списка)
    if settings.DEV_MODE:
        await _get_or_create_user(db, email)
        token = create_access_token({"sub": email})
        return {"message": "DEV_MODE: token выдан напрямую", "token": token}

    # Проверяем белый список (только в production)
    if settings.allowed_emails_list and email not in settings.allowed_emails_list:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email не в списке разрешённых",
        )

    # Удаляем старые коды для этого email
    await db.execute(
        delete(MagicCode).where(MagicCode.email == email)
    )

    # Генерируем PIN-код и сохраняем в БД
    pin_code = _generate_pin()
    magic_code = MagicCode(
        email=email,
        code=pin_code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
    )
    db.add(magic_code)
    await db.flush()

    # Создаём Magic Link токен
    token = create_magic_token(email)

    # Определяем base_url из заголовков запроса
    scheme = request.headers.get("x-forwarded-proto", "https")
    host = request.headers.get("host", "")
    base_url = f"{scheme}://{host}"

    sent = await send_magic_link(email, token, base_url, pin_code)

    if not sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось отправить письмо",
        )

    return {"message": "Ссылка и код для входа отправлены на email"}


@router.get("/verify")
async def verify_magic_link(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Верификация Magic Link → редирект на фронтенд с access token."""
    payload = verify_token(token)
    if not payload or payload.get("purpose") != "magic_link":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидная или просроченная ссылка",
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидный токен",
        )

    await _get_or_create_user(db, email)

    # Удаляем использованные коды
    await db.execute(delete(MagicCode).where(MagicCode.email == email))

    # Выдаём долгоживущий access token
    access_token = create_access_token({"sub": email})

    # Редирект на фронтенд с токеном
    return RedirectResponse(url=f"/?access_token={access_token}")


@router.post("/verify-pin", response_model=TokenResponse)
async def verify_pin(
    body: PinVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Верификация по PIN-коду → выдача access token."""
    email = body.email.lower().strip()
    code = body.code.strip()

    # Ищем валидный код
    result = await db.execute(
        select(MagicCode).where(
            MagicCode.email == email,
            MagicCode.code == code,
            MagicCode.used == False,  # noqa: E712
            MagicCode.expires_at > datetime.now(timezone.utc),
        )
    )
    magic_code = result.scalar_one_or_none()

    if not magic_code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный код",
        )

    # Помечаем код как использованный и удаляем все коды для email
    await db.execute(delete(MagicCode).where(MagicCode.email == email))

    await _get_or_create_user(db, email)

    # Выдаём access token
    access_token = create_access_token({"sub": email})
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Получение информации о текущем пользователе."""
    return user


@router.post("/logout")
async def logout():
    """Логаут (клиент удаляет токен)."""
    return {"message": "Logged out"}
