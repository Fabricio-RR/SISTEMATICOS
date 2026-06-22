from pydantic import BaseModel


class DeporteBase(BaseModel):
    nombre: str
    tipo_competidor: str = "equipo"
    esta_activo: bool = True
    es_obligatorio: bool = False


class DeporteCreate(DeporteBase):
    pass


class DeporteUpdate(BaseModel):
    nombre: str | None = None
    tipo_competidor: str | None = None
    esta_activo: bool | None = None


class DeporteOut(DeporteBase):
    id: int

    model_config = {"from_attributes": True}
