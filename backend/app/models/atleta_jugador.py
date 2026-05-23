from sqlalchemy import String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AtletaJugador(Base):
    __tablename__ = "atleta_jugador"
    __table_args__ = (
        UniqueConstraint(
            "club_equipo_id",
            "documento_identidad",
            name="uq_atleta_equipo_documento",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    club_equipo_id: Mapped[int] = mapped_column(Integer, ForeignKey("club_equipo.id"))
    nombre_completo: Mapped[str] = mapped_column(String(200))
    numero_camiseta: Mapped[str | None] = mapped_column(String(10), nullable=True)
    posicion_rol: Mapped[str | None] = mapped_column(String(50), nullable=True)
    documento_identidad: Mapped[str] = mapped_column(String(20))
    goles_anotados: Mapped[int] = mapped_column(Integer, default=0)
    puntos_anotados: Mapped[int] = mapped_column(Integer, default=0)
    tarjetas_amarillas: Mapped[int] = mapped_column(Integer, default=0)
    tarjetas_rojas: Mapped[int] = mapped_column(Integer, default=0)
    estado: Mapped[str] = mapped_column(String(30), default="activo")

    club_equipo: Mapped["ClubEquipo"] = relationship("ClubEquipo", back_populates="atletas")
    eventos: Mapped[list["EventoPartido"]] = relationship("EventoPartido", back_populates="atleta_jugador")
