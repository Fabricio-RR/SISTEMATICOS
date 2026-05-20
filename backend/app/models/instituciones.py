from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Institucion(Base):
    __tablename__ = "instituciones"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(200))
    nombre_corto: Mapped[str] = mapped_column(String(50))
    ciudad: Mapped[str] = mapped_column(String(100))
    estado: Mapped[str] = mapped_column(String(30), default="activo")
    imagen_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    usuarios: Mapped[list["Usuario"]] = relationship("Usuario", back_populates="institucion")
    equipos: Mapped[list["ClubEquipo"]] = relationship("ClubEquipo", back_populates="institucion")