from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Torneo(Base):
    __tablename__ = "torneos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    deporte_id: Mapped[int] = mapped_column(Integer, ForeignKey("deportes.id"))
    nombre: Mapped[str] = mapped_column(String(150))
    formato: Mapped[str] = mapped_column(String(30), default="liga")  # liga, eliminacion_simple, grupos
    temporada: Mapped[str] = mapped_column(String(20))
    estado: Mapped[str] = mapped_column(String(30), default="activo")

    deporte: Mapped["Deporte"] = relationship("Deporte", back_populates="torneos")
    grupos: Mapped[list["Grupo"]] = relationship("Grupo", back_populates="torneo")
    inscripciones: Mapped[list["Inscripcion"]] = relationship("Inscripcion", back_populates="torneo")
    fixtures: Mapped[list["Fixture"]] = relationship("Fixture", back_populates="torneo")