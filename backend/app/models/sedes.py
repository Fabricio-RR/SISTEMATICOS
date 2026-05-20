from sqlalchemy import String, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Sede(Base):
    __tablename__ = "sedes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre_sede: Mapped[str] = mapped_column(String(150))
    ciudad: Mapped[str] = mapped_column(String(100))
    capacidad: Mapped[int | None] = mapped_column(Integer, nullable=True)
    esta_activo: Mapped[bool] = mapped_column(Boolean, default=True)

    partidos: Mapped[list["Partido"]] = relationship("Partido", back_populates="sede")