from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Inscripcion(Base):
    __tablename__ = "inscripciones"
    __table_args__ = (
        UniqueConstraint("torneo_id", "club_equipo_id", name="uq_inscripcion_torneo_equipo"),
        CheckConstraint(
            "estado IN ('pendiente', 'aprobado', 'rechazado', 'retirado')",
            name="ck_inscripcion_estado",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    torneo_id: Mapped[int] = mapped_column(Integer, ForeignKey("torneos.id"))
    club_equipo_id: Mapped[int] = mapped_column(Integer, ForeignKey("club_equipo.id"))
    grupo_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("grupos.id"), nullable=True)
    numero_seeding: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estado: Mapped[str] = mapped_column(String(30), default="pendiente")  # pendiente, aprobado
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    puntos: Mapped[int] = mapped_column(Integer, default=0)
    partidos_jugados: Mapped[int] = mapped_column(Integer, default=0)
    partidos_ganados: Mapped[int] = mapped_column(Integer, default=0)
    partidos_empatados: Mapped[int] = mapped_column(Integer, default=0)
    partidos_perdidos: Mapped[int] = mapped_column(Integer, default=0)
    goles_a_favor: Mapped[int] = mapped_column(Integer, default=0)
    goles_en_contra: Mapped[int] = mapped_column(Integer, default=0)

    torneo: Mapped["Torneo"] = relationship("Torneo", back_populates="inscripciones")
    club_equipo: Mapped["ClubEquipo"] = relationship("ClubEquipo", back_populates="inscripciones")
    grupo: Mapped["Grupo | None"] = relationship("Grupo", back_populates="inscripciones")
    partidos_local: Mapped[list["Partido"]] = relationship(
        "Partido", foreign_keys="Partido.inscripcion_local_id", back_populates="local"
    )
    partidos_visitante: Mapped[list["Partido"]] = relationship(
        "Partido", foreign_keys="Partido.inscripcion_visitante_id", back_populates="visitante"
    )
