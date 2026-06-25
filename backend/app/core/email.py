"""
Servicio de notificaciones por correo electrónico vía Gmail SMTP.

Configuración requerida en .env:
  SMTP_USER=hubertolivera859@gmail.com
  SMTP_PASSWORD=<app-password-de-16-caracteres>

Para generar la App Password de Gmail:
  1. Habilitar verificación en 2 pasos en tu cuenta Google.
  2. Ir a: https://myaccount.google.com/apppasswords
  3. Crear contraseña de aplicación → copiar las 16 letras.
  4. Pegarla en SMTP_PASSWORD del .env.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings


def _send(to: str, subject: str, html: str) -> None:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[EMAIL] Sin credenciales SMTP — email a {to} no enviado")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Olimpiadas PERÚ <{settings.SMTP_USER}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    password = settings.SMTP_PASSWORD.replace(" ", "")
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, password)
            server.sendmail(settings.SMTP_USER, to, msg.as_string())
        print(f"[EMAIL] Enviado a {to}: {subject}")
    except Exception as e:
        print(f"[EMAIL] Error al enviar a {to}: {e}")


def enviar_aprobacion(correo: str, nombre: str, nombre_institucion: str) -> None:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:#dc2626;padding:32px 24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900">🏆 Olimpiadas PERÚ</h1>
        <p style="color:#fca5a5;margin:8px 0 0;font-size:14px">Sistema de Gestión Deportiva</p>
      </div>
      <div style="padding:32px 24px">
        <h2 style="color:#111;font-size:20px;margin:0 0 12px">¡Tu cuenta fue aprobada!</h2>
        <p style="color:#374151;line-height:1.6">Hola <strong>{nombre}</strong>,</p>
        <p style="color:#374151;line-height:1.6">
          Tu solicitud de acceso para la institución <strong>{nombre_institucion}</strong>
          ha sido <span style="color:#16a34a;font-weight:bold">aprobada</span> por el administrador.
          Ya puedes ingresar al portal institucional con tus credenciales.
        </p>
        <div style="text-align:center;margin:28px 0">
          <a href="http://localhost:3000/login"
             style="background:#dc2626;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
            Iniciar Sesión
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px">
          Si tienes algún problema para ingresar, contáctate con el administrador del evento.
        </p>
      </div>
      <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb">
        <p style="color:#9ca3af;font-size:12px;margin:0">© 2026 Olimpiadas PERÚ · Todos los derechos reservados</p>
      </div>
    </div>
    """
    _send(correo, "✅ Tu acceso a Olimpiadas PERÚ fue aprobado", html)


def enviar_partido_programado(
    correo: str,
    nombre: str,
    equipo_local: str,
    equipo_visitante: str,
    fecha_hora: str,
    sede: str,
    deporte: str,
) -> None:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:#dc2626;padding:32px 24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900">🏆 Olimpiadas PERÚ</h1>
        <p style="color:#fca5a5;margin:8px 0 0;font-size:14px">Próximo Encuentro Deportivo</p>
      </div>
      <div style="padding:32px 24px">
        <h2 style="color:#111;font-size:20px;margin:0 0 16px">⚽ Partido Programado — {deporte}</h2>
        <p style="color:#374151;line-height:1.6">Hola <strong>{nombre}</strong>,</p>
        <p style="color:#374151;line-height:1.6">Se ha programado un nuevo partido para tu equipo:</p>
        <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:20px 0;border:1px solid #e5e7eb">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:120px">Local:</td>
                <td style="padding:6px 0;font-weight:bold;color:#111">{equipo_local}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Visitante:</td>
                <td style="padding:6px 0;font-weight:bold;color:#111">{equipo_visitante}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Fecha y hora:</td>
                <td style="padding:6px 0;font-weight:bold;color:#dc2626">{fecha_hora}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Sede:</td>
                <td style="padding:6px 0;font-weight:bold;color:#111">{sede}</td></tr>
          </table>
        </div>
        <p style="color:#6b7280;font-size:13px">
          Recuerda presentarte 30 minutos antes del inicio. ¡Mucho éxito!
        </p>
      </div>
      <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb">
        <p style="color:#9ca3af;font-size:12px;margin:0">© 2026 Olimpiadas PERÚ · Todos los derechos reservados</p>
      </div>
    </div>
    """
    _send(correo, f"📅 Partido programado: {equipo_local} vs {equipo_visitante}", html)


def enviar_inscripcion_aprobada(
    correo: str,
    nombre: str,
    nombre_equipo: str,
    nombre_torneo: str,
    deporte: str,
    pais: str,
    pais_emoji: str,
) -> None:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:#dc2626;padding:32px 24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900">🏆 Olimpiadas PERÚ</h1>
        <p style="color:#fca5a5;margin:8px 0 0;font-size:14px">Sistema de Gestión Deportiva</p>
      </div>
      <div style="padding:32px 24px">
        <h2 style="color:#111;font-size:20px;margin:0 0 12px">✅ Inscripción Aprobada</h2>
        <p style="color:#374151;line-height:1.6">Hola <strong>{nombre}</strong>,</p>
        <p style="color:#374151;line-height:1.6">
          La inscripción de tu equipo al torneo ha sido <span style="color:#16a34a;font-weight:bold">aprobada</span>.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:130px">Equipo:</td>
                <td style="padding:6px 0;font-weight:bold;color:#111">{nombre_equipo}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Torneo:</td>
                <td style="padding:6px 0;font-weight:bold;color:#111">{nombre_torneo}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Deporte:</td>
                <td style="padding:6px 0;font-weight:bold;color:#111">{deporte}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">País asignado:</td>
                <td style="padding:6px 0;font-weight:bold;color:#111">{pais_emoji} {pais}</td></tr>
          </table>
        </div>
        <p style="color:#374151;font-size:14px;line-height:1.6">
          Mantente atento a la programación de encuentros. ¡Mucho éxito en el torneo!
        </p>
        <div style="text-align:center;margin:28px 0">
          <a href="http://localhost:3000/institucion"
             style="background:#16a34a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
            Ver Portal Institucional
          </a>
        </div>
      </div>
      <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb">
        <p style="color:#9ca3af;font-size:12px;margin:0">© 2026 Olimpiadas PERÚ · Todos los derechos reservados</p>
      </div>
    </div>
    """
    _send(correo, f"✅ Tu equipo '{nombre_equipo}' fue aprobado en {nombre_torneo}", html)


