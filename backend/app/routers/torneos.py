from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.torneos import Torneo
from app.models.deportes import Deporte
from app.models.inscripciones import Inscripcion
from app.models.grupos import Grupo
from app.models.fixture import Fixture
from app.models.partidos import Partido
from app.models.eventos_partido import EventoPartido
from app.schemas.torneos import TorneoCreate, TorneoUpdate, TorneoOut
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
    deporte = db.query(Deporte).filter(Deporte.id == data.deporte_id).first()
    if not deporte:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
    torneo = Torneo(**data.model_dump())
    db.add(torneo)
    db.commit()
    db.refresh(torneo)
    return torneo


@router.put("/{id}", response_model=TorneoOut)
def update(id: int, data: TorneoUpdate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    torneo = db.query(Torneo).filter(Torneo.id == id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(torneo, field, value)
    db.commit()
    db.refresh(torneo)
    return torneo


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    torneo = db.query(Torneo).filter(Torneo.id == id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    # Borrar en orden para respetar FKs: eventos → partidos → fixtures → grupos → inscripciones → torneo
    fixtures = db.query(Fixture).filter(Fixture.torneo_id == id).all()
    for f in fixtures:
        for p in f.partidos:
            db.query(EventoPartido).filter(EventoPartido.partido_id == p.id).delete()
            db.delete(p)
        db.delete(f)
    db.query(Grupo).filter(Grupo.torneo_id == id).delete()
    db.query(Inscripcion).filter(Inscripcion.torneo_id == id).delete()
    db.delete(torneo)
    db.commit()
