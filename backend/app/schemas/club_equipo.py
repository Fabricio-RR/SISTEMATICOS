from pydantic import BaseModel, Field, field_validator


class ClubEquipoCreate(BaseModel):
    institucion_id: int
    deporte_id: int
    nombre_equipo: str = Field(min_length=2, max_length=150)

    @field_validator("nombre_equipo", mode="before")
    @classmethod
    def _trim(cls, v):
        return v.strip() if isinstance(v, str) else v


class ClubEquipoUpdate(BaseModel):
    nombre_equipo: str | None = Field(default=None, min_length=2, max_length=150)

    @field_validator("nombre_equipo", mode="before")
    @classmethod
    def _trim(cls, v):
        return v.strip() if isinstance(v, str) else v


class ClubEquipoOut(BaseModel):
    id: int
    institucion_id: int
    deporte_id: int
    nombre_equipo: str
    estado: str

    model_config = {"from_attributes": True}