def enviar_inscripcion_rechazada(
    correo: str,
    nombre: str,
    nombre_equipo: str,
    nombre_torneo: str,
) -> None:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:#dc2626;padding:32px 24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900">🏆 Olimpiadas PERÚ</h1>
        <p style="color:#fca5a5;margin:8px 0 0;font-size:14px">Sistema de Gestión Deportiva</p>
      </div>
      <div style="padding:32px 24px">
        <h2 style="color:#111;font-size:20px;margin:0 0 12px">❌ Inscripción No Aprobada</h2>
        <p style="color:#374151;line-height:1.6">Hola <strong>{nombre}</strong>,</p>
        <p style="color:#374151;line-height:1.6">
          La inscripción de tu equipo <strong>{nombre_equipo}</strong> en el torneo
          <strong>{nombre_torneo}</strong> ha sido <span style="color:#dc2626;font-weight:bold">rechazada</span>.
        </p>
        <p style="color:#6b7280;font-size:14px;line-height:1.6">
          Si consideras que esto es un error, por favor contáctate con el administrador
          del torneo para obtener más información.
        </p>
      </div>
      <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb">
        <p style="color:#9ca3af;font-size:12px;margin:0">© 2026 Olimpiadas PERÚ · Todos los derechos reservados</p>
      </div>
    </div>
    """
    _send(correo, f"❌ Inscripción de '{nombre_equipo}' en {nombre_torneo} no aprobada", html)


def enviar_resultado(
    correo: str,
    nombre: str,
    equipo_local: str,
    equipo_visitante: str,
    resultado_local: int,
    resultado_visitante: int,
    deporte: str,
) -> None:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:#dc2626;padding:32px 24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900">🏆 Olimpiadas PERÚ</h1>
        <p style="color:#fca5a5;margin:8px 0 0;font-size:14px">Resultado Final</p>
      </div>
      <div style="padding:32px 24px">
        <h2 style="color:#111;font-size:20px;margin:0 0 16px">Resultado — {deporte}</h2>
        <p style="color:#374151;line-height:1.6">Hola <strong>{nombre}</strong>, el partido ha concluido:</p>
        <div style="background:#f9fafb;border-radius:8px;padding:24px;margin:20px 0;text-align:center">
          <p style="font-size:18px;font-weight:bold;color:#111;margin:0">{equipo_local}</p>
          <p style="font-size:40px;font-weight:900;color:#dc2626;margin:8px 0">{resultado_local} — {resultado_visitante}</p>
          <p style="font-size:18px;font-weight:bold;color:#111;margin:0">{equipo_visitante}</p>
        </div>
        <p style="color:#6b7280;font-size:13px">
          Consulta la tabla de posiciones actualizada en el portal institucional.
        </p>
      </div>
      <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb">
        <p style="color:#9ca3af;font-size:12px;margin:0">© 2026 Olimpiadas PERÚ · Todos los derechos reservados</p>
      </div>
    </div>
    """
    _send(correo, f"📊 Resultado: {equipo_local} {resultado_local}-{resultado_visitante} {equipo_visitante}", html)
