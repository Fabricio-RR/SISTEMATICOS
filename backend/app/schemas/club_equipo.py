from pydantic import BaseModel


class ClubEquipoCreate(BaseModel):
    institucion_id: int
    deporte_id: int
    nombre_equipo: str


class ClubEquipoUpdate(BaseModel):
    nombre_equipo: str | None = None


class ClubEquipoOut(BaseModel):
    id: int
    institucion_id: int
    deporte_id: int
    nombre_equipo: str
    estado: str

    model_config = {"from_attributes": True}