from pydantic import BaseModel, Field, field_validator


FORMATOS_TORNEO = ["liga", "eliminacion_simple", "grupos"]

ESTADOS_TORNEO = [
    "inscripcion_abierta",
    "inscripcion_cerrada",
    "en_sorteo",
    "en_curso",
    "finalizado",
    "suspendido",
]

TRANSICIONES = {
    "inscripcion_abierta":  "inscripcion_cerrada",
    "inscripcion_cerrada":  "en_sorteo",
    "en_sorteo":            "en_curso",
    "en_curso":             "finalizado",
}


class TorneoCreate(BaseModel):
    deporte_id: int
    nombre: str = Field(min_length=2, max_length=150)
    formato: str = "liga"
    temporada: str = Field(min_length=4, max_length=20)

    @field_validator("nombre", "temporada", mode="before")
    @classmethod
    def _trim(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("formato")
    @classmethod
    def _formato_valido(cls, v):
        if v not in FORMATOS_TORNEO:
            raise ValueError(f"Formato inválido. Opciones: {', '.join(FORMATOS_TORNEO)}")
        return v


class TorneoUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=150)
    formato: str | None = None
    temporada: str | None = Field(default=None, min_length=4, max_length=20)

    @field_validator("nombre", "temporada", mode="before")
    @classmethod
    def _trim(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("formato")
    @classmethod
    def _formato_valido(cls, v):
        if v is not None and v not in FORMATOS_TORNEO:
            raise ValueError(f"Formato inválido. Opciones: {', '.join(FORMATOS_TORNEO)}")
        return v


class TorneoOut(TorneoCreate):
    id: int
    estado: str

    model_config = {"from_attributes": True}
