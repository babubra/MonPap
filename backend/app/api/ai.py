"""AI API — Парсинг текста/голоса через Gemini."""

import json
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.system_prompt import SYSTEM_PROMPT, build_ai_prompt
from app.db.models import Category, Counterpart, User, UserSettings
from app.db.session import get_db

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/ai", tags=["ai"])

_GEMINI_MODEL = "gemini-3.1-flash-lite-preview"


async def _get_user_context(user: User, db: AsyncSession) -> dict:
    """Загружает контекст пользователя: категории, субъекты, настройки."""
    # Категории
    result = await db.execute(
        select(Category).where(Category.user_id == user.id)
    )
    categories_data = result.scalars().all()
    categories_dict = {c.id: c for c in categories_data}
    
    categories = []
    for c in categories_data:
        name = c.name
        if c.parent_id and c.parent_id in categories_dict:
            name = f"{categories_dict[c.parent_id].name} / {name}"
        categories.append({"id": c.id, "name": name, "type": c.type, "ai_hint": c.ai_hint})

    # Субъекты
    result = await db.execute(
        select(Counterpart).where(Counterpart.user_id == user.id)
    )
    counterparts = [
        {"id": cp.id, "name": cp.name, "ai_hint": cp.ai_hint}
        for cp in result.scalars().all()
    ]

    # Настройки
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == user.id)
    )
    user_settings = result.scalar_one_or_none()
    custom_prompt = user_settings.custom_prompt if user_settings else None

    return {
        "categories": categories,
        "counterparts": counterparts,
        "custom_prompt": custom_prompt,
    }


async def _call_gemini(system: str, content_parts) -> dict:
    """Вызывает Gemini API и возвращает распарсенный JSON.

    content_parts может быть строкой (текстовый промт) или списком
    (аудио + текст для мультимодального ввода).
    Использует google-genai SDK (httpx-транспорт, поддерживает HTTPS_PROXY).
    """
    try:
        from google import genai
        from google.genai import types

        # Клиент подхватывает HTTPS_PROXY из окружения автоматически
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        # Нормализуем content_parts
        if isinstance(content_parts, str):
            contents = content_parts
        else:
            # Список [{"mime_type": ..., "data": ...}, text_str]
            parts = []
            for part in content_parts:
                if isinstance(part, dict):
                    parts.append(
                        types.Part.from_bytes(
                            data=part["data"],
                            mime_type=part["mime_type"],
                        )
                    )
                else:
                    parts.append(types.Part.from_text(text=part))
            contents = parts

        response = await client.aio.models.generate_content(
            model=_GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system,
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )

        text = response.text.strip()
        return json.loads(text)

    except json.JSONDecodeError as e:
        logger.error(f"Gemini вернул невалидный JSON: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI вернул невалидный ответ",
        )
    except Exception as e:
        logger.error(f"Ошибка вызова Gemini: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка AI-сервиса: {str(e)}",
        )



@router.post("/parse")
async def parse_text(
    text: str = Form(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Парсинг текстового описания транзакции через Gemini.

    Принимает текст, формирует контекстный промт с категориями
    и субъектами пользователя, вызывает Gemini, возвращает
    структурированный JSON для preview.
    """
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY не настроен",
        )

    # Загружаем контекст пользователя
    ctx = await _get_user_context(user, db)

    # Формируем промт
    user_prompt = build_ai_prompt(
        user_text=text,
        categories=ctx["categories"],
        counterparts=ctx["counterparts"],
        custom_prompt=ctx["custom_prompt"],
        today=date.today().isoformat(),
    )

    # Вызываем Gemini
    result = await _call_gemini(SYSTEM_PROMPT, user_prompt)

    return result


@router.post("/parse-audio")
async def parse_audio(
    audio: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Парсинг голосового описания транзакции.

    Принимает аудиофайл, транскрибирует через Gemini,
    затем парсит текст.
    """
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY не настроен",
        )

    # Читаем аудио
    audio_data = await audio.read()
    mime_type = audio.content_type or "audio/webm"

    # Загружаем контекст
    ctx = await _get_user_context(user, db)

    # Формируем промт
    user_prompt = build_ai_prompt(
        user_text="[аудиозапись — расшифруй и распарси]",
        categories=ctx["categories"],
        counterparts=ctx["counterparts"],
        custom_prompt=ctx["custom_prompt"],
        today=date.today().isoformat(),
    )

    # Вызываем Gemini с мультимодальным вводом (аудио + текст)
    return await _call_gemini(
        SYSTEM_PROMPT,
        [{"mime_type": mime_type, "data": audio_data}, user_prompt],
    )
