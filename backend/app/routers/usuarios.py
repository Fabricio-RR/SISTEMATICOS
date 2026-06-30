from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuarios import Usuario
from app.models.instituciones import Institucion
from app.models.auditoria import Auditoria
from app.schemas.usuarios import UsuarioOut, UsuarioUpdate
from app.core.deps import require_admin

router = APIRouter()


@router.get("/", response_model=list[UsuarioOut])
def get_all(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    return db.query(Usuario).offset(skip).limit(limit).all()


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
def approve(id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    """Aprueba una solicitud de acceso — activa el usuario y su institución."""
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.esta_activo = True
    if user.institucion_id:
        inst = db.query(Institucion).filter(Institucion.id == user.institucion_id).first()
        if inst:
            inst.estado = "activo"
    db.add(Auditoria(
        usuario_id=current_user.id,
        tabla_afectada="usuarios",
        accion="UPDATE",
        valor_nuevo=f"usuario_id={id} aprobado",
    ))
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{id}/deactivate", response_model=UsuarioOut)
def deactivate(id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    """Desactiva un usuario (acceso bloqueado)."""
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    # Evita que un admin se bloquee a sí mismo y pierda el acceso al panel.
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No puedes desactivar tu propia cuenta",
        )
    user.esta_activo = False
    db.add(Auditoria(
        usuario_id=current_user.id,
        tabla_afectada="usuarios",
        accion="UPDATE",
        valor_nuevo=f"usuario_id={id} desactivado",
    ))
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{id}", response_model=UsuarioOut)
def update(id: int, data: UsuarioUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    """Edita los datos de un usuario (nombres, apellidos, correo, rol, institución)."""
    user = db.query(Usuario).filter(Usuario.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    cambios = data.model_dump(exclude_unset=True)
    if not cambios:
        return user

    # Correo único (ignorando al propio usuario)
    if "correo" in cambios and cambios["correo"] != user.correo:
        if db.query(Usuario).filter(Usuario.correo == cambios["correo"], Usuario.id != id).first():
            raise HTTPException(status_code=400, detail="El correo ya está registrado")

    # Si se asigna una institución, debe existir
    if cambios.get("institucion_id") is not None:
        if not db.query(Institucion).filter(Institucion.id == cambios["institucion_id"]).first():
            raise HTTPException(status_code=404, detail="Institución no encontrada")

    for campo, valor in cambios.items():
        setattr(user, campo, valor)

    # Consistencia rol ↔ institución (mismo criterio que en el registro)
    if user.rol == "institucion" and user.institucion_id is None:
        raise HTTPException(status_code=400, detail="Un usuario de institución debe tener institucion_id")
    if user.rol != "institucion" and user.institucion_id is not None:
        raise HTTPException(status_code=400, detail="Solo los usuarios de institución pueden tener institucion_id")

    db.add(Auditoria(
        usuario_id=current_user.id,
        tabla_afectada="usuarios",
        accion="UPDATE",
        valor_nuevo=f"usuario_id={id} editado: {', '.join(cambios.keys())}",
    ))
    db.commit()
    db.refresh(user)
    return user