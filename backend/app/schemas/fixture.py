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


class FaseEliminatoriaRequest(BaseModel):
    torneo_id: int
    n_clasificados: int = 4  # 2, 4 u 8


class SiguienteFaseRequest(BaseModel):
    torneo_id: int
    fixture_id: int
