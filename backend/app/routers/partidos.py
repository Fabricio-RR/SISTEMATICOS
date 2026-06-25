"""
Router de Partidos.
- Programar fecha/hora/sede de un partido
- Registrar resultado final
- Registrar eventos (goles, tarjetas)
- Actualiza automáticamente la tabla de posiciones al finalizar
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.partidos import Partido
from app.models.inscripciones import Inscripcion
from app.models.club_equipo import ClubEquipo
from app.models.atleta_jugador import AtletaJugador
from app.models.eventos_partido import EventoPartido
from app.models.usuarios import Usuario
from app.core.deps import get_current_user, require_admin
from app.core import email as email_service

router = APIRouter()


# ── Schemas inline ────────────────────────────────────────────────────────────

class ProgramarPartidoInput(BaseModel):
    fecha_hora: datetime
    sede_id: int | None = None
    arbitro_id: int | None = None


class ResultadoInput(BaseModel):
    resultado_local: int
    resultado_visitante: int


class EventoInput(BaseModel):
    atleta_jugador_id: int | None = None
    tipo_evento: str   # gol, tarjeta_amarilla, tarjeta_roja, punto, etc.
    minuto: int | None = None
    descripcion: str | None = None


# ── Helpers: tabla de posiciones ─────────────────────────────────────────────

def _revertir_posiciones(db: Session, partido: Partido) -> None:
    """Revierte estadísticas cuando se corrige un resultado ya finalizado."""
    local_insc = partido.local
    visit_insc = partido.visitante
    if not local_insc or not visit_insc:
        return

    equipo_l: ClubEquipo = local_insc.club_equipo
    equipo_v: ClubEquipo = visit_insc.club_equipo
    rl = partido.resultado_local or 0
    rv = partido.resultado_visitante or 0

    equipo_l.partidos_jugados = max(0, (equipo_l.partidos_jugados or 0) - 1)
    equipo_v.partidos_jugados = max(0, (equipo_v.partidos_jugados or 0) - 1)

    if rl > rv:
        equipo_l.partidos_ganados = max(0, (equipo_l.partidos_ganados or 0) - 1)
        equipo_v.partidos_perdidos = max(0, (equipo_v.partidos_perdidos or 0) - 1)
        equipo_l.puntos = max(0, (equipo_l.puntos or 0) - 3)
    elif rv > rl:
        equipo_v.partidos_ganados = max(0, (equipo_v.partidos_ganados or 0) - 1)
        equipo_l.partidos_perdidos = max(0, (equipo_l.partidos_perdidos or 0) - 1)
        equipo_v.puntos = max(0, (equipo_v.puntos or 0) - 3)
    else:
        equipo_l.puntos = max(0, (equipo_l.puntos or 0) - 1)
        equipo_v.puntos = max(0, (equipo_v.puntos or 0) - 1)


def _actualizar_posiciones(db: Session, partido: Partido) -> None:
    """Actualiza puntos y estadísticas de los equipos al finalizar un partido."""
    local_insc = partido.local
    visit_insc = partido.visitante
    if not local_insc or not visit_insc:
        return

    equipo_l: ClubEquipo = local_insc.club_equipo
    equipo_v: ClubEquipo = visit_insc.club_equipo
    rl = partido.resultado_local or 0
    rv = partido.resultado_visitante or 0

    equipo_l.partidos_jugados = (equipo_l.partidos_jugados or 0) + 1
    equipo_v.partidos_jugados = (equipo_v.partidos_jugados or 0) + 1

    if rl > rv:
        equipo_l.partidos_ganados = (equipo_l.partidos_ganados or 0) + 1
        equipo_v.partidos_perdidos = (equipo_v.partidos_perdidos or 0) + 1
        equipo_l.puntos = (equipo_l.puntos or 0) + 3
    elif rv > rl:
        equipo_v.partidos_ganados = (equipo_v.partidos_ganados or 0) + 1
        equipo_l.partidos_perdidos = (equipo_l.partidos_perdidos or 0) + 1
        equipo_v.puntos = (equipo_v.puntos or 0) + 3
    else:
        # Empate
        equipo_l.puntos = (equipo_l.puntos or 0) + 1
        equipo_v.puntos = (equipo_v.puntos or 0) + 1


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/proximos")
def get_proximos(limit: int = 5, db: Session = Depends(get_db)):
    """Próximos partidos programados ordenados por fecha."""
    ahora = datetime.utcnow()
    partidos = (
        db.query(Partido)
        .options(
            joinedload(Partido.local).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.visitante).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.sede),
        )
        .filter(Partido.estado == "programado", Partido.fecha_hora >= ahora)
        .order_by(Partido.fecha_hora.asc())
        .limit(limit)
        .all()
    )
    return [_partido_out(p) for p in partidos]


@router.get("/en_curso")
def get_en_curso(db: Session = Depends(get_db)):
    """Partidos actualmente en curso."""
    partidos = (
        db.query(Partido)
        .options(
            joinedload(Partido.local).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.visitante).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.sede),
        )
        .filter(Partido.estado == "en_curso")
        .order_by(Partido.fecha_hora.asc())
        .all()
    )
    return [_partido_out(p) for p in partidos]


@router.get("/torneo/{torneo_id}")
def get_partidos_torneo(torneo_id: int, db: Session = Depends(get_db)):
    """Lista todos los partidos de un torneo."""
    from app.models.fixture import Fixture
    fixtures = db.query(Fixture).filter(Fixture.torneo_id == torneo_id).all()
    fixture_ids = [f.id for f in fixtures]
    partidos = (
        db.query(Partido)
        .options(
            joinedload(Partido.local).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.visitante).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.sede),
        )
        .filter(Partido.fixture_id.in_(fixture_ids))
        .order_by(Partido.fecha_hora.asc())
        .all()
    )
    return [_partido_out(p) for p in partidos]


@router.get("/mis-partidos")
def get_mis_partidos(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    """Devuelve los partidos de los equipos de la institución del usuario."""
    if not current_user.institucion_id:
        return []
    equipos = db.query(ClubEquipo).filter(ClubEquipo.institucion_id == current_user.institucion_id).all()
    equipo_ids = [e.id for e in equipos]
    inscripciones = db.query(Inscripcion).filter(Inscripcion.club_equipo_id.in_(equipo_ids)).all()
    insc_ids = [i.id for i in inscripciones]

    partidos = (
        db.query(Partido)
        .options(
            joinedload(Partido.local).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.visitante).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.sede),
        )
        .filter(
            (Partido.inscripcion_local_id.in_(insc_ids)) | (Partido.inscripcion_visitante_id.in_(insc_ids))
        )
        .order_by(Partido.fecha_hora.asc())
        .all()
    )
    return [_partido_out(p) for p in partidos]


@router.get("/{id}")
def get_partido(id: int, db: Session = Depends(get_db)):
    p = db.query(Partido).options(
        joinedload(Partido.local).joinedload(Inscripcion.club_equipo),
        joinedload(Partido.visitante).joinedload(Inscripcion.club_equipo),
        joinedload(Partido.sede),
        joinedload(Partido.eventos).joinedload(EventoPartido.atleta_jugador),
    ).filter(Partido.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return _partido_detalle_out(p)


@router.patch("/{id}/programar")
def programar(id: int, data: ProgramarPartidoInput, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    """Asigna fecha, hora y sede a un partido."""
    p = db.query(Partido).filter(Partido.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    if p.estado == "finalizado":
        raise HTTPException(status_code=400, detail="No se puede reprogramar un partido finalizado")

    p.fecha_hora = data.fecha_hora
    p.sede_id = data.sede_id
    p.arbitro_id = data.arbitro_id
    p.estado = "programado"
    db.commit()
    db.refresh(p)

    # Notificar a ambas instituciones por email
    _notificar_partido(db, p)

    return {"message": "Partido programado", "id": p.id, "fecha_hora": p.fecha_hora.isoformat()}


@router.patch("/{id}/resultado")
def registrar_resultado(id: int, data: ResultadoInput, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    """Registra el resultado final de un partido y actualiza posiciones."""
    p = (
        db.query(Partido)
        .options(
            joinedload(Partido.local).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.visitante).joinedload(Inscripcion.club_equipo),
        )
        .filter(Partido.id == id)
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    if p.estado == "finalizado":
        # Corrección: revertir estadísticas del resultado anterior antes de aplicar el nuevo
        _revertir_posiciones(db, p)
    elif p.fecha_hora and p.fecha_hora > datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail=f"El partido aún no ha comenzado (programado: {p.fecha_hora.strftime('%d/%m/%Y %H:%M')} UTC). Solo se puede registrar resultado de partidos en curso o finalizados."
        )

    p.resultado_local = data.resultado_local
    p.resultado_visitante = data.resultado_visitante
    p.estado = "finalizado"

    _actualizar_posiciones(db, p)
    db.commit()

    # Notificar resultado por email
    _notificar_resultado(db, p)

    return {
        "message": "Resultado registrado",
        "resultado": f"{data.resultado_local} - {data.resultado_visitante}",
    }


@router.post("/{id}/eventos", status_code=status.HTTP_201_CREATED)
def agregar_evento(id: int, data: EventoInput, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    """Agrega un evento (gol, tarjeta, punto) a un partido."""
    p = db.query(Partido).filter(Partido.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    evento = EventoPartido(
        partido_id=id,
        atleta_jugador_id=data.atleta_jugador_id,
        tipo_evento=data.tipo_evento,
        minuto=data.minuto,
        descripcion=data.descripcion,
    )
    db.add(evento)

    # Actualizar estadísticas individuales del atleta
    if data.atleta_jugador_id:
        atleta = db.query(AtletaJugador).filter(AtletaJugador.id == data.atleta_jugador_id).first()
        if atleta:
            if data.tipo_evento in ("gol", "punto", "enceste"):
                atleta.goles_anotados = (atleta.goles_anotados or 0) + 1
            elif data.tipo_evento == "tarjeta_amarilla":
                atleta.tarjetas_amarillas = (atleta.tarjetas_amarillas or 0) + 1
            elif data.tipo_evento == "tarjeta_roja":
                atleta.tarjetas_rojas = (atleta.tarjetas_rojas or 0) + 1

    db.commit()
    return {"message": "Evento registrado", "tipo": data.tipo_evento}


@router.get("/{id}/eventos")
def get_eventos(id: int, db: Session = Depends(get_db)):
    eventos = (
        db.query(EventoPartido)
        .options(joinedload(EventoPartido.atleta_jugador))
        .filter(EventoPartido.partido_id == id)
        .order_by(EventoPartido.minuto.is_(None), EventoPartido.minuto.asc())
        .all()
    )
    return [
        {
            "id": e.id,
            "tipo_evento": e.tipo_evento,
            "minuto": e.minuto,
            "descripcion": e.descripcion,
            "atleta": e.atleta_jugador.nombre_completo if e.atleta_jugador else None,
        }
        for e in eventos
    ]


# ── Helpers de serialización y notificación ───────────────────────────────────

def _partido_out(p: Partido) -> dict:
    local = p.local.club_equipo if p.local else None
    visitante = p.visitante.club_equipo if p.visitante else None
    sede_nombre = p.sede.nombre_sede if p.sede else None
    return {
        "id": p.id,
        "fixture_id": p.fixture_id,
        "ronda": p.ronda,
        "estado": p.estado,
        "fecha_hora": p.fecha_hora.isoformat() if p.fecha_hora else None,
        "sede_id": p.sede_id,
        "sede_nombre": sede_nombre,
        "resultado_local": p.resultado_local,
        "resultado_visitante": p.resultado_visitante,
        "local": {
            "id": local.id,
            "nombre": local.nombre_equipo,
            "pais": local.pais_asignado,
            "pais_emoji": local.pais_emoji,
        } if local else None,
        "visitante": {
            "id": visitante.id,
            "nombre": visitante.nombre_equipo,
            "pais": visitante.pais_asignado,
            "pais_emoji": visitante.pais_emoji,
        } if visitante else None,
    }


def _partido_detalle_out(p: Partido) -> dict:
    base = _partido_out(p)
    base["eventos"] = [
        {
            "id": e.id,
            "tipo_evento": e.tipo_evento,
            "minuto": e.minuto,
            "descripcion": e.descripcion,
            "atleta": e.atleta_jugador.nombre_completo if e.atleta_jugador else None,
        }
        for e in p.eventos
    ]
    return base


def _notificar_partido(db: Session, p: Partido) -> None:
    """Envía email a representantes de ambas instituciones cuando se programa un partido."""
    try:
        local_eq = p.local.club_equipo if p.local else None
        visit_eq = p.visitante.club_equipo if p.visitante else None
        if not local_eq or not visit_eq:
            return

        deporte = local_eq.deporte.nombre if local_eq.deporte else "Deporte"
        sede = p.sede.nombre_sede if p.sede else "Por confirmar"
        fecha_str = p.fecha_hora.strftime("%d/%m/%Y %H:%M") if p.fecha_hora else "Por confirmar"

        for inst_id in {local_eq.institucion_id, visit_eq.institucion_id}:
            usuario = db.query(Usuario).filter(
                Usuario.institucion_id == inst_id, Usuario.esta_activo == True
            ).first()
            if usuario:
                email_service.enviar_partido_programado(
                    correo=usuario.correo,
                    nombre=f"{usuario.nombres} {usuario.apellidos}",
                    equipo_local=local_eq.nombre_equipo,
                    equipo_visitante=visit_eq.nombre_equipo,
                    fecha_hora=fecha_str,
                    sede=sede,
                    deporte=deporte,
                )
    except Exception as e:
        print(f"[NOTIFY] Error al notificar partido: {e}")


def _notificar_resultado(db: Session, p: Partido) -> None:
    """Envía email a representantes de ambas instituciones con el resultado."""
    try:
        local_eq = p.local.club_equipo if p.local else None
        visit_eq = p.visitante.club_equipo if p.visitante else None
        if not local_eq or not visit_eq:
            return

        deporte = local_eq.deporte.nombre if local_eq.deporte else "Deporte"

        for inst_id in {local_eq.institucion_id, visit_eq.institucion_id}:
            usuario = db.query(Usuario).filter(
                Usuario.institucion_id == inst_id, Usuario.esta_activo == True
            ).first()
            if usuario:
                email_service.enviar_resultado(
                    correo=usuario.correo,
                    nombre=f"{usuario.nombres} {usuario.apellidos}",
                    equipo_local=local_eq.nombre_equipo,
                    equipo_visitante=visit_eq.nombre_equipo,
                    resultado_local=p.resultado_local or 0,
                    resultado_visitante=p.resultado_visitante or 0,
                    deporte=deporte,
                )
    except Exception as e:
        print(f"[NOTIFY] Error al notificar resultado: {e}")
