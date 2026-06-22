"""
Servicio para enviar correos electrónicos del sistema.

Cómo funciona:
- Los datos del servidor de correo se leen del archivo .env (variables SMTP_*).
  Si el correo está desactivado o no se configuró, en lugar de enviar solo
  escribe el mensaje en la consola. Así el proyecto se puede levantar y probar
  sin tener una cuenta de correo configurada.
- Si el envío falla (por ejemplo, el servidor de correo no responde), NO corta
  la operación: la inscripción se aprueba igual y el error solo queda registrado
  en el log. El correo siempre se envía después de responderle al usuario, para
  que la pantalla no se quede esperando.
"""
import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger("email")


def send_email(to: str | None, subject: str, body: str) -> None:
    if not to:
        return

    # Si el correo no está configurado, no enviamos: solo lo mostramos en consola.
    if not settings.EMAIL_ENABLED or not settings.SMTP_HOST:
        logger.info("[EMAIL:dev] Para=%s | Asunto=%s\n%s", to, subject, body)
        return

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_TLS:
                server.starttls(context=ssl.create_default_context())
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Correo enviado a %s (%s)", to, subject)
    except Exception:  # noqa: BLE001 - si el envío falla, lo registramos y seguimos sin cortar la operación
        logger.exception("No se pudo enviar el correo a %s", to)
