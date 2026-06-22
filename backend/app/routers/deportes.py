from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.deportes import Deporte
from app.models.torneos import Torneo
from app.models.club_equipo import ClubEquipo
from app.schemas.deportes import DeporteCreate, DeporteUpdate, DeporteOut
from app.core.deps import require_admin
from app.models.usuarios import Usuario

router = APIRouter()

ESTADO_ELIMINADO = 2


@router.get("/", response_model=list[DeporteOut])
def get_all(incluir_inactivos: bool = False, db: Session = Depends(get_db)):
    # Los eliminados (estado = 2) nunca se listan, aunque sigan en la base de datos.
    q = db.query(Deporte).filter(Deporte.estado != ESTADO_ELIMINADO)
    if not incluir_inactivos:
        q = q.filter(Deporte.esta_activo == True)
    return q.order_by(Deporte.id).all()


@router.get("/{id}", response_model=DeporteOut)
def get_by_id(id: int, db: Session = Depends(get_db)):
    dep = db.query(Deporte).filter(Deporte.id == id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
    return dep


@router.post("/", response_model=DeporteOut, status_code=status.HTTP_201_CREATED)
def create(data: DeporteCreate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    existe = db.query(Deporte).filter(Deporte.nombre == data.nombre).first()
    if existe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un deporte con este nombre",
        )
    dep = Deporte(**data.model_dump())
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep


@router.patch("/{id}", response_model=DeporteOut)
def update(id: int, data: DeporteUpdate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    dep = db.query(Deporte).filter(Deporte.id == id).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")

    payload = data.model_dump(exclude_none=True)

    nuevo_nombre = payload.get("nombre")
    if nuevo_nombre and nuevo_nombre != dep.nombre:
        existe = db.query(Deporte).filter(
            Deporte.nombre == nuevo_nombre, Deporte.id != id
        ).first()
        if existe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un deporte con este nombre",
            )

    if payload.get("esta_activo") is False and dep.es_obligatorio:
        raise HTTPException(
            status_code=409,
            detail="No se puede desactivar un deporte obligatorio",
        )

    for field, val in payload.items():
        setattr(dep, field, val)
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

    # No se puede eliminar si está asociado a equipos o torneos registrados.
    equipo = db.query(ClubEquipo).filter(ClubEquipo.deporte_id == id).first()
    if equipo:
        raise HTTPException(
            status_code=409,
            detail=f"No se puede eliminar: hay equipos asociados a este deporte (ej. '{equipo.nombre_equipo}')",
        )
    torneo = db.query(Torneo).filter(Torneo.deporte_id == id).first()
    if torneo:
        raise HTTPException(
            status_code=409,
            detail=f"No se puede eliminar: hay torneos asociados a este deporte (ej. '{torneo.nombre}')",
        )

    # Borrado lógico: se conserva en la base de datos pero deja de mostrarse.
    dep.estado = ESTADO_ELIMINADO
    db.commit()