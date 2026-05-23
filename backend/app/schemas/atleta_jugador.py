from pydantic import BaseModel, Field


class AtletaCreate(BaseModel):
    club_equipo_id: int
    nombre_completo: str
    numero_camiseta: str | None = None
    posicion_rol: str | None = None
    documento_identidad: str


class AtletaUpdate(BaseModel):
    nombre_completo: str | None = None
    numero_camiseta: str | None = None
    posicion_rol: str | None = None
    goles_anotados: int | None = Field(default=None, ge=0)
    puntos_anotados: int | None = Field(default=None, ge=0)
    tarjetas_amarillas: int | None = Field(default=None, ge=0)
    tarjetas_rojas: int | None = Field(default=None, ge=0)
    estado: str | None = None


class AtletaOut(BaseModel):
    id: int
    club_equipo_id: int
    nombre_completo: str
    numero_camiseta: str | None
    posicion_rol: str | None
    documento_identidad: str
    goles_anotados: int
    puntos_anotados: int
    tarjetas_amarillas: int
    tarjetas_rojas: int
    estado: str

    model_config = {"from_attributes": True}
