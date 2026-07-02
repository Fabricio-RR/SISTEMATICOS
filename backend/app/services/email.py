"""
Servicio para enviar correos electrónicos del sistema.
"""
import logging
import smtplib
import ssl
from email.message import EmailMessage
from html import escape
from pathlib import Path

from app.config import settings

logger = logging.getLogger("email")

# Acento de marca (rojo Olimpiadas), usado con mesura.
_BRAND = "#c81e1e"
# Logo (isotipo) incrustado inline en el correo vía Content-ID.
_LOGO_PATH = Path(__file__).resolve().parent.parent / "assets" / "logo.png"
_LOGO_CID = "logo_olimpiadas"


def _leer_logo() -> bytes | None:
    try:
        return _LOGO_PATH.read_bytes()
    except OSError:
        logger.warning("No se encontró el logo del correo en %s", _LOGO_PATH)
        return None


def _texto_a_html(body: str) -> str:
    """Convierte el cuerpo en texto plano a HTML, respetando saltos de línea y
    viñetas «• ». Omite líneas de saludo/firma redundantes con la plantilla."""
    bloques = [b for b in body.split("\n\n") if b.strip()]
    partes: list[str] = []
    for bloque in bloques:
        lineas = [l for l in bloque.split("\n") if l.strip()]
        # La firma «— Olimpiadas Perú» ya está en el pie: no la repetimos.
        if len(lineas) == 1 and lineas[0].strip().lstrip("—").strip() == "Olimpiadas Perú":
            continue
        if all(l.strip().startswith("•") for l in lineas):
            items = "".join(
                f'<li style="margin:0 0 6px;">{escape(l.strip().lstrip("•").strip())}</li>'
                for l in lineas
            )
            partes.append(
                f'<ul style="margin:0 0 16px;padding-left:20px;color:#3f3f46;'
                f'font-size:15px;line-height:1.65;">{items}</ul>'
            )
        else:
            texto = "<br>".join(escape(l) for l in lineas)
            partes.append(
                f'<p style="margin:0 0 16px;color:#3f3f46;font-size:15px;'
                f'line-height:1.65;">{texto}</p>'
            )
    return "\n".join(partes)


def render_html(subject: str, body: str, *, logo_src: str = f"cid:{_LOGO_CID}") -> str:
    """Envuelve el contenido en una plantilla HTML sobria con la marca Olimpiadas Perú.
    El título se toma del asunto (sin el sufijo « — Olimpiadas Perú»)."""
    titulo = subject.split(" — ")[0].strip()
    contenido = _texto_a_html(body)
    logo = (
        f'<img src="{logo_src}" width="44" height="45" alt="Olimpiadas Perú" '
        f'style="display:block;border:0;">'
    )
    return f"""\
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
        <!-- Filete de marca -->
        <tr><td style="height:3px;background:{_BRAND};font-size:0;line-height:0;">&nbsp;</td></tr>
        <!-- Encabezado con logo -->
        <tr><td style="padding:26px 32px 20px;border-bottom:1px solid #f1f1f4;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;vertical-align:middle;">{logo}</td>
            <td style="vertical-align:middle;">
              <div style="color:#18181b;font-size:16px;font-weight:700;letter-spacing:0.2px;">Olimpiadas Perú</div>
              <div style="color:#a1a1aa;font-size:12px;">Sistema de gestión deportiva</div>
            </td>
          </tr></table>
        </td></tr>
        <!-- Contenido -->
        <tr><td style="padding:28px 32px;">
          <h1 style="margin:0 0 18px;color:#18181b;font-size:19px;font-weight:600;">{escape(titulo)}</h1>
          {contenido}
        </td></tr>
        <!-- Pie -->
        <tr><td style="padding:18px 32px;background:#fafafa;border-top:1px solid #f1f1f4;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6;">
            Este es un mensaje automático del sistema de Olimpiadas Perú. Por favor, no respondas a este correo.
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;color:#d4d4d8;font-size:11px;">© Olimpiadas Perú</p>
    </td></tr>
  </table>
</body>
</html>"""


def send_email(to: str | None, subject: str, body: str) -> bool:
    """Envía un correo (texto plano + versión HTML con el logo incrustado). Devuelve
    True si se envió (o se simuló en modo dev), False si no había destinatario o falló."""
    if not to:
        return False

    # Si el correo no está configurado, no enviamos: solo lo mostramos en consola.
    # Lo damos por "enviado" para poder probar el flujo sin SMTP real.
    if not settings.EMAIL_ENABLED or not settings.SMTP_HOST:
        logger.info("[EMAIL:dev] Para=%s | Asunto=%s\n%s", to, subject, body)
        return True

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)  # versión de respaldo en texto plano
    msg.add_alternative(render_html(subject, body), subtype="html")

    # Incrusta el logo inline (Content-ID) para que se vea en el cuerpo del correo.
    # `disposition=inline` + `filename` evitan que aparezca como adjunto "noname".
    logo = _leer_logo()
    if logo is not None:
        html_part = msg.get_payload()[1]
        html_part.add_related(
            logo,
            maintype="image",
            subtype="png",
            cid=f"<{_LOGO_CID}>",
            filename="olimpiadas-peru.png",
            disposition="inline",
        )

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_TLS:
                server.starttls(context=ssl.create_default_context())
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Correo enviado a %s (%s)", to, subject)
        return True
    except Exception:  # noqa: BLE001 - si el envío falla, lo registramos y seguimos sin cortar la operación
        logger.exception("No se pudo enviar el correo a %s", to)
        return False
