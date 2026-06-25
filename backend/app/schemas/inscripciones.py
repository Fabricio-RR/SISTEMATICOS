from pydantic import BaseModel


class InscripcionCreate(BaseModel):
    torneo_id: int
    club_equipo_id: int


class InscripcionOut(BaseModel):
    id: int
    torneo_id: int
    club_equipo_id: int
    grupo_id: int | None
    numero_seeding: int | None
    estado: str

    model_config = {"from_attributes": True}


class InscripcionDetalle(BaseModel):
    id: int
    torneo_id: int
    club_equipo_id: int
    grupo_id: int | None
    numero_seeding: int | None
    estado: str
    nombre_equipo: str
    nombre_institucion: str
    nombre_deporte: str
    pais_asignado: str | None = None
    pais_emoji: str | None = None

    model_config = {"from_attributes": True}
