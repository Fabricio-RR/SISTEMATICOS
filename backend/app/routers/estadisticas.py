from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.inscripciones import Inscripcion
from app.models.club_equipo import ClubEquipo
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
        .all()
    )

    equipos = [i.club_equipo for i in inscripciones if i.club_equipo]
    equipos.sort(key=lambda e: (-e.puntos, -e.partidos_ganados, e.partidos_perdidos))

    return [
        PosicionTabla(
            posicion=i + 1,
            equipo_id=e.id,
            nombre_equipo=e.nombre_equipo,
            puntos=e.puntos,
            partidos_jugados=e.partidos_jugados,
            partidos_ganados=e.partidos_ganados,
            partidos_empatados=max(0, e.partidos_jugados - e.partidos_ganados - e.partidos_perdidos),
            partidos_perdidos=e.partidos_perdidos,
        )
        for i, e in enumerate(equipos)
    ]


@router.get("/goleadores", response_model=list[Goleador])
def goleadores(torneo_id: int, limit: int = 10, db: Session = Depends(get_db)):
    if not db.query(Torneo).filter(Torneo.id == torneo_id).first():
        raise HTTPException(status_code=404, detail="Torneo no encontrado")

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
            AtletaJugador.goles_anotados > 0,
        )
        .order_by(AtletaJugador.goles_anotados.desc())
        .limit(limit)
        .all()
    )

    return [
        Goleador(
            posicion=i + 1,
            atleta_id=a.id,
            nombre_completo=a.nombre_completo,
            nombre_equipo=a.club_equipo.nombre_equipo if a.club_equipo else "—",
            goles=a.goles_anotados,
            tarjetas_amarillas=a.tarjetas_amarillas,
            tarjetas_rojas=a.tarjetas_rojas,
        )
        for i, a in enumerate(atletas)
    ]
