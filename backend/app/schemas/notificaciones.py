from pydantic import BaseModel
from datetime import datetime


class NotificacionOut(BaseModel):
    id: int
    institucion_id: int
    partido_id: int | None
    titulo: str
    contenido: str
    leida: bool
    creada_en: datetime

    model_config = {"from_attributes": True}
