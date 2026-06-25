from pydantic import BaseModel


class DeporteBase(BaseModel):
    nombre: str
    tipo_competidor: str = "equipo"
    min_jugadores: int = 1
    max_jugadores: int = 1
    esta_activo: bool = True
    tipo_estadistica: str = "otro"  # futbol | basket | voley | otro


class DeporteCreate(DeporteBase):
    pass


class DeporteUpdate(BaseModel):
    nombre: str | None = None
    tipo_competidor: str | None = None
    min_jugadores: int | None = None
    max_jugadores: int | None = None
    esta_activo: bool | None = None
    tipo_estadistica: str | None = None


class DeporteOut(DeporteBase):
    id: int

    model_config = {"from_attributes": True}
