from pydantic import BaseModel, Field, field_validator


class InstitucionBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=200)
    nombre_corto: str = Field(min_length=1, max_length=50)
    ciudad: str = Field(min_length=2, max_length=100)
    estado: str = "activo"
    imagen_url: str | None = Field(default=None, max_length=500)
    contacto: str | None = Field(default=None, max_length=200)
    categoria: str | None = Field(default=None, max_length=50)
    pais_representativo: str | None = Field(default=None, max_length=100)

    @field_validator("nombre", "nombre_corto", "ciudad", "contacto", mode="before")
    @classmethod
    def _trim(cls, v):
        # Evita que espacios al inicio/fin generen "duplicados" o nombres vacíos.
        return v.strip() if isinstance(v, str) else v


class InstitucionCreate(InstitucionBase):
    pass


class InstitucionUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=200)
    nombre_corto: str | None = Field(default=None, min_length=1, max_length=50)
    ciudad: str | None = Field(default=None, min_length=2, max_length=100)
    estado: str | None = None
    imagen_url: str | None = Field(default=None, max_length=500)
    contacto: str | None = Field(default=None, max_length=200)
    categoria: str | None = Field(default=None, max_length=50)
    pais_representativo: str | None = Field(default=None, max_length=100)

    @field_validator("nombre", "nombre_corto", "ciudad", "contacto", mode="before")
    @classmethod
    def _trim(cls, v):
        return v.strip() if isinstance(v, str) else v


class InstitucionOut(InstitucionBase):
    id: int

    model_config = {"from_attributes": True}


class InstitucionSimilar(BaseModel):
    """Institución ya registrada que podría ser un duplicado de la que se intenta crear."""
    id: int
    nombre: str
    nombre_corto: str
    ciudad: str
    estado: str
    motivo: str          # "exacto" | "sigla" | "parecido"
    exacto: bool         # True solo en coincidencia idéntica tras normalizar

    model_config = {"from_attributes": True}
