from datetime import datetime
from pydantic import BaseModel


class AuditoriaOut(BaseModel):
    id: int
    usuario_id: int | None
    tabla_afectada: str
    accion: str
    valor_anterior: str | None = None
    valor_nuevo: str | None = None
    creado_en: datetime
    usuario_nombre: str | None = None

    model_config = {"from_attributes": True}
