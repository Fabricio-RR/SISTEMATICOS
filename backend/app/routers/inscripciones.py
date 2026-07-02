from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.inscripciones import Inscripcion
from app.models.partidos import Partido
from app.models.auditoria import Auditoria
from app.schemas.inscripciones import InscripcionCreate, InscripcionOut
from app.core.deps import require_admin, get_current_user
from app.models.usuarios import Usuario
from app.services.competition import apply_walkover
from app.services.notify import notify_institucion
from app.services.enrollment import (
    assert_inscripcion_admin_change_allowed,
    assert_inscripcion_allowed,
)

_ESTADOS_NO_ACTIVOS = ("rechazado", "retirado")

router = APIRouter()


def _enrich(insc: Inscripcion) -> InscripcionOut:
    out = InscripcionOut.model_validate(insc)
    if insc.club_equipo:
        out.club_equipo = insc.club_equipo  # type: ignore
    if insc.torneo:
        out.torneo = insc.torneo  # type: ignore
    return out


@router.get("/", response_model=list[InscripcionOut])
def get_all(
    torneo_id: int | None = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    # Requiere sesión: las inscripciones son datos de gestión (no del portal público).
    q = db.query(Inscripcion).options(
        joinedload(Inscripcion.club_equipo),
        joinedload(Inscripcion.torneo),
    )
    if torneo_id:
        q = q.filter(Inscripcion.torneo_id == torneo_id)
    return [_enrich(i) for i in q.all()]


@router.post("/", response_model=InscripcionOut, status_code=status.HTTP_201_CREATED)
def create(data: InscripcionCreate, background: BackgroundTasks, db: Session = Depends(get_db), current: Usuario = Depends(get_current_user)):
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

    # Avisamos a la institución (in-app + correo). El mensaje depende de quién
    # inscribe: si lo hace la propia institución, queda "pendiente de aprobación";
    # si lo hace el admin, la inscripción ya nace aprobada.
    if insc.club_equipo:
        equipo = insc.club_equipo.nombre_equipo
        torneo = insc.torneo.nombre if insc.torneo else "el torneo"
        if insc.estado == "aprobado":
            notify_institucion(
                db,
                background,
                insc.club_equipo.institucion_id,
                "Inscripción aprobada",
                f"La inscripción de {equipo} a {torneo} fue aprobada. ¡Mucha suerte!",
                cuerpo_email=(
                    f"¡Buenas noticias!\n\n"
                    f"La inscripción de su equipo {equipo} al torneo {torneo} fue aprobada. "
                    f"Ya pueden consultar el calendario y la tabla de posiciones en el portal.\n\n"
                    f"¡Mucha suerte en la competencia!\n\n— El equipo de Olimpiadas Perú"
                ),
            )
        else:
            notify_institucion(
                db,
                background,
                insc.club_equipo.institucion_id,
                "Inscripción recibida",
                f"Recibimos la inscripción de {equipo} a {torneo}. Está pendiente de aprobación.",
                cuerpo_email=(
                    f"¡Hola!\n\n"
                    f"Recibimos la inscripción de su equipo {equipo} al torneo {torneo}. "
                    f"Ya está en revisión y les avisaremos apenas el administrador la apruebe.\n\n"
                    f"¡Gracias por participar!\n\n— El equipo de Olimpiadas Perú"
                ),
            )
        db.commit()

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

    # Aviso in-app + correo de confirmación (ambos canales en una sola llamada).
    notify_institucion(
        db,
        background,
        institucion_id,
        "Inscripción aprobada",
        f"La inscripción de {equipo} a {torneo} fue aprobada. ¡Mucha suerte!",
        cuerpo_email=(
            f"¡Buenas noticias!\n\n"
            f"La inscripción de su equipo {equipo} al torneo {torneo} fue aprobada. "
            f"Ya pueden consultar el calendario y la tabla de posiciones en el portal.\n\n"
            f"¡Mucha suerte en la competencia!\n\n— El equipo de Olimpiadas Perú"
        ),
    )

    db.add(Auditoria(
        usuario_id=current_user.id,
        tabla_afectada="inscripciones",
        accion="UPDATE",
        valor_nuevo=f"inscripcion_id={id} aprobada",
    ))
    db.commit()
    return _enrich(insc)


@router.patch("/{id}/rechazar", response_model=InscripcionOut)
def rechazar(
    id: int,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
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

    equipo = insc.club_equipo.nombre_equipo if insc.club_equipo else "Tu equipo"
    torneo = insc.torneo.nombre if insc.torneo else "el torneo"
    institucion_id = insc.club_equipo.institucion_id if insc.club_equipo else None

    # Espejo de "aprobar": la institución también se entera si su inscripción se rechaza.
    notify_institucion(
        db,
        background,
        institucion_id,
        "Inscripción rechazada",
        f"La inscripción de {equipo} a {torneo} fue rechazada.",
        cuerpo_email=(
            f"Hola,\n\n"
            f"Lamentamos informarles que la inscripción de su equipo {equipo} al torneo "
            f"{torneo} no fue aprobada. Si creen que se trata de un error, pueden "
            f"comunicarse con el administrador del torneo.\n\n— El equipo de Olimpiadas Perú"
        ),
    )
    db.commit()
    return _enrich(insc)


@router.patch("/{id}/retirar", response_model=InscripcionOut)
def retirar(id: int, background: BackgroundTasks, db: Session = Depends(get_db), current_user: Usuario = Depends(require_admin)):
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
    torneo_nombre = insc.torneo.nombre if insc.torneo else "el torneo"

    # Avisamos al propio equipo retirado (in-app + correo).
    if insc.club_equipo:
        notify_institucion(
            db,
            background,
            insc.club_equipo.institucion_id,
            "Equipo retirado del torneo",
            f"{equipo_nombre} fue retirado de {torneo_nombre}. Sus partidos pendientes se dan por perdidos (W.O.).",
            cuerpo_email=(
                f"Hola,\n\n"
                f"Les informamos que su equipo {equipo_nombre} fue retirado del torneo {torneo_nombre}. "
                f"Sus partidos pendientes se resolverán como derrota por walkover.\n\n"
                f"Si creen que se trata de un error, comuníquense con el administrador del torneo.\n\n"
                f"— El equipo de Olimpiadas Perú"
            ),
        )

    for p in partidos_pendientes:
        apply_walkover(p, id)

        # Notificar a la institución rival (in-app + correo): gana por W.O.
        rival_insc = p.visitante if p.inscripcion_local_id == id else p.local
        if rival_insc and rival_insc.club_equipo:
            rival_equipo = rival_insc.club_equipo.nombre_equipo
            notify_institucion(
                db,
                background,
                rival_insc.club_equipo.institucion_id,
                "Partido ganado por W.O.",
                f"{equipo_nombre} se retiró del torneo. Su equipo gana el partido por walkover (3-0).",
                cuerpo_email=(
                    f"¡Buenas noticias!\n\n"
                    f"El equipo {equipo_nombre} se retiró del torneo, por lo que su equipo "
                    f"{rival_equipo} gana por walkover (3-0) el partido que tenían programado.\n\n"
                    f"Pueden ver el resultado actualizado en el portal.\n\n"
                    f"— El equipo de Olimpiadas Perú"
                ),
                partido_id=p.id,
            )

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
