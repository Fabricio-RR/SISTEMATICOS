from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.atleta_jugador import AtletaJugador
from app.schemas.atleta_jugador import AtletaCreate, AtletaUpdate, AtletaOut
from app.core.deps import get_current_user
from app.models.usuarios import Usuario
from app.services.enrollment import assert_atleta_access_allowed, assert_atleta_creation_allowed

router = APIRouter()


@router.get("/", response_model=list[AtletaOut])
def get_all(club_equipo_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(AtletaJugador)
    if club_equipo_id:
        q = q.filter(AtletaJugador.club_equipo_id == club_equipo_id)
    return q.all()


@router.get("/{id}", response_model=AtletaOut)
def get_by_id(id: int, db: Session = Depends(get_db)):
    atleta = db.query(AtletaJugador).filter(AtletaJugador.id == id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta no encontrado")
    return atleta


@router.post("/", response_model=AtletaOut, status_code=status.HTTP_201_CREATED)
def create(data: AtletaCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    assert_atleta_creation_allowed(
        club_equipo_id=data.club_equipo_id,
        documento_identidad=data.documento_identidad,
        current_user=current_user,
        db=db,
    )

    atleta = AtletaJugador(**data.model_dump())
    db.add(atleta)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un atleta con ese documento en el equipo",
        )
    db.refresh(atleta)
    return atleta


@router.patch("/{id}", response_model=AtletaOut)
def update(id: int, data: AtletaUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    atleta = db.query(AtletaJugador).options(joinedload(AtletaJugador.club_equipo)).filter(AtletaJugador.id == id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta no encontrado")
    assert_atleta_access_allowed(atleta, current_user)
    for field, val in data.model_dump(exclude_none=True).items():
        setattr(atleta, field, val)
    db.commit()
    db.refresh(atleta)
    return atleta


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    atleta = db.query(AtletaJugador).options(joinedload(AtletaJugador.club_equipo)).filter(AtletaJugador.id == id).first()
    if not atleta:
        raise HTTPException(status_code=404, detail="Atleta no encontrado")
    assert_atleta_access_allowed(atleta, current_user)
    db.delete(atleta)
    db.commit()
