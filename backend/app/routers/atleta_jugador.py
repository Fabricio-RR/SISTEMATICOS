from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.atleta_jugador import AtletaJugador
from app.models.club_equipo import ClubEquipo
from app.models.inscripciones import Inscripcion
from app.models.partidos import Partido
from app.models.usuarios import Usuario
from app.schemas.atleta_jugador import AtletaCreate, AtletaUpdate, AtletaOut
from app.core.deps import get_current_user, require_admin

router = APIRouter()


def _tiene_partidos_en_curso(db: Session, club_equipo_id: int) -> bool:
    """Devuelve True si el equipo tiene al menos un partido en curso o finalizado."""
    inscripciones = db.query(Inscripcion).filter(Inscripcion.club_equipo_id == club_equipo_id).all()
    insc_ids = [i.id for i in inscripciones]
    if not insc_ids:
        return False
    partido = db.query(Partido).filter(
        (Partido.inscripcion_local_id.in_(insc_ids)) | (Partido.inscripcion_visitante_id.in_(insc_ids)),
        Partido.estado.in_(["en_curso", "finalizado"]),
    ).first()
    return partido is not None


@router.get("/equipo/{club_equipo_id}", response_model=list[AtletaOut])
def get_by_equipo(club_equipo_id: int, db: Session = Depends(get_db)):
    return db.query(AtletaJugador).filter(
        AtletaJugador.club_equipo_id == club_equipo_id,
        AtletaJugador.estado == "activo",
    ).all()


@router.get("/{id}", response_model=AtletaOut)
def get_by_id(id: int, db: Session = Depends(get_db)):
    atleta = db.query(AtletaJugador).filter(AtletaJugador.id == id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    return atleta


@router.post("/", response_model=AtletaOut, status_code=status.HTTP_201_CREATED)
def create(data: AtletaCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    equipo = db.query(ClubEquipo).filter(ClubEquipo.id == data.club_equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if current_user.rol != "admin" and equipo.institucion_id != current_user.institucion_id:
        raise HTTPException(status_code=403, detail="No tienes permiso para agregar jugadores a este equipo")
    atleta = AtletaJugador(**data.model_dump())
    db.add(atleta)
    db.commit()
    db.refresh(atleta)
    return atleta


class BulkAtletaItem(BaseModel):
    nombre_completo: str
    documento_identidad: str
    posicion_rol: str | None = "Jugador"
    numero_camiseta: str | None = None


class BulkAtletaCreate(BaseModel):
    club_equipo_id: int
    jugadores: List[BulkAtletaItem]


@router.post("/bulk", response_model=list[AtletaOut], status_code=status.HTTP_201_CREATED)
def create_bulk(data: BulkAtletaCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    """Carga masiva de jugadores para un equipo."""
    equipo = db.query(ClubEquipo).filter(ClubEquipo.id == data.club_equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if current_user.rol != "admin" and equipo.institucion_id != current_user.institucion_id:
        raise HTTPException(status_code=403, detail="No tienes permiso")

    # Validar que el deporte tenga límites
    deporte = equipo.deporte
    total_existentes = db.query(AtletaJugador).filter(
        AtletaJugador.club_equipo_id == data.club_equipo_id,
        AtletaJugador.estado == "activo",
    ).count()
    total_nuevo = total_existentes + len(data.jugadores)

    if deporte and total_nuevo > deporte.max_jugadores:
        raise HTTPException(
            status_code=400,
            detail=f"El equipo superaría el máximo de {deporte.max_jugadores} jugadores para {deporte.nombre}"
        )

    creados = []
    for j in data.jugadores:
        atleta = AtletaJugador(
            club_equipo_id=data.club_equipo_id,
            nombre_completo=j.nombre_completo,
            documento_identidad=j.documento_identidad,
            posicion_rol=j.posicion_rol,
            numero_camiseta=j.numero_camiseta,
        )
        db.add(atleta)
        creados.append(atleta)
    db.commit()
    for a in creados:
        db.refresh(a)
    return creados


@router.put("/{id}", response_model=AtletaOut)
def update(id: int, data: AtletaUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    atleta = db.query(AtletaJugador).filter(AtletaJugador.id == id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")

    equipo = db.query(ClubEquipo).filter(ClubEquipo.id == atleta.club_equipo_id).first()
    if current_user.rol != "admin" and equipo.institucion_id != current_user.institucion_id:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este jugador")

    if current_user.rol != "admin" and _tiene_partidos_en_curso(db, atleta.club_equipo_id):
        raise HTTPException(
            status_code=400,
            detail="No se puede editar jugadores una vez que el equipo tiene partidos en curso o finalizados"
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(atleta, field, value)
    db.commit()
    db.refresh(atleta)
    return atleta


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    atleta = db.query(AtletaJugador).filter(AtletaJugador.id == id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")

    equipo = db.query(ClubEquipo).filter(ClubEquipo.id == atleta.club_equipo_id).first()
    if current_user.rol != "admin" and equipo.institucion_id != current_user.institucion_id:
        raise HTTPException(status_code=403, detail="No tienes permiso")

    if current_user.rol != "admin" and _tiene_partidos_en_curso(db, atleta.club_equipo_id):
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar jugadores una vez que el equipo tiene partidos en curso o finalizados"
        )

    atleta.estado = "inactivo"
    db.commit()
