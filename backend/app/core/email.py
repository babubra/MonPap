"""Отправка Magic Link через SMTP."""

import logging

import aiosmtplib
from email.mime.text import MIMEText

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_magic_link(email: str, token: str, base_url: str = "") -> bool:
    """Отправляет Magic Link на указанный email.

    Args:
        email: Email получателя
        token: JWT-токен для верификации
        base_url: Базовый URL приложения (например, https://monpap.example.com)

    Returns:
        True если письмо отправлено, False при ошибке.
    """
    verify_url = f"{base_url}/api/auth/verify?token={token}"

    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #6C5CE7;">MonPap</h2>
        <p>Нажмите кнопку для входа в приложение:</p>
        <a href="{verify_url}"
           style="display: inline-block; background: #6C5CE7; color: white; 
                  padding: 12px 32px; border-radius: 8px; text-decoration: none;
                  font-weight: 600; margin: 16px 0;">
            Войти в MonPap
        </a>
        <p style="color: #888; font-size: 13px;">
            Ссылка действительна 15 минут. Если вы не запрашивали вход — проигнорируйте это письмо.
        </p>
    </div>
    """

    msg = MIMEText(html, "html", "utf-8")
    msg["Subject"] = "Вход в MonPap"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = email

    try:
        # Порт 465 = implicit TLS (use_tls), порт 587 = STARTTLS (start_tls)
        use_tls = settings.SMTP_PORT == 465
        start_tls = settings.SMTP_PORT == 587

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=use_tls,
            start_tls=start_tls,
        )
        logger.info(f"Magic Link отправлен на {email}")
        return True
    except Exception as e:
        logger.error(f"Ошибка отправки Magic Link на {email}: {e}")
        return False
