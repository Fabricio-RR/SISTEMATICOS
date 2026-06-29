from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.auditoria import Auditoria
from app.models.usuarios import Usuario
from app.schemas.auditoria import AuditoriaOut
from app.core.deps import require_admin

router = APIRouter()


@router.get("/", response_model=list[AuditoriaOut])
def get_recent(
    limit: int = Query(default=20, le=50),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    logs = (
        db.query(Auditoria)
        .options(joinedload(Auditoria.usuario))
        .order_by(Auditoria.creado_en.desc())
        .limit(limit)
        .all()
    )
    result: list[AuditoriaOut] = []
    for log in logs:
        result.append(AuditoriaOut(
            id=log.id,
            usuario_id=log.usuario_id,
            tabla_afectada=log.tabla_afectada,
            accion=log.accion,
            valor_anterior=log.valor_anterior,
            valor_nuevo=log.valor_nuevo,
            creado_en=log.creado_en,
            usuario_nombre=f"{log.usuario.nombres} {log.usuario.apellidos}" if log.usuario else None,
        ))
    return result
