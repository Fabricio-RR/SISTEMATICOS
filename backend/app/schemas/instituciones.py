from pydantic import BaseModel


class InstitucionBase(BaseModel):
    nombre: str
    nombre_corto: str
    ciudad: str
    estado: str = "activo"
    imagen_url: str | None = None
    contacto: str | None = None
    categoria: str | None = None
    pais_representativo: str | None = None


class InstitucionCreate(InstitucionBase):
    pass


class InstitucionUpdate(BaseModel):
    nombre: str | None = None
    nombre_corto: str | None = None
    ciudad: str | None = None
    estado: str | None = None
    imagen_url: str | None = None
    contacto: str | None = None
    categoria: str | None = None
    pais_representativo: str | None = None


class InstitucionOut(InstitucionBase):
    id: int

    model_config = {"from_attributes": True}
