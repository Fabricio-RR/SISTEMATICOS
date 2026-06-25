from pydantic import BaseModel


class ClubEquipoBase(BaseModel):
    institucion_id: int
    deporte_id: int
    nombre_equipo: str
    estado: str = "pendiente"


class ClubEquipoCreate(ClubEquipoBase):
    pass


class ClubEquipoUpdate(BaseModel):
    nombre_equipo: str | None = None
    estado: str | None = None


class ClubEquipoOut(ClubEquipoBase):
    id: int
    posicion_tabla: int
    puntos: int
    partidos_jugados: int
    partidos_ganados: int
    partidos_perdidos: int
    pais_asignado: str | None = None
    pais_emoji: str | None = None

    model_config = {"from_attributes": True}