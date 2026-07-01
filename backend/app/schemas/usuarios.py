from typing import Literal
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class PreguntasSeguridad(BaseModel):
    pregunta_seguridad_1: str
    respuesta_seguridad_1: str
    pregunta_seguridad_2: str
    respuesta_seguridad_2: str
    pregunta_seguridad_3: str
    respuesta_seguridad_3: str


class UsuarioCreate(BaseModel):
    nombres: str = Field(min_length=2, max_length=50)
    apellidos: str = Field(min_length=2, max_length=50)
    correo: EmailStr
    contrasena: str = Field(min_length=8, max_length=255)
    rol: Literal["institucion", "arbitro", "admin"] = "institucion"
    institucion_id: int | None = None
    pregunta_seguridad_1: str
    respuesta_seguridad_1: str
    pregunta_seguridad_2: str
    respuesta_seguridad_2: str
    pregunta_seguridad_3: str
    respuesta_seguridad_3: str

    @field_validator("nombres", "apellidos", mode="before")
    @classmethod
    def _trim(cls, v):
        return v.strip() if isinstance(v, str) else v

    @model_validator(mode="after")
    def _institucion_segun_rol(self):
        # Un usuario de rol "institucion" debe estar ligado a una institución;
        # admin y árbitro no deben llevar institución asociada.
        if self.rol == "institucion" and self.institucion_id is None:
            raise ValueError("Un usuario de institución debe tener institucion_id")
        if self.rol != "institucion" and self.institucion_id is not None:
            raise ValueError("Solo los usuarios de institución pueden tener institucion_id")
        return self


class UsuarioUpdate(BaseModel):
    """Edición parcial de un usuario por el admin (sin contraseña ni preguntas)."""
    nombres: str | None = Field(default=None, min_length=2, max_length=50)
    apellidos: str | None = Field(default=None, min_length=2, max_length=50)
    correo: EmailStr | None = None
    rol: Literal["institucion", "arbitro", "admin"] | None = None
    institucion_id: int | None = None

    @field_validator("nombres", "apellidos", mode="before")
    @classmethod
    def _trim(cls, v):
        return v.strip() if isinstance(v, str) else v


class UsuarioOut(BaseModel):
    id: int
    nombres: str
    apellidos: str
    correo: str
    rol: str
    esta_activo: bool
    institucion_id: int | None

    model_config = {"from_attributes": True}
