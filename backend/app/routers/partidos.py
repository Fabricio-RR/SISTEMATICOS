import json
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.partidos import Partido
from app.models.fixture import Fixture
from app.models.inscripciones import Inscripcion
from app.models.torneos import Torneo
from app.models.auditoria import Auditoria
from app.models.notificaciones import Notificacion
from app.models.eventos_partido import EventoPartido
from app.models.atleta_jugador import AtletaJugador
from app.schemas.partidos import PartidoUpdate, ResultadoUpdate, PartidoOut
from app.core.deps import require_admin, require_admin_or_arbitro
from app.models.usuarios import Usuario
from app.services.competition import apply_result_change, recalculate_atleta_stats
from app.services.email import send_email

router = APIRouter()


def _load_partido(partido_id: int, db: Session) -> Partido | None:
    return (
        db.query(Partido)
        .options(
            joinedload(Partido.fixture).joinedload(Fixture.torneo),
            joinedload(Partido.local).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.visitante).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.sede),
            joinedload(Partido.eventos),
        )
        .filter(Partido.id == partido_id)
        .first()
    )


def _build_out(p: Partido) -> PartidoOut:
    out = PartidoOut.model_validate(p)
    if p.local:
        if p.local.club_equipo:
            out.local_nombre = p.local.club_equipo.nombre_equipo
        out.local_club_equipo_id = p.local.club_equipo_id
    if p.visitante:
        if p.visitante.club_equipo:
            out.visitante_nombre = p.visitante.club_equipo.nombre_equipo
        out.visitante_club_equipo_id = p.visitante.club_equipo_id
    if p.fixture:
        out.jornada = p.fixture.jornada
        if p.fixture.torneo:
            out.torneo_nombre = p.fixture.torneo.nombre
    if p.sede:
        out.sede_nombre = p.sede.nombre_sede
    return out


def _get_all_query(db: Session):
    return (
        db.query(Partido)
        .options(
            joinedload(Partido.fixture).joinedload(Fixture.torneo),
            joinedload(Partido.local).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.visitante).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.sede),
            joinedload(Partido.eventos),
        )
    )


@router.get("/", response_model=list[PartidoOut])
def get_all(
    torneo_id: int | None = None,
    deporte_id: int | None = None,
    estado: str | None = None,
    torneo_estado: str | None = None,
    db: Session = Depends(get_db),
):
    q = _get_all_query(db)
    if torneo_id:
        q = q.join(Fixture).filter(Fixture.torneo_id == torneo_id)
    elif deporte_id:
        q = q.join(Fixture).join(Torneo, Fixture.torneo_id == Torneo.id).filter(Torneo.deporte_id == deporte_id)
    if torneo_estado:
        q = q.join(Fixture).join(Torneo, Fixture.torneo_id == Torneo.id).filter(Torneo.estado == torneo_estado)
    if estado:
        q = q.filter(Partido.estado == estado)
    return [_build_out(p) for p in q.all()]


@router.get("/{id}", response_model=PartidoOut)
def get_by_id(id: int, db: Session = Depends(get_db)):
    p = _load_partido(id, db)
    if not p:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return _build_out(p)


@router.patch("/{id}", response_model=PartidoOut)
def update(
    id: int,
    data: PartidoUpdate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    p = _load_partido(id, db)
    if not p:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    if data.estado == "finalizado":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Para finalizar un partido y registrar estadísticas usa el endpoint /resultado.",
        )
    if p.estado == "finalizado" and data.estado is not None and data.estado != "finalizado":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede revertir el estado de un partido finalizado. Los puntos ya fueron contabilizados.",
        )

    es_reprogramacion = (
        data.fecha_hora is not None
        and data.motivo_reprogramacion
        and p.fecha_hora != data.fecha_hora
    )

    payload = data.model_dump(exclude_none=True)
    payload.pop("motivo_reprogramacion", None)
    for field, val in payload.items():
        setattr(p, field, val)

    if es_reprogramacion:
        p.motivo_reprogramacion = data.motivo_reprogramacion
        p.reprogramado_en = datetime.now(timezone.utc)
        _crear_notificaciones_reprogramacion(p, data.motivo_reprogramacion, db, background)

    db.commit()
    return _build_out(_load_partido(id, db))


