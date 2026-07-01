from sqlalchemy import String, Boolean, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from app.database import Base


class Noticia(Base):
    __tablename__ = "noticias"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    titulo: Mapped[str] = mapped_column(String(250))
    contenido: Mapped[str] = mapped_column(Text)
    imagen_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    esta_publicado: Mapped[bool] = mapped_column(Boolean, default=False)
    fecha_publicacion: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
