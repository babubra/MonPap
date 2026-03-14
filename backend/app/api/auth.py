"""Auth API — Magic Link аутентификация."""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.email import send_magic_link
from app.core.security import create_access_token, create_magic_token, verify_token
from app.db.models import User, UserSettings
from app.db.session import get_db
from app.schemas import AuthRequest, TokenResponse, UserResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


@router.post("/request-link", status_code=status.HTTP_200_OK)
async def request_magic_link(
    body: AuthRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Запрос Magic Link на email.

    В DEV_MODE — сразу возвращает токен (без отправки письма).
    """
    email = body.email.lower().strip()

    # DEV_MODE — возвращаем токен сразу (без проверки белого списка)
    if settings.DEV_MODE:
        # Создаём пользователя если не существует
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            user = User(email=email)
            db.add(user)
            await db.flush()
            # Создаём настройки по умолчанию
            db.add(UserSettings(user_id=user.id))
            await db.flush()

        token = create_access_token({"sub": email})
        return {"message": "DEV_MODE: token выдан напрямую", "token": token}

    # Проверяем белый список (только в production)
    if settings.allowed_emails_list and email not in settings.allowed_emails_list:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email не в списке разрешённых",
        )

    # Создаём Magic Link и отправляем
    token = create_magic_token(email)

    # Определяем base_url из заголовков запроса
    scheme = request.headers.get("x-forwarded-proto", "https")
    host = request.headers.get("host", "")
    base_url = f"{scheme}://{host}"

    sent = await send_magic_link(email, token, base_url)

    if not sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось отправить письмо",
        )

    return {"message": "Ссылка для входа отправлена на email"}


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

    # Создаём пользователя если не существует
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        user = User(email=email)
        db.add(user)
        await db.flush()
        # Создаём настройки по умолчанию
        db.add(UserSettings(user_id=user.id))
        await db.flush()

    # Выдаём долгоживущий access token
    access_token = create_access_token({"sub": email})

    # Редирект на фронтенд с токеном
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/?access_token={access_token}")


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Получение информации о текущем пользователе."""
    return user


@router.post("/logout")
async def logout():
    """Логаут (клиент удаляет токен)."""
    return {"message": "Logged out"}
