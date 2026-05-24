from sqlalchemy import String, Boolean, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Deporte(Base):
    __tablename__ = "deportes"
    __table_args__ = (
        CheckConstraint(
            "tipo_competidor IN ('equipo', 'individual')",
            name="ck_deporte_tipo_competidor",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100))
    tipo_competidor: Mapped[str] = mapped_column(String(20), default="equipo")  # equipo, individual
    esta_activo: Mapped[bool] = mapped_column(Boolean, default=True)
    es_obligatorio: Mapped[bool] = mapped_column(Boolean, default=False)

    equipos: Mapped[list["ClubEquipo"]] = relationship("ClubEquipo", back_populates="deporte")
    torneos: Mapped[list["Torneo"]] = relationship("Torneo", back_populates="deporte")
