from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.torneos import Torneo
from app.models.deportes import Deporte
from app.models.inscripciones import Inscripcion
from app.models.fixture import Fixture
from app.core.deps import require_admin
from app.models.usuarios import Usuario
from app.schemas.torneos import TorneoCreate, TorneoOut, TRANSICIONES
from app.services.competition import assert_transition_allowed

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
    if not db.query(Deporte).filter(Deporte.id == data.deporte_id, Deporte.esta_activo == True).first():
        raise HTTPException(status_code=404, detail="Deporte no encontrado o inactivo")
    torneo = Torneo(**data.model_dump())
    db.add(torneo)
    db.commit()
    db.refresh(torneo)
    return torneo


@router.patch("/{id}/avanzar", response_model=TorneoOut)
def avanzar(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    torneo = db.query(Torneo).filter(Torneo.id == id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    siguiente = TRANSICIONES.get(torneo.estado)
    if not siguiente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El torneo está en estado '{torneo.estado}' y no puede avanzar.",
        )
    assert_transition_allowed(torneo, siguiente, db)
    torneo.estado = siguiente
    db.commit()
    db.refresh(torneo)
    return torneo


@router.patch("/{id}/suspender", response_model=TorneoOut)
def suspender(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    torneo = db.query(Torneo).filter(Torneo.id == id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    if torneo.estado == "finalizado":
        raise HTTPException(status_code=400, detail="No se puede suspender un torneo finalizado.")
    if torneo.estado == "suspendido":
        raise HTTPException(status_code=400, detail="El torneo ya está suspendido.")
    torneo.estado_previo = torneo.estado
    torneo.estado = "suspendido"
    db.commit()
    db.refresh(torneo)
    return torneo


@router.patch("/{id}/reactivar", response_model=TorneoOut)
def reactivar(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    torneo = db.query(Torneo).filter(Torneo.id == id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    if torneo.estado != "suspendido":
        raise HTTPException(status_code=400, detail="El torneo no está suspendido.")
    if not torneo.estado_previo:
        raise HTTPException(status_code=400, detail="No hay estado anterior registrado. Contacta al administrador del sistema.")
    torneo.estado = torneo.estado_previo
    torneo.estado_previo = None
    db.commit()
    db.refresh(torneo)
    return torneo


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    torneo = db.query(Torneo).filter(Torneo.id == id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    if torneo.estado in ("en_curso", "finalizado"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar un torneo en curso o finalizado.",
        )
    if db.query(Inscripcion).filter(Inscripcion.torneo_id == id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar un torneo con inscripciones registradas",
        )
    if db.query(Fixture).filter(Fixture.torneo_id == id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Elimina el fixture del torneo antes de borrarlo",
        )
    db.delete(torneo)
    db.commit()
