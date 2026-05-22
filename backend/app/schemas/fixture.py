from pydantic import BaseModel
from datetime import datetime


class FixtureOut(BaseModel):
    id: int
    torneo_id: int
    jornada: int
    nombre_fase: str
    fecha_generacion: datetime
    estado: str

    model_config = {"from_attributes": True}


class GenerarFixtureRequest(BaseModel):
    torneo_id: int
    force: bool = False
