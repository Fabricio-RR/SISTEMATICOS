from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ClubEquipo(Base):
    __tablename__ = "club_equipo"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institucion_id: Mapped[int] = mapped_column(Integer, ForeignKey("instituciones.id"))
    deporte_id: Mapped[int] = mapped_column(Integer, ForeignKey("deportes.id"))
    nombre_equipo: Mapped[str] = mapped_column(String(150))
    estado: Mapped[str] = mapped_column(String(30), default="pendiente")  # pendiente, aprobado, rechazado
    posicion_tabla: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    puntos: Mapped[int] = mapped_column(Integer, default=0)
    partidos_jugados: Mapped[int] = mapped_column(Integer, default=0)
    partidos_ganados: Mapped[int] = mapped_column(Integer, default=0)
    partidos_perdidos: Mapped[int] = mapped_column(Integer, default=0)

    institucion: Mapped["Institucion"] = relationship("Institucion", back_populates="equipos")
    deporte: Mapped["Deporte"] = relationship("Deporte", back_populates="equipos")
    atletas: Mapped[list["AtletaJugador"]] = relationship("AtletaJugador", back_populates="club_equipo")
    inscripciones: Mapped[list["Inscripcion"]] = relationship("Inscripcion", back_populates="club_equipo")
