from pydantic import BaseModel, EmailStr


class PreguntasSeguridad(BaseModel):
    pregunta_seguridad_1: str
    respuesta_seguridad_1: str
    pregunta_seguridad_2: str
    respuesta_seguridad_2: str
    pregunta_seguridad_3: str
    respuesta_seguridad_3: str


class UsuarioCreate(BaseModel):
    nombres: str
    apellidos: str
    correo: EmailStr
    contrasena: str
    rol: str = "institucion"
    institucion_id: int | None = None
    pregunta_seguridad_1: str
    respuesta_seguridad_1: str
    pregunta_seguridad_2: str
    respuesta_seguridad_2: str
    pregunta_seguridad_3: str
    respuesta_seguridad_3: str


class UsuarioOut(BaseModel):
    id: int
    nombres: str
    apellidos: str
    correo: str
    rol: str
    esta_activo: bool
    institucion_id: int | None
    pregunta_seguridad_1: str | None
    pregunta_seguridad_2: str | None
    pregunta_seguridad_3: str | None

    model_config = {"from_attributes": True}
