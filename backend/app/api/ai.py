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


async def _get_user_context(user: User, db: AsyncSession) -> dict:
    """Загружает контекст пользователя: категории, субъекты, настройки."""
    # Категории
    result = await db.execute(
        select(Category).where(Category.user_id == user.id)
    )
    categories = [
        {"id": c.id, "name": c.name, "type": c.type, "ai_hint": c.ai_hint}
        for c in result.scalars().all()
    ]

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


async def _call_gemini(system: str, user_prompt: str) -> dict:
    """Вызывает Gemini API и возвращает распарсенный JSON."""
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=system,
        )

        response = await model.generate_content_async(
            user_prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )

        # Парсим JSON из ответа
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

    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)

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

        # Модель с системным промтом
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=SYSTEM_PROMPT,
        )

        # Отправляем аудио + текстовый промт
        response = await model.generate_content_async(
            [
                {"mime_type": mime_type, "data": audio_data},
                user_prompt,
            ],
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )

        text = response.text.strip()
        return json.loads(text)

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI вернул невалидный ответ",
        )
    except Exception as e:
        logger.error(f"Ошибка парсинга аудио: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Ошибка AI-сервиса: {str(e)}",
        )
