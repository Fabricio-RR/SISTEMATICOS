from pydantic import BaseModel, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    correo: EmailStr
    contrasena: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: str
    nombre: str


class RecoveryStep1Request(BaseModel):
    """Paso 1: el usuario ingresa su correo, recibe sus 3 preguntas."""
    correo: EmailStr


class RecoveryStep1Response(BaseModel):
    """Devuelve las 3 preguntas (sin revelar respuestas)."""
    correo: str
    pregunta_1: str
    pregunta_2: str
    pregunta_3: str


class RecoveryStep2Request(BaseModel):
    """Paso 2: el usuario responde las 3 preguntas y define nueva contraseña."""
    correo: EmailStr
    respuesta_1: str
    respuesta_2: str
    respuesta_3: str
    nueva_contrasena: str


class SolicitudAccesoRequest(BaseModel):
    """Formulario público para solicitar acceso institucional."""
    nombres: str
    apellidos: str
    correo: EmailStr
    contrasena: str = Field(min_length=8)
    nombre_institucion: str = Field(min_length=2, max_length=200)
    ciudad: str = Field(min_length=2, max_length=100)
    contacto: str | None = Field(default=None, max_length=200)
    categoria: str | None = None
    pregunta_seguridad_1: str
    respuesta_seguridad_1: str
    pregunta_seguridad_2: str
    respuesta_seguridad_2: str
    pregunta_seguridad_3: str
    respuesta_seguridad_3: str

    @field_validator("nombre_institucion", "ciudad", "nombres", "apellidos", "contacto", mode="before")
    @classmethod
    def _trim(cls, v):
        return v.strip() if isinstance(v, str) else v