from datetime import datetime, timezone
from sqlalchemy import String, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institucion_id: Mapped[int] = mapped_column(Integer, ForeignKey("instituciones.id"), index=True)
    partido_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("partidos.id", ondelete="SET NULL"), nullable=True)
    titulo: Mapped[str] = mapped_column(String(200))
    contenido: Mapped[str] = mapped_column(String(1000))
    leida: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    creada_en: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    institucion: Mapped["Institucion"] = relationship("Institucion")
