from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.grupos import Grupo
from app.schemas.grupos import GrupoCreate, GrupoOut
from app.core.deps import require_admin
from app.models.usuarios import Usuario

router = APIRouter()


@router.get("/", response_model=list[GrupoOut])
def get_all(torneo_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Grupo)
    if torneo_id:
        q = q.filter(Grupo.torneo_id == torneo_id)
    return q.order_by(Grupo.torneo_id, Grupo.orden).all()


@router.post("/", response_model=GrupoOut, status_code=status.HTTP_201_CREATED)
def create(data: GrupoCreate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    grupo = Grupo(**data.model_dump())
    db.add(grupo)
    db.commit()
    db.refresh(grupo)
    return grupo


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    grupo = db.query(Grupo).filter(Grupo.id == id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    db.delete(grupo)
    db.commit()
