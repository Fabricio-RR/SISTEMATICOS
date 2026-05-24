from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.inscripciones import Inscripcion
from app.models.atleta_jugador import AtletaJugador
from app.models.torneos import Torneo
from app.schemas.estadisticas import PosicionTabla, Goleador

router = APIRouter()


@router.get("/tabla", response_model=list[PosicionTabla])
def tabla_posiciones(torneo_id: int, db: Session = Depends(get_db)):
    if not db.query(Torneo).filter(Torneo.id == torneo_id).first():
        raise HTTPException(status_code=404, detail="Torneo no encontrado")

    diferencia = Inscripcion.goles_a_favor - Inscripcion.goles_en_contra

    inscripciones = (
        db.query(Inscripcion)
        .options(joinedload(Inscripcion.club_equipo))
        .filter(Inscripcion.torneo_id == torneo_id, Inscripcion.estado == "aprobado")
        .order_by(
            Inscripcion.puntos.desc(),
            diferencia.desc(),
            Inscripcion.goles_a_favor.desc(),
            Inscripcion.partidos_ganados.desc(),
            Inscripcion.id.asc(),
        )
        .all()
    )

    return [
        PosicionTabla(
            posicion=i + 1,
            equipo_id=insc.club_equipo_id,
            nombre_equipo=insc.club_equipo.nombre_equipo if insc.club_equipo else "—",
            puntos=insc.puntos,
            partidos_jugados=insc.partidos_jugados,
            partidos_ganados=insc.partidos_ganados,
            partidos_empatados=insc.partidos_empatados,
            partidos_perdidos=insc.partidos_perdidos,
            goles_a_favor=insc.goles_a_favor,
            goles_en_contra=insc.goles_en_contra,
            diferencia_goles=insc.goles_a_favor - insc.goles_en_contra,
        )
        for i, insc in enumerate(inscripciones)
    ]


def _etiqueta_deporte(nombre_deporte: str) -> str:
    n = nombre_deporte.lower()
    if "fútbol" in n or "futbol" in n:
        return "Goles"
    return "Puntos"


@router.get("/goleadores", response_model=list[Goleador])
def goleadores(torneo_id: int, limit: int = 10, db: Session = Depends(get_db)):
    from sqlalchemy import func
    from app.models.eventos_partido import EventoPartido
    from app.models.partidos import Partido
    from app.models.fixture import Fixture

    torneo = db.query(Torneo).options(joinedload(Torneo.deporte)).filter(Torneo.id == torneo_id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")

    deporte = torneo.deporte
    es_futbol = deporte and ("fútbol" in deporte.nombre.lower() or "futbol" in deporte.nombre.lower())
    etiqueta = "Goles" if es_futbol else "Puntos"
    tipo_gol = "gol" if es_futbol else "puntos"

    # Dynamic aggregation of goals/points grouped by athlete
    goleadores_query = (
        db.query(
            AtletaJugador,
            func.count(EventoPartido.id).label("total_goles")
        )
        .join(EventoPartido, AtletaJugador.id == EventoPartido.atleta_jugador_id)
        .join(Partido, EventoPartido.partido_id == Partido.id)
        .join(Fixture, Partido.fixture_id == Fixture.id)
        .filter(Fixture.torneo_id == torneo_id)
        .filter(EventoPartido.tipo_evento == tipo_gol)
        .group_by(AtletaJugador.id)
        .order_by(func.count(EventoPartido.id).desc())
        .limit(limit)
        .all()
    )

    if not goleadores_query:
        return []

    goleador_ids = [a.id for a, _ in goleadores_query]

    # Query cards count for these top scorers in this tournament
    cards_map = {}
    if goleador_ids:
        cards_query = (
            db.query(
                EventoPartido.atleta_jugador_id,
                EventoPartido.tipo_evento,
                func.count(EventoPartido.id).label("count")
            )
            .join(Partido, EventoPartido.partido_id == Partido.id)
            .join(Fixture, Partido.fixture_id == Fixture.id)
            .filter(Fixture.torneo_id == torneo_id)
            .filter(EventoPartido.atleta_jugador_id.in_(goleador_ids))
            .filter(EventoPartido.tipo_evento.in_(["tarjeta_amarilla", "tarjeta_roja"]))
            .group_by(EventoPartido.atleta_jugador_id, EventoPartido.tipo_evento)
            .all()
        )
        for atleta_id, tipo, count in cards_query:
            if atleta_id not in cards_map:
                cards_map[atleta_id] = {"tarjeta_amarilla": 0, "tarjeta_roja": 0}
            cards_map[atleta_id][tipo] = count

    return [
        Goleador(
            posicion=i + 1,
            atleta_id=a.id,
            nombre_completo=a.nombre_completo,
            nombre_equipo=a.club_equipo.nombre_equipo if a.club_equipo else "—",
            goles=total_goles,
            tarjetas_amarillas=cards_map.get(a.id, {}).get("tarjeta_amarilla", 0),
            tarjetas_rojas=cards_map.get(a.id, {}).get("tarjeta_roja", 0),
            etiqueta=etiqueta,
        )
        for i, (a, total_goles) in enumerate(goleadores_query)
    ]

