from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.deps import require_admin
from app.models.usuarios import Usuario
from app.models.instituciones import Institucion
from app.models.club_equipo import ClubEquipo
from app.models.atleta_jugador import AtletaJugador
from app.models.deportes import Deporte
from app.models.torneos import Torneo
from app.models.partidos import Partido
from app.schemas.reportes import ResumenGeneral, ParticipantesInstitucion, EquiposPorDeporte

# Reportes de solo lectura para el panel de administración. Solo cuentan datos,
# no los modifican. Todos exigen que el usuario sea administrador.
router = APIRouter()

# Cuenta solo los equipos vigentes. En el sistema los equipos no se borran de la
# base: se marcan con estado "eliminado", así que aquí los dejamos fuera.
_EQUIPO_ACTIVO = ClubEquipo.estado != "eliminado"


@router.get("/resumen", response_model=ResumenGeneral)
def resumen(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    """Totales generales del sistema (instituciones, equipos, atletas, etc.)."""
    return ResumenGeneral(
        instituciones=db.query(func.count(Institucion.id)).scalar() or 0,
        equipos=db.query(func.count(ClubEquipo.id)).filter(_EQUIPO_ACTIVO).scalar() or 0,
        atletas=db.query(func.count(AtletaJugador.id)).scalar() or 0,
        deportes=db.query(func.count(Deporte.id)).filter(Deporte.estado == 1).scalar() or 0,
        torneos=db.query(func.count(Torneo.id)).scalar() or 0,
        partidos_jugados=db.query(func.count(Partido.id)).filter(Partido.estado == "finalizado").scalar() or 0,
    )


@router.get("/participantes-por-institucion", response_model=list[ParticipantesInstitucion])
def participantes_por_institucion(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    """Cantidad de equipos y atletas por institución, ordenado de mayor a menor."""
    rows = (
        db.query(
            Institucion.id,
            Institucion.nombre,
            func.count(func.distinct(ClubEquipo.id)).label("equipos"),
            func.count(AtletaJugador.id).label("atletas"),
        )
        .outerjoin(ClubEquipo, (ClubEquipo.institucion_id == Institucion.id) & _EQUIPO_ACTIVO)
        .outerjoin(AtletaJugador, AtletaJugador.club_equipo_id == ClubEquipo.id)
        .group_by(Institucion.id, Institucion.nombre)
        .order_by(func.count(AtletaJugador.id).desc(), Institucion.nombre.asc())
        .all()
    )
    return [
        ParticipantesInstitucion(institucion_id=r.id, institucion=r.nombre, equipos=r.equipos, atletas=r.atletas)
        for r in rows
    ]


@router.get("/equipos-por-deporte", response_model=list[EquiposPorDeporte])
def equipos_por_deporte(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    """Cantidad de equipos inscritos en cada disciplina vigente."""
    rows = (
        db.query(
            Deporte.id,
            Deporte.nombre,
            func.count(ClubEquipo.id).label("equipos"),
        )
        .outerjoin(ClubEquipo, (ClubEquipo.deporte_id == Deporte.id) & _EQUIPO_ACTIVO)
        .filter(Deporte.estado == 1)
        .group_by(Deporte.id, Deporte.nombre)
        .order_by(func.count(ClubEquipo.id).desc(), Deporte.nombre.asc())
        .all()
    )
    return [EquiposPorDeporte(deporte_id=r.id, deporte=r.nombre, equipos=r.equipos) for r in rows]
