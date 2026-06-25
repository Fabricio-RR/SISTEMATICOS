from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuarios import Usuario
from app.schemas.usuarios import UsuarioOut
from app.core.deps import require_admin
from app.core import email as email_service

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
    """Aprueba una solicitud de acceso — activa el usuario, su institución y envía email."""
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.esta_activo = True
    nombre_institucion = "tu institución"
    if user.institucion_id:
        from app.models.instituciones import Institucion
        from app.core.pais_categoria import asignar_pais
        inst = db.query(Institucion).filter(Institucion.id == user.institucion_id).first()
        if inst:
            inst.estado = "activo"
            nombre_institucion = inst.nombre
    db.commit()
    db.refresh(user)
    # Enviar email de confirmación (no bloquea si falla)
    email_service.enviar_aprobacion(
        correo=user.correo,
        nombre=f"{user.nombres} {user.apellidos}",
        nombre_institucion=nombre_institucion,
    )
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


@router.delete("/{id}", status_code=204)
def delete_usuario(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    """Elimina un usuario. Solo permitido si está inactivo y no es admin."""
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.esta_activo:
        raise HTTPException(status_code=400, detail="Desactiva el usuario antes de eliminarlo")
    if user.rol == "admin":
        raise HTTPException(status_code=400, detail="No se puede eliminar al administrador")
    db.delete(user)
    db.commit()