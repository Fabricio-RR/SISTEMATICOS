"""
Helpers de notificación.

Combinan los dos canales del sistema —el aviso in-app (`Notificacion`) y el
correo— para que se disparen juntos y no se desincronicen (antes cada router los
llamaba a mano y algunos eventos avisaban por un canal y no por el otro).

El correo siempre se envía en segundo plano (BackgroundTasks): si falla, la
operación principal ya quedó guardada y la respuesta no se demora.
"""
from datetime import datetime, timezone

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.instituciones import Institucion
from app.models.notificaciones import Notificacion
from app.models.usuarios import Usuario
from app.services.email import send_email

_REMITENTE = "Olimpiadas Perú"


def asunto(titulo: str) -> str:
    """Asunto estándar del correo a partir del título del aviso."""
    return f"{titulo} — {_REMITENTE}"


def correo_institucion(db: Session, institucion_id: int | None) -> str | None:
    """Correo al que avisar a la institución.

    Prioriza el `contacto` de la institución (si es un correo), que es el que el
    admin configura explícitamente para recibir avisos; si no hay, cae al correo
    de login de su usuario.
    """
    if not institucion_id:
        return None
    inst = db.get(Institucion, institucion_id)
    if inst and inst.contacto and "@" in inst.contacto:
        return inst.contacto
    user = (
        db.query(Usuario)
        .filter(Usuario.institucion_id == institucion_id, Usuario.rol == "institucion")
        .first()
    )
    return user.correo if user else None


def enviar_y_registrar(notificacion_id: int, to: str | None, subject: str, body: str) -> None:
    """Envía el correo y deja constancia del resultado en la Notificacion.

    Corre en segundo plano (después de responder la petición), por eso abre su
    propia sesión: la sesión de la petición ya está cerrada para entonces.
    """
    enviado = send_email(to, subject, body)
    db = SessionLocal()
    try:
        n = db.get(Notificacion, notificacion_id)
        if n is not None:
            n.email_estado = "enviado" if enviado else "fallido"
            n.email_enviado_en = datetime.now(timezone.utc) if enviado else None
            db.commit()
    finally:
        db.close()


def notify_institucion(
    db: Session,
    background: BackgroundTasks,
    institucion_id: int | None,
    titulo: str,
    contenido: str,
    *,
    email: bool = True,
    cuerpo_email: str | None = None,
    partido_id: int | None = None,
) -> None:
    """Registra el aviso in-app y, salvo que se pida lo contrario, envía el correo.

    No hace commit: el caller decide cuándo confirmar la transacción.
    `cuerpo_email` permite un texto de correo más largo que el aviso in-app;
    si se omite, el correo usa el mismo `contenido`.
    El resultado del envío queda registrado en `Notificacion.email_estado`.
    """
    if not institucion_id:
        return
    notif = Notificacion(
        institucion_id=institucion_id,
        partido_id=partido_id,
        titulo=titulo,
        contenido=contenido,
        email_estado="pendiente" if email else "no_aplica",
    )
    db.add(notif)
    if email:
        db.flush()  # asigna notif.id sin cerrar la transacción del caller
        background.add_task(
            enviar_y_registrar,
            notif.id,
            correo_institucion(db, institucion_id),
            asunto(titulo),
            cuerpo_email or contenido,
        )
