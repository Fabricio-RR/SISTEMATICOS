from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.notificaciones import Notificacion
from app.schemas.notificaciones import NotificacionOut
from app.core.deps import get_current_user
from app.models.usuarios import Usuario

router = APIRouter()


@router.get("/", response_model=list[NotificacionOut])
def get_mis_notificaciones(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    if not current_user.institucion_id:
        return []
    return (
        db.query(Notificacion)
        .filter(Notificacion.institucion_id == current_user.institucion_id)
        .order_by(Notificacion.creada_en.desc())
        .limit(50)
        .all()
    )


@router.patch("/{id}/leer", response_model=NotificacionOut)
def marcar_leida(id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    n = db.query(Notificacion).filter(Notificacion.id == id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    if n.institucion_id != current_user.institucion_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta notificación")
    n.leida = True
    db.commit()
    db.refresh(n)
    return n


@router.patch("/leer-todas", status_code=status.HTTP_204_NO_CONTENT)
def marcar_todas_leidas(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    if not current_user.institucion_id:
        return
    db.query(Notificacion).filter(
        Notificacion.institucion_id == current_user.institucion_id,
        Notificacion.leida.is_(False),
    ).update({"leida": True})
    db.commit()


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    n = db.query(Notificacion).filter(Notificacion.id == id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    if n.institucion_id != current_user.institucion_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta notificación")
    db.delete(n)
    db.commit()
