from sqlalchemy import String, Integer, ForeignKey, DateTime, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.database import Base


class Fixture(Base):
    __tablename__ = "fixture"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('activo', 'inactivo')",
            name="ck_fixture_estado",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    torneo_id: Mapped[int] = mapped_column(Integer, ForeignKey("torneos.id"))
    jornada: Mapped[int] = mapped_column(Integer)
    nombre_fase: Mapped[str] = mapped_column(String(100))
    fecha_generacion: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    estado: Mapped[str] = mapped_column(String(30), default="activo")

    torneo: Mapped["Torneo"] = relationship("Torneo", back_populates="fixtures")
    partidos: Mapped[list["Partido"]] = relationship("Partido", back_populates="fixture")