def _crear_notificaciones_reprogramacion(
    p: Partido, motivo: str, db: Session, background: BackgroundTasks
) -> None:
    instituciones: set[int] = set()
    for insc in (p.local, p.visitante):
        if insc and insc.club_equipo:
            instituciones.add(insc.club_equipo.institucion_id)

    local_nombre = p.local.club_equipo.nombre_equipo if p.local and p.local.club_equipo else "Local"
    visit_nombre = p.visitante.club_equipo.nombre_equipo if p.visitante and p.visitante.club_equipo else "Visitante"
    fecha_str = p.fecha_hora.strftime("%d/%m/%Y %H:%M") if p.fecha_hora else "por confirmar"
    mensaje = f"{local_nombre} vs {visit_nombre} ha sido reprogramado para el {fecha_str}. Motivo: {motivo}"

    for inst_id in instituciones:
        db.add(Notificacion(
            institucion_id=inst_id,
            partido_id=p.id,
            titulo="Partido reprogramado",
            contenido=mensaje,
        ))
        # El mismo aviso, pero por correo. Se envía en segundo plano y si falla
        # no afecta a la reprogramación del partido.
        correo = (
            db.query(Usuario.correo)
            .filter(Usuario.institucion_id == inst_id, Usuario.rol == "institucion")
            .scalar()
        )
        background.add_task(send_email, correo, "Partido reprogramado — Olimpiadas Perú", mensaje)


@router.patch("/{id}/resultado", response_model=PartidoOut)
def set_resultado(id: int, data: ResultadoUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_admin_or_arbitro)):
    p = _load_partido(id, db)
    if not p:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    torneo = p.fixture.torneo if p.fixture else None
    if torneo and torneo.estado not in ("en_curso", "finalizado"):
        raise HTTPException(
            status_code=400,
            detail=f"No se pueden registrar resultados. El torneo está en estado '{torneo.estado}'.",
        )

    apply_result_change(
        p,
        data.resultado_local,
        data.resultado_visitante,
        torneo=torneo,
    )

    if data.eventos is not None:
        old_atleta_ids = {
            row[0]
            for row in db.query(EventoPartido.atleta_jugador_id)
            .filter(EventoPartido.partido_id == p.id, EventoPartido.atleta_jugador_id.isnot(None))
            .all()
        }

        db.query(EventoPartido).filter(EventoPartido.partido_id == p.id).delete()

        new_atleta_ids: set[int] = set()
        for ev in data.eventos:
            atleta = db.query(AtletaJugador).filter(AtletaJugador.id == ev.atleta_jugador_id).first()
            if not atleta:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Atleta con ID {ev.atleta_jugador_id} no encontrado.",
                )
            valid_team_ids = []
            if p.local and p.local.club_equipo_id:
                valid_team_ids.append(p.local.club_equipo_id)
            if p.visitante and p.visitante.club_equipo_id:
                valid_team_ids.append(p.visitante.club_equipo_id)
            if atleta.club_equipo_id not in valid_team_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El atleta {atleta.nombre_completo} no pertenece a los equipos de este partido.",
                )
            db_ev = EventoPartido(
                partido_id=p.id,
                atleta_jugador_id=ev.atleta_jugador_id,
                tipo_evento=ev.tipo_evento,
                minuto=ev.minuto,
                descripcion=ev.descripcion,
            )
            db.add(db_ev)
            if ev.atleta_jugador_id:
                new_atleta_ids.add(ev.atleta_jugador_id)

        db.flush()
        recalculate_atleta_stats(db, list(old_atleta_ids | new_atleta_ids))

    db.add(Auditoria(
        usuario_id=current_user.id,
        tabla_afectada="partidos",
        accion="UPDATE",
        valor_nuevo=json.dumps({"partido_id": p.id, "resultado_local": p.resultado_local, "resultado_visitante": p.resultado_visitante}),
    ))

    db.commit()
    return _build_out(_load_partido(id, db))
