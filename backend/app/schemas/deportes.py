from pydantic import BaseModel


class DeporteBase(BaseModel):
    nombre: str
    tipo_competidor: str = "equipo"
    esta_activo: bool = True


class DeporteCreate(DeporteBase):
    pass


class DeporteOut(DeporteBase):
    id: int

    model_config = {"from_attributes": True}
