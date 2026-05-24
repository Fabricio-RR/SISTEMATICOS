from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone

from app.database import Base


class Auditoria(Base):
    __tablename__ = "auditoria"
    __table_args__ = (
        CheckConstraint(
            "accion IN ('INSERT', 'UPDATE', 'DELETE')",
            name="ck_auditoria_accion",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    usuario_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    tabla_afectada: Mapped[str] = mapped_column(String(100))
    accion: Mapped[str] = mapped_column(String(20))  # INSERT, UPDATE, DELETE
    valor_anterior: Mapped[str | None] = mapped_column(Text, nullable=True)
    valor_nuevo: Mapped[str | None] = mapped_column(Text, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    usuario: Mapped["Usuario | None"] = relationship("Usuario", back_populates="auditorias")
