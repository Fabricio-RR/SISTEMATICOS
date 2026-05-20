from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Grupo(Base):
    __tablename__ = "grupos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    torneo_id: Mapped[int] = mapped_column(Integer, ForeignKey("torneos.id"))
    nombre_grupo: Mapped[str] = mapped_column(String(50))
    orden: Mapped[int] = mapped_column(Integer, default=1)

    torneo: Mapped["Torneo"] = relationship("Torneo", back_populates="grupos")
    inscripciones: Mapped[list["Inscripcion"]] = relationship("Inscripcion", back_populates="grupo")
    partidos: Mapped[list["Partido"]] = relationship("Partido", back_populates="grupo")