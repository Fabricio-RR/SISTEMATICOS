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
    posicion_tabla: int
    puntos: int
    partidos_jugados: int
    partidos_ganados: int
    partidos_perdidos: int

    model_config = {"from_attributes": True}