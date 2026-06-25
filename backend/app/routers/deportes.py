from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.deportes import Deporte
from app.schemas.deportes import DeporteCreate, DeporteUpdate, DeporteOut
from app.core.deps import require_admin
from app.models.usuarios import Usuario

router = APIRouter()


@router.get("/", response_model=list[DeporteOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Deporte).filter(Deporte.esta_activo == True).all()


@router.get("/todos", response_model=list[DeporteOut])
def get_all_including_inactive(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    """Lista todos los deportes, incluidos los desactivados (solo admin)."""
    return db.query(Deporte).all()


@router.get("/{id}", response_model=DeporteOut)
def get_by_id(id: int, db: Session = Depends(get_db)):
    dep = db.query(Deporte).filter(Deporte.id == id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
    return dep


@router.post("/", response_model=DeporteOut, status_code=status.HTTP_201_CREATED)
def create(data: DeporteCreate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    if data.min_jugadores < 1:
        raise HTTPException(status_code=400, detail="min_jugadores debe ser al menos 1")
    if data.max_jugadores < data.min_jugadores:
        raise HTTPException(status_code=400, detail="max_jugadores no puede ser menor que min_jugadores")
    dep = Deporte(**data.model_dump())
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep


@router.put("/{id}", response_model=DeporteOut)
def update(id: int, data: DeporteUpdate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    dep = db.query(Deporte).filter(Deporte.id == id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(dep, field, value)
    if dep.min_jugadores < 1:
        raise HTTPException(status_code=400, detail="min_jugadores debe ser al menos 1")
    if dep.max_jugadores < dep.min_jugadores:
        raise HTTPException(status_code=400, detail="max_jugadores no puede ser menor que min_jugadores")
    db.commit()
    db.refresh(dep)
    return dep


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    dep = db.query(Deporte).filter(Deporte.id == id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
    dep.esta_activo = False
    db.commit()
