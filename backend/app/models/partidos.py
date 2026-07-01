from sqlalchemy import String, Integer, Boolean, ForeignKey, DateTime, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.database import Base


class Partido(Base):
    __tablename__ = "partidos"
    __table_args__ = (
        CheckConstraint(
            "inscripcion_local_id <> inscripcion_visitante_id",
            name="ck_partido_equipos_distintos",
        ),
        CheckConstraint(
            "estado IN ('programado', 'en_curso', 'finalizado')",
            name="ck_partido_estado",
        ),
        CheckConstraint(
            "resultado_local IS NULL OR resultado_local >= 0",
            name="ck_partido_resultado_local_positivo",
        ),
        CheckConstraint(
            "resultado_visitante IS NULL OR resultado_visitante >= 0",
            name="ck_partido_resultado_visitante_positivo",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    fixture_id: Mapped[int] = mapped_column(Integer, ForeignKey("fixture.id"))
    inscripcion_local_id: Mapped[int] = mapped_column(Integer, ForeignKey("inscripciones.id"))
    inscripcion_visitante_id: Mapped[int] = mapped_column(Integer, ForeignKey("inscripciones.id"))
    grupo_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("grupos.id"), nullable=True)
    sede_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("sedes.id"), nullable=True)
    arbitro_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("usuarios.id"), nullable=True)
    ronda: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fecha_hora: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resultado_local: Mapped[int | None] = mapped_column(Integer, nullable=True)
    resultado_visitante: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estado: Mapped[str] = mapped_column(String(30), default="programado")  # programado, en_curso, finalizado
    es_walkover: Mapped[bool] = mapped_column(Boolean, default=False)
    motivo_reprogramacion: Mapped[str | None] = mapped_column(String(500), nullable=True)
    reprogramado_en: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    fixture: Mapped["Fixture"] = relationship("Fixture", back_populates="partidos")
    local: Mapped["Inscripcion"] = relationship(
        "Inscripcion", foreign_keys=[inscripcion_local_id], back_populates="partidos_local"
    )
    visitante: Mapped["Inscripcion"] = relationship(
        "Inscripcion", foreign_keys=[inscripcion_visitante_id], back_populates="partidos_visitante"
    )
    grupo: Mapped["Grupo | None"] = relationship("Grupo", back_populates="partidos")
    sede: Mapped["Sede | None"] = relationship("Sede", back_populates="partidos")
    arbitro: Mapped["Usuario | None"] = relationship("Usuario", back_populates="partidos_arbitrados")
    eventos: Mapped[list["EventoPartido"]] = relationship("EventoPartido", back_populates="partido")
