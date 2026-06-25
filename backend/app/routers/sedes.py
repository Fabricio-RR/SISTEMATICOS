from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sedes import Sede
from app.schemas.sedes import SedeCreate, SedeOut
from app.core.deps import require_admin
from app.models.usuarios import Usuario

router = APIRouter()


@router.get("/", response_model=list[SedeOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Sede).filter(Sede.esta_activo == True).all()


@router.post("/", response_model=SedeOut, status_code=status.HTTP_201_CREATED)
def create(data: SedeCreate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    sede = Sede(**data.model_dump())
    db.add(sede)
    db.commit()
    db.refresh(sede)
    return sede


@router.put("/{id}", response_model=SedeOut)
def update(id: int, data: SedeCreate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    sede = db.query(Sede).filter(Sede.id == id, Sede.esta_activo == True).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    sede.nombre_sede = data.nombre_sede
    sede.ciudad = data.ciudad
    sede.capacidad = data.capacidad
    db.commit()
    db.refresh(sede)
    return sede


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    sede = db.query(Sede).filter(Sede.id == id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    sede.esta_activo = False
    db.commit()
