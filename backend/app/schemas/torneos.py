from pydantic import BaseModel


class TorneoBase(BaseModel):
    deporte_id: int
    nombre: str
    formato: str = "liga"
    temporada: str
    estado: str = "activo"


class TorneoCreate(TorneoBase):
    pass


class TorneoOut(TorneoBase):
    id: int

    model_config = {"from_attributes": True}