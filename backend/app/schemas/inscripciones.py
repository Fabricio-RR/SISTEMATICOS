from pydantic import BaseModel


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
    numero_seeding: int | None = None


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
