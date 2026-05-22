from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EventoPartido(Base):
    __tablename__ = "eventos_partido"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    partido_id: Mapped[int] = mapped_column(Integer, ForeignKey("partidos.id"))
    atleta_jugador_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("atleta_jugador.id"), nullable=True)
    tipo_evento: Mapped[str] = mapped_column(String(30))  # gol, tarjeta_amarilla, tarjeta_roja, falta, tiempo
    minuto: Mapped[int | None] = mapped_column(Integer, nullable=True)
    descripcion: Mapped[str | None] = mapped_column(String(300), nullable=True)

    partido: Mapped["Partido"] = relationship("Partido", back_populates="eventos")
    atleta_jugador: Mapped["AtletaJugador | None"] = relationship("AtletaJugador", back_populates="eventos")
