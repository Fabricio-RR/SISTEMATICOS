from pydantic import BaseModel, Field


class ClubMin(BaseModel):
    id: int
    nombre_equipo: str
    model_config = {"from_attributes": True}


class TorneoMin(BaseModel):
    id: int
    nombre: str
    model_config = {"from_attributes": True}


class InscripcionCreate(BaseModel):
    torneo_id: int
    club_equipo_id: int
    # El sembrado (orden de cabeza de serie), si se indica, debe ser positivo.
    numero_seeding: int | None = Field(default=None, ge=1)


class InscripcionOut(BaseModel):
    id: int
    torneo_id: int
    club_equipo_id: int
    grupo_id: int | None
    numero_seeding: int | None
    estado: str
    club_equipo: ClubMin | None = None
    torneo: TorneoMin | None = None

    model_config = {"from_attributes": True}
