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

    inscripciones = (
        db.query(Inscripcion)
        .options(joinedload(Inscripcion.club_equipo))
        .filter(Inscripcion.torneo_id == torneo_id, Inscripcion.estado == "aprobado")
        .order_by(
            Inscripcion.puntos.desc(),
            Inscripcion.partidos_ganados.desc(),
            Inscripcion.partidos_perdidos.asc(),
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
    torneo = db.query(Torneo).options(joinedload(Torneo.deporte)).filter(Torneo.id == torneo_id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")

    deporte = torneo.deporte
    es_futbol = deporte and ("fútbol" in deporte.nombre.lower() or "futbol" in deporte.nombre.lower())
    etiqueta = "Goles" if es_futbol else "Puntos"
    stat_col = AtletaJugador.goles_anotados if es_futbol else AtletaJugador.puntos_anotados

    inscripciones = (
        db.query(Inscripcion)
        .filter(Inscripcion.torneo_id == torneo_id, Inscripcion.estado == "aprobado")
        .all()
    )
    equipo_ids = [i.club_equipo_id for i in inscripciones]

    if not equipo_ids:
        return []

    atletas = (
        db.query(AtletaJugador)
        .options(joinedload(AtletaJugador.club_equipo))
        .filter(
            AtletaJugador.club_equipo_id.in_(equipo_ids),
            stat_col > 0,
        )
        .order_by(stat_col.desc())
        .limit(limit)
        .all()
    )

    return [
        Goleador(
            posicion=i + 1,
            atleta_id=a.id,
            nombre_completo=a.nombre_completo,
            nombre_equipo=a.club_equipo.nombre_equipo if a.club_equipo else "—",
            goles=a.goles_anotados if es_futbol else a.puntos_anotados,
            tarjetas_amarillas=a.tarjetas_amarillas,
            tarjetas_rojas=a.tarjetas_rojas,
            etiqueta=etiqueta,
        )
        for i, a in enumerate(atletas)
    ]
