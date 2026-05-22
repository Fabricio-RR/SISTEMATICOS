from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.torneos import Torneo
from app.schemas.torneos import TorneoCreate, TorneoOut
from app.core.deps import require_admin
from app.models.usuarios import Usuario

router = APIRouter()


@router.get("/", response_model=list[TorneoOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Torneo).all()


@router.get("/{id}", response_model=TorneoOut)
def get_by_id(id: int, db: Session = Depends(get_db)):
    torneo = db.query(Torneo).filter(Torneo.id == id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    return torneo


@router.post("/", response_model=TorneoOut, status_code=status.HTTP_201_CREATED)
def create(data: TorneoCreate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    torneo = Torneo(**data.model_dump())
    db.add(torneo)
    db.commit()
    db.refresh(torneo)
    return torneo


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    torneo = db.query(Torneo).filter(Torneo.id == id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    db.delete(torneo)
    db.commit()