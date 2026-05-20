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


class NoticiaOut(NoticiaBase):
    id: int

    model_config = {"from_attributes": True}