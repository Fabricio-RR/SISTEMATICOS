from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Inscripcion(Base):
    __tablename__ = "inscripciones"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    torneo_id: Mapped[int] = mapped_column(Integer, ForeignKey("torneos.id"))
    club_equipo_id: Mapped[int] = mapped_column(Integer, ForeignKey("club_equipo.id"))
    grupo_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("grupos.id"), nullable=True)
    numero_seeding: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estado: Mapped[str] = mapped_column(String(30), default="pendiente")  # pendiente, aprobado

    torneo: Mapped["Torneo"] = relationship("Torneo", back_populates="inscripciones")
    club_equipo: Mapped["ClubEquipo"] = relationship("ClubEquipo", back_populates="inscripciones")
    grupo: Mapped["Grupo | None"] = relationship("Grupo", back_populates="inscripciones")
    partidos_local: Mapped[list["Partido"]] = relationship(
        "Partido", foreign_keys="Partido.inscripcion_local_id", back_populates="local"
    )
    partidos_visitante: Mapped[list["Partido"]] = relationship(
        "Partido", foreign_keys="Partido.inscripcion_visitante_id", back_populates="visitante"
    )
