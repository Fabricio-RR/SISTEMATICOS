from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuarios import Usuario
from app.schemas.usuarios import UsuarioOut
from app.core.deps import require_admin

router = APIRouter()


@router.get("/", response_model=list[UsuarioOut])
def get_all(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    return db.query(Usuario).all()


@router.get("/pendientes", response_model=list[UsuarioOut])
def get_pending(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    """Usuarios con solicitud pendiente de aprobación (esta_activo=False)."""
    return db.query(Usuario).filter(Usuario.esta_activo == False).all()


@router.get("/{id}", response_model=UsuarioOut)
def get_by_id(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.patch("/{id}/approve", response_model=UsuarioOut)
def approve(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    """Aprueba una solicitud de acceso — activa el usuario y su institución."""
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.esta_activo = True
    if user.institucion_id:
        from app.models.instituciones import Institucion
        inst = db.query(Institucion).filter(Institucion.id == user.institucion_id).first()
        if inst:
            inst.estado = "activo"
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{id}/deactivate", response_model=UsuarioOut)
def deactivate(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    """Desactiva un usuario (acceso bloqueado)."""
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.esta_activo = False
    db.commit()
    db.refresh(user)
    return user