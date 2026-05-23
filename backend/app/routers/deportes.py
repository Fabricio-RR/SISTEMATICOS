from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.deportes import Deporte
from app.models.torneos import Torneo
from app.schemas.deportes import DeporteCreate, DeporteOut
from app.core.deps import require_admin
from app.models.usuarios import Usuario

router = APIRouter()


@router.get("/", response_model=list[DeporteOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Deporte).filter(Deporte.esta_activo == True).all()


@router.get("/{id}", response_model=DeporteOut)
def get_by_id(id: int, db: Session = Depends(get_db)):
    dep = db.query(Deporte).filter(Deporte.id == id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
    return dep


@router.post("/", response_model=DeporteOut, status_code=status.HTTP_201_CREATED)
def create(data: DeporteCreate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    dep = Deporte(**data.model_dump())
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    dep = db.query(Deporte).filter(Deporte.id == id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
    if dep.es_obligatorio:
        raise HTTPException(status_code=409, detail="No se puede eliminar un deporte obligatorio")
    torneo_activo = db.query(Torneo).filter(
        Torneo.deporte_id == id,
        Torneo.estado.not_in(["finalizado", "suspendido"]),
    ).first()
    if torneo_activo:
        raise HTTPException(
            status_code=409,
            detail=f"No se puede eliminar: hay torneos activos con este deporte (ej. '{torneo_activo.nombre}')",
        )
    dep.esta_activo = False
    db.commit()