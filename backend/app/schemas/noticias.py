from pydantic import BaseModel
from datetime import datetime


class NoticiaBase(BaseModel):
    titulo: str
    contenido: str
    imagen_url: str | None = None
    esta_publicado: bool = False
    fecha_publicacion: datetime | None = None


class NoticiaCreate(NoticiaBase):
    pass


class NoticiaUpdate(BaseModel):
    titulo: str | None = None
    contenido: str | None = None
    imagen_url: str | None = None
    esta_publicado: bool | None = None
    fecha_publicacion: datetime | None = None


class NoticiaOut(NoticiaBase):
    id: int

    model_config = {"from_attributes": True}