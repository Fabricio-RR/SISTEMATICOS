from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.inscripciones import Inscripcion
from app.models.partidos import Partido
from app.models.notificaciones import Notificacion
from app.models.auditoria import Auditoria
from app.schemas.inscripciones import InscripcionCreate, InscripcionOut
from app.core.deps import require_admin, get_current_user
from app.models.usuarios import Usuario
from app.services.competition import apply_walkover
from app.services.email import send_email
from app.services.enrollment import (
    assert_inscripcion_admin_change_allowed,
    assert_inscripcion_allowed,
)

_ESTADOS_NO_ACTIVOS = ("rechazado", "retirado")

router = APIRouter()


def _correo_institucion(db: Session, institucion_id: int | None) -> str | None:
    # Devuelve el correo con el que la institución se registró, para poder avisarle.
    if not institucion_id:
        return None
    user = (
        db.query(Usuario)
        .filter(Usuario.institucion_id == institucion_id, Usuario.rol == "institucion")
        .first()
    )
    return user.correo if user else None


def _enrich(insc: Inscripcion) -> InscripcionOut:
    out = InscripcionOut.model_validate(insc)
    if insc.club_equipo:
        out.club_equipo = insc.club_equipo  # type: ignore
    if insc.torneo:
        out.torneo = insc.torneo  # type: ignore
    return out


@router.get("/", response_model=list[InscripcionOut])
def get_all(torneo_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Inscripcion).options(
        joinedload(Inscripcion.club_equipo),
        joinedload(Inscripcion.torneo),
    )
    if torneo_id:
        q = q.filter(Inscripcion.torneo_id == torneo_id)
    return [_enrich(i) for i in q.all()]


@router.post("/", response_model=InscripcionOut, status_code=status.HTTP_201_CREATED)
def create(data: InscripcionCreate, db: Session = Depends(get_db), current: Usuario = Depends(get_current_user)):
    assert_inscripcion_allowed(
        torneo_id=data.torneo_id,
        club_equipo_id=data.club_equipo_id,
        current_user=current,
        db=db,
    )

    insc = Inscripcion(**data.model_dump())
    if current.rol == "admin":
        insc.estado = "aprobado"
    db.add(insc)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="El equipo ya está inscrito en este torneo")
    db.refresh(insc)
    db.refresh(insc, ["club_equipo", "torneo"])
    return _enrich(insc)


@router.patch("/{id}/aprobar", response_model=InscripcionOut)
def aprobar(
    id: int,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    insc = db.query(Inscripcion).options(
        joinedload(Inscripcion.club_equipo), joinedload(Inscripcion.torneo)
    ).filter(Inscripcion.id == id).first()
    if not insc:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    assert_inscripcion_admin_change_allowed(insc, db, action="aprobar")
    insc.estado = "aprobado"

    equipo = insc.club_equipo.nombre_equipo if insc.club_equipo else "Tu equipo"
    torneo = insc.torneo.nombre if insc.torneo else "el torneo"
    institucion_id = insc.club_equipo.institucion_id if insc.club_equipo else None

    # Aviso que la institución verá dentro del sistema, en su lista de notificaciones.
    if institucion_id:
        db.add(Notificacion(
            institucion_id=institucion_id,
            titulo="Inscripción aprobada",
            contenido=f"La inscripción de {equipo} a {torneo} fue aprobada. ¡Mucha suerte!",
        ))

    db.add(Auditoria(
        usuario_id=current_user.id,
        tabla_afectada="inscripciones",
        accion="UPDATE",
        valor_nuevo=f"inscripcion_id={id} aprobada",
    ))
    db.commit()

    # Además le enviamos un correo de confirmación. Se manda en segundo plano
    # para no demorar la respuesta; si el correo falla, la aprobación ya quedó guardada.
    correo = _correo_institucion(db, institucion_id)
    background.add_task(
        send_email,
        correo,
        "Inscripción aprobada — Olimpiadas Perú",
        f"Hola,\n\nTu inscripción de \"{equipo}\" al torneo \"{torneo}\" ha sido aprobada.\n"
        f"Ya puedes consultar el calendario y la tabla de posiciones en el portal.\n\n"
        f"— Olimpiadas Perú",
    )
    return _enrich(insc)


@router.patch("/{id}/rechazar", response_model=InscripcionOut)
def rechazar(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    insc = db.query(Inscripcion).options(
        joinedload(Inscripcion.club_equipo), joinedload(Inscripcion.torneo)
    ).filter(Inscripcion.id == id).first()
    if not insc:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    assert_inscripcion_admin_change_allowed(insc, db, action="rechazar")
    if insc.estado == "rechazado":
        raise HTTPException(status_code=409, detail="La inscripción ya está rechazada")
    if insc.estado in _ESTADOS_NO_ACTIVOS:
        raise HTTPException(status_code=400, detail=f"No se puede rechazar una inscripción en estado '{insc.estado}'")
    insc.estado = "rechazado"
    db.commit()
    return _enrich(insc)


@router.patch("/{id}/retirar", response_model=InscripcionOut)
def retirar(id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    insc = db.query(Inscripcion).options(
        joinedload(Inscripcion.club_equipo), joinedload(Inscripcion.torneo)
    ).filter(Inscripcion.id == id).first()
    if not insc:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    if insc.estado == "retirado":
        raise HTTPException(status_code=409, detail="El equipo ya está retirado")
    if insc.estado not in ("aprobado",):
        raise HTTPException(status_code=400, detail="Solo se pueden retirar inscripciones aprobadas")

    insc.estado = "retirado"

    # Aplicar W.O. a todos los partidos pendientes de esta inscripción
    partidos_pendientes = db.query(Partido).options(
        joinedload(Partido.local).joinedload(Inscripcion.club_equipo),
        joinedload(Partido.visitante).joinedload(Inscripcion.club_equipo),
    ).filter(
        ((Partido.inscripcion_local_id == id) | (Partido.inscripcion_visitante_id == id)),
        Partido.estado != "finalizado",
    ).all()

    equipo_nombre = insc.club_equipo.nombre_equipo if insc.club_equipo else f"Equipo #{insc.club_equipo_id}"

    for p in partidos_pendientes:
        apply_walkover(p, id)

        # Notificar a la institución rival usando relaciones ya cargadas
        rival_insc = p.visitante if p.inscripcion_local_id == id else p.local
        if rival_insc and rival_insc.club_equipo:
            db.add(Notificacion(
                institucion_id=rival_insc.club_equipo.institucion_id,
                partido_id=p.id,
                titulo="Partido ganado por W.O.",
                contenido=f"{equipo_nombre} se ha retirado del torneo. Tu equipo gana el partido por walkover (3-0).",
            ))

    db.add(Auditoria(
        usuario_id=current_user.id,
        tabla_afectada="inscripciones",
        accion="UPDATE",
        valor_nuevo=f"inscripcion_id={id} retirada, {len(partidos_pendientes)} partido(s) resueltos por W.O.",
    ))
    db.commit()
    db.refresh(insc)
    return _enrich(insc)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    insc = db.query(Inscripcion).options(joinedload(Inscripcion.torneo)).filter(Inscripcion.id == id).first()
    if not insc:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    assert_inscripcion_admin_change_allowed(insc, db, action="eliminar")
    db.delete(insc)
    db.commit()
