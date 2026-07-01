from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, DateTime, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Torneo(Base):
    __tablename__ = "torneos"
    __table_args__ = (
        CheckConstraint(
            "formato IN ('liga', 'eliminacion_simple', 'grupos')",
            name="ck_torneo_formato",
        ),
        CheckConstraint(
            "estado IN ('inscripcion_abierta', 'inscripcion_cerrada', 'en_sorteo', 'en_curso', 'finalizado', 'suspendido')",
            name="ck_torneo_estado",
        ),
        UniqueConstraint("deporte_id", "nombre", "temporada", name="uq_torneo_deporte_nombre_temporada"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    deporte_id: Mapped[int] = mapped_column(Integer, ForeignKey("deportes.id"))
    nombre: Mapped[str] = mapped_column(String(150))
    formato: Mapped[str] = mapped_column(String(30), default="liga")  # liga, eliminacion_simple, grupos
    temporada: Mapped[str] = mapped_column(String(20))
    estado: Mapped[str] = mapped_column(String(30), default="inscripcion_abierta")
    estado_previo: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    deporte: Mapped["Deporte"] = relationship("Deporte", back_populates="torneos")
    grupos: Mapped[list["Grupo"]] = relationship("Grupo", back_populates="torneo", cascade="all, delete-orphan")
    inscripciones: Mapped[list["Inscripcion"]] = relationship("Inscripcion", back_populates="torneo")
    fixtures: Mapped[list["Fixture"]] = relationship("Fixture", back_populates="torneo", cascade="all, delete-orphan")
