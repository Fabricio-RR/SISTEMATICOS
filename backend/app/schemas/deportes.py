from pydantic import BaseModel, Field, field_validator


TIPOS_COMPETIDOR = ["equipo", "individual"]


def _validar_tipo(v):
    if v is not None and v not in TIPOS_COMPETIDOR:
        raise ValueError(f"Tipo de competidor inválido. Opciones: {', '.join(TIPOS_COMPETIDOR)}")
    return v


class DeporteBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    tipo_competidor: str = "equipo"
    esta_activo: bool = True
    es_obligatorio: bool = False

    @field_validator("nombre", mode="before")
    @classmethod
    def _trim(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("tipo_competidor")
    @classmethod
    def _tipo(cls, v):
        return _validar_tipo(v)


class DeporteCreate(DeporteBase):
    pass


class DeporteUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    tipo_competidor: str | None = None
    esta_activo: bool | None = None

    @field_validator("nombre", mode="before")
    @classmethod
    def _trim(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("tipo_competidor")
    @classmethod
    def _tipo(cls, v):
        return _validar_tipo(v)


class DeporteOut(DeporteBase):
    id: int

    model_config = {"from_attributes": True}
