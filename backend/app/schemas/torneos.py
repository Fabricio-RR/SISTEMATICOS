from pydantic import BaseModel


class TorneoBase(BaseModel):
    deporte_id: int
    nombre: str
    formato: str = "grupos"
    temporada: str
    estado: str = "activo"
    fecha_inicio: str | None = None
    fecha_fin: str | None = None
    descripcion: str | None = None


class TorneoCreate(TorneoBase):
    pass


class TorneoUpdate(BaseModel):
    nombre: str | None = None
    formato: str | None = None
    temporada: str | None = None
    estado: str | None = None
    fecha_inicio: str | None = None
    fecha_fin: str | None = None
    descripcion: str | None = None


class TorneoOut(TorneoBase):
    id: int

    model_config = {"from_attributes": True}
