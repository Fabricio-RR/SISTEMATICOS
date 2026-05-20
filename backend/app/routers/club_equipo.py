from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.club_equipo import ClubEquipo
from app.schemas.club_equipo import ClubEquipoCreate, ClubEquipoUpdate, ClubEquipoOut
from app.core.deps import get_current_user, require_admin
from app.models.usuarios import Usuario

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
    equipo = ClubEquipo(**data.model_dump())
    db.add(equipo)
    db.commit()
    db.refresh(equipo)
    return equipo


@router.put("/{id}", response_model=ClubEquipoOut)
def update(id: int, data: ClubEquipoUpdate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    equipo = db.query(ClubEquipo).filter(ClubEquipo.id == id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(equipo, field, value)
    db.commit()
    db.refresh(equipo)
    return equipo