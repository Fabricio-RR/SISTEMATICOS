from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.club_equipo import ClubEquipo
from app.models.inscripciones import Inscripcion
from app.schemas.club_equipo import ClubEquipoCreate, ClubEquipoUpdate, ClubEquipoOut
from app.core.deps import get_current_user, require_admin
from app.models.usuarios import Usuario
from app.services.enrollment import assert_team_creation_allowed, assert_team_name_available

router = APIRouter()


@router.get("/", response_model=list[ClubEquipoOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(ClubEquipo).all()


@router.get("/{id}", response_model=ClubEquipoOut)
def get_by_id(id: int, db: Session = Depends(get_db)):
    equipo = db.query(ClubEquipo).filter(ClubEquipo.id == id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return equipo


@router.post("/", response_model=ClubEquipoOut, status_code=status.HTTP_201_CREATED)
def create(data: ClubEquipoCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    assert_team_creation_allowed(
        institucion_id=data.institucion_id,
        deporte_id=data.deporte_id,
        nombre_equipo=data.nombre_equipo,
        current_user=current_user,
        db=db,
    )

    equipo = ClubEquipo(**data.model_dump())
    equipo.estado = "aprobado" if current_user.rol == "admin" else "pendiente"
    db.add(equipo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un equipo con ese nombre en la institución y deporte seleccionados",
        )
    db.refresh(equipo)
    return equipo


@router.put("/{id}", response_model=ClubEquipoOut)
def update(id: int, data: ClubEquipoUpdate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    equipo = db.query(ClubEquipo).filter(ClubEquipo.id == id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if data.nombre_equipo is not None:
        assert_team_name_available(
            db,
            institucion_id=equipo.institucion_id,
            deporte_id=equipo.deporte_id,
            nombre_equipo=data.nombre_equipo,
            exclude_team_id=equipo.id,
        )
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(equipo, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un equipo con ese nombre en la institución y deporte seleccionados",
        )
    db.refresh(equipo)
    return equipo


@router.patch("/{id}/aprobar", response_model=ClubEquipoOut)
def aprobar(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    equipo = db.query(ClubEquipo).filter(ClubEquipo.id == id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    equipo.estado = "aprobado"
    db.commit()
    db.refresh(equipo)
    return equipo


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    equipo = db.query(ClubEquipo).filter(ClubEquipo.id == id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if db.query(Inscripcion).filter(Inscripcion.club_equipo_id == id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar un equipo que ya tiene inscripciones registradas",
        )
    db.delete(equipo)
    db.commit()
