"""
Router de Estadísticas.
- Tabla de posiciones por torneo
- Ranking de goleadores/encestadores por torneo/deporte
- Resumen general del sistema
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models.club_equipo import ClubEquipo
from app.models.atleta_jugador import AtletaJugador
from app.models.inscripciones import Inscripcion
from app.models.partidos import Partido
from app.models.fixture import Fixture
from app.models.torneos import Torneo
from app.models.instituciones import Institucion
from app.models.eventos_partido import EventoPartido

router = APIRouter()


@router.get("/torneo/{torneo_id}/posiciones")
def tabla_posiciones(torneo_id: int, db: Session = Depends(get_db)):
    """Tabla de posiciones de un torneo ordenada por puntos y partidos ganados."""
    inscripciones = (
        db.query(Inscripcion)
        .options(
            joinedload(Inscripcion.club_equipo).joinedload(ClubEquipo.institucion),
            joinedload(Inscripcion.grupo),
        )
        .filter(Inscripcion.torneo_id == torneo_id, Inscripcion.estado == "aprobado")
        .all()
    )

    resultado = []
    for insc in inscripciones:
        eq = insc.club_equipo
        resultado.append({
            "equipo_id": eq.id,
            "nombre_equipo": eq.nombre_equipo,
            "institucion": eq.institucion.nombre if eq.institucion else "",
            "pais": eq.pais_asignado or "",
            "pais_emoji": eq.pais_emoji or "",
            "grupo": insc.grupo.nombre_grupo if insc.grupo else "—",
            "pj": eq.partidos_jugados or 0,
            "pg": eq.partidos_ganados or 0,
            "pp": eq.partidos_perdidos or 0,
            "pe": (eq.partidos_jugados or 0) - (eq.partidos_ganados or 0) - (eq.partidos_perdidos or 0),
            "puntos": eq.puntos or 0,
        })

    resultado.sort(key=lambda x: (-x["puntos"], -x["pg"], -x["pj"]))
    for i, r in enumerate(resultado):
        r["posicion"] = i + 1

    return resultado


@router.get("/torneo/{torneo_id}/goleadores")
def goleadores(torneo_id: int, db: Session = Depends(get_db)):
    """Ranking de goleadores/encestadores del torneo."""
    inscripciones = db.query(Inscripcion).filter(
        Inscripcion.torneo_id == torneo_id, Inscripcion.estado == "aprobado"
    ).all()
    equipo_ids = [i.club_equipo_id for i in inscripciones]

    atletas = (
        db.query(AtletaJugador)
        .options(joinedload(AtletaJugador.club_equipo).joinedload(ClubEquipo.institucion))
        .filter(
            AtletaJugador.club_equipo_id.in_(equipo_ids),
            AtletaJugador.goles_anotados > 0,
            AtletaJugador.estado == "activo",
        )
        .order_by(AtletaJugador.goles_anotados.desc())
        .limit(20)
        .all()
    )

    return [
        {
            "posicion": i + 1,
            "atleta_id": a.id,
            "nombre": a.nombre_completo,
            "equipo": a.club_equipo.nombre_equipo if a.club_equipo else "",
            "institucion": a.club_equipo.institucion.nombre if a.club_equipo and a.club_equipo.institucion else "",
            "goles": a.goles_anotados,
            "tarjetas_amarillas": a.tarjetas_amarillas,
            "tarjetas_rojas": a.tarjetas_rojas,
        }
        for i, a in enumerate(atletas)
    ]


@router.get("/torneo/{torneo_id}/disciplina")
def tabla_disciplina(torneo_id: int, db: Session = Depends(get_db)):
    """Ranking de jugadores con más tarjetas en el torneo."""
    inscripciones = db.query(Inscripcion).filter(
        Inscripcion.torneo_id == torneo_id, Inscripcion.estado == "aprobado"
    ).all()
    equipo_ids = [i.club_equipo_id for i in inscripciones]

    atletas = (
        db.query(AtletaJugador)
        .options(joinedload(AtletaJugador.club_equipo))
        .filter(
            AtletaJugador.club_equipo_id.in_(equipo_ids),
            (AtletaJugador.tarjetas_amarillas + AtletaJugador.tarjetas_rojas) > 0,
        )
        .order_by(
            (AtletaJugador.tarjetas_rojas * 2 + AtletaJugador.tarjetas_amarillas).desc()
        )
        .limit(20)
        .all()
    )

    return [
        {
            "posicion": i + 1,
            "nombre": a.nombre_completo,
            "equipo": a.club_equipo.nombre_equipo if a.club_equipo else "",
            "tarjetas_amarillas": a.tarjetas_amarillas,
            "tarjetas_rojas": a.tarjetas_rojas,
        }
        for i, a in enumerate(atletas)
    ]


@router.get("/resumen")
def resumen_general(db: Session = Depends(get_db)):
    """Estadísticas generales del sistema (para el dashboard)."""
    total_instituciones = db.query(func.count(Institucion.id)).filter(Institucion.estado == "activo").scalar()
    total_torneos = db.query(func.count(Torneo.id)).scalar()
    total_equipos = db.query(func.count(ClubEquipo.id)).scalar()
    total_atletas = db.query(func.count(AtletaJugador.id)).filter(AtletaJugador.estado == "activo").scalar()
    total_partidos = db.query(func.count(Partido.id)).scalar()
    partidos_jugados = db.query(func.count(Partido.id)).filter(Partido.estado == "finalizado").scalar()
    partidos_pendientes = db.query(func.count(Partido.id)).filter(Partido.estado == "programado").scalar()
    partidos_en_curso = db.query(func.count(Partido.id)).filter(Partido.estado == "en_curso").scalar()

    return {
        "instituciones": total_instituciones,
        "torneos": total_torneos,
        "equipos": total_equipos,
        "atletas": total_atletas,
        "partidos_total": total_partidos,
        "partidos_jugados": partidos_jugados,
        "partidos_pendientes": partidos_pendientes,
        "partidos_en_curso": partidos_en_curso,
    }


@router.get("/torneo/{torneo_id}/faltas")
def faltas_torneo(torneo_id: int, db: Session = Depends(get_db)):
    """Ranking de jugadores con más faltas en el torneo (desde EventoPartido)."""
    rows = (
        db.query(AtletaJugador, func.count(EventoPartido.id).label("cnt"))
        .join(EventoPartido, EventoPartido.atleta_jugador_id == AtletaJugador.id)
        .join(Partido, EventoPartido.partido_id == Partido.id)
        .join(Fixture, Partido.fixture_id == Fixture.id)
        .filter(Fixture.torneo_id == torneo_id, EventoPartido.tipo_evento == "falta")
        .options(joinedload(AtletaJugador.club_equipo))
        .group_by(AtletaJugador.id)
        .order_by(func.count(EventoPartido.id).desc())
        .limit(10)
        .all()
    )
    return [
        {
            "posicion": i + 1,
            "atleta_id": a.id,
            "nombre": a.nombre_completo,
            "equipo": a.club_equipo.nombre_equipo if a.club_equipo else "",
            "faltas": cnt,
        }
        for i, (a, cnt) in enumerate(rows)
    ]


@router.get("/resumen-instituciones")
def resumen_instituciones(db: Session = Depends(get_db)):
    """Ranking de instituciones por atletas registrados."""
    instituciones = db.query(Institucion).filter(Institucion.estado == "activo").all()
    result = []
    for inst in instituciones:
        equipo_ids = [
            e.id for e in db.query(ClubEquipo.id).filter(ClubEquipo.institucion_id == inst.id).all()
        ]
        total_atletas = db.query(func.count(AtletaJugador.id)).filter(
            AtletaJugador.club_equipo_id.in_(equipo_ids),
            AtletaJugador.estado == "activo",
        ).scalar() if equipo_ids else 0
        total_inscripciones = db.query(func.count(Inscripcion.id)).filter(
            Inscripcion.club_equipo_id.in_(equipo_ids),
            Inscripcion.estado == "aprobado",
        ).scalar() if equipo_ids else 0
        result.append({
            "institucion_id": inst.id,
            "nombre": inst.nombre,
            "nombre_corto": inst.nombre_corto or inst.nombre,
            "pais": inst.pais_asignado or "",
            "pais_emoji": inst.pais_emoji or "",
            "total_equipos": len(equipo_ids),
            "total_atletas": total_atletas,
            "total_inscripciones": total_inscripciones,
        })
    result.sort(key=lambda x: -x["total_atletas"])
    return result


@router.get("/deporte/{deporte_id}/goleadores")
def goleadores_por_deporte(deporte_id: int, db: Session = Depends(get_db)):
    """Ranking global de goleadores de un deporte (todos los torneos)."""
    equipos = db.query(ClubEquipo).filter(ClubEquipo.deporte_id == deporte_id).all()
    equipo_ids = [e.id for e in equipos]

    atletas = (
        db.query(AtletaJugador)
        .options(joinedload(AtletaJugador.club_equipo).joinedload(ClubEquipo.institucion))
        .filter(
            AtletaJugador.club_equipo_id.in_(equipo_ids),
            AtletaJugador.goles_anotados > 0,
            AtletaJugador.estado == "activo",
        )
        .order_by(AtletaJugador.goles_anotados.desc())
        .limit(20)
        .all()
    )

    return [
        {
            "posicion": i + 1,
            "nombre": a.nombre_completo,
            "equipo": a.club_equipo.nombre_equipo if a.club_equipo else "",
            "goles": a.goles_anotados,
        }
        for i, a in enumerate(atletas)
    ]
