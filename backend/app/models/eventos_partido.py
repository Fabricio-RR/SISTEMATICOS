from sqlalchemy import String, Integer, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EventoPartido(Base):
    __tablename__ = "eventos_partido"
    __table_args__ = (
        CheckConstraint(
            "tipo_evento IN ('gol', 'puntos', 'tarjeta_amarilla', 'tarjeta_roja', 'falta', 'tiempo')",
            name="ck_evento_tipo",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    partido_id: Mapped[int] = mapped_column(Integer, ForeignKey("partidos.id", ondelete="CASCADE"))
    atleta_jugador_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("atleta_jugador.id", ondelete="SET NULL"), nullable=True)
    tipo_evento: Mapped[str] = mapped_column(String(30))  # gol, puntos, tarjeta_amarilla, tarjeta_roja, falta, tiempo
    minuto: Mapped[int | None] = mapped_column(Integer, nullable=True)
    descripcion: Mapped[str | None] = mapped_column(String(300), nullable=True)

    partido: Mapped["Partido"] = relationship("Partido", back_populates="eventos")
    atleta_jugador: Mapped["AtletaJugador | None"] = relationship("AtletaJugador", back_populates="eventos")
