from sqlalchemy import String, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Deporte(Base):
    __tablename__ = "deportes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100))
    tipo_competidor: Mapped[str] = mapped_column(String(20), default="equipo")  # equipo, individual
    min_jugadores: Mapped[int] = mapped_column(Integer, default=1)
    max_jugadores: Mapped[int] = mapped_column(Integer, default=1)
    esta_activo: Mapped[bool] = mapped_column(Boolean, default=True)
    tipo_estadistica: Mapped[str] = mapped_column(String(20), default="otro")  # futbol, basket, voley, otro

    equipos: Mapped[list["ClubEquipo"]] = relationship("ClubEquipo", back_populates="deporte")
    torneos: Mapped[list["Torneo"]] = relationship("Torneo", back_populates="deporte")
