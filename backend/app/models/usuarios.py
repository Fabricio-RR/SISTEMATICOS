from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    institucion_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("instituciones.id"), nullable=True)
    nombres: Mapped[str] = mapped_column(String(100))
    apellidos: Mapped[str] = mapped_column(String(100))
    correo: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    contrasena_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[str] = mapped_column(String(30), default="institucion")  # admin, institucion, arbitro
    esta_activo: Mapped[bool] = mapped_column(Boolean, default=True)

    # Preguntas de seguridad para recuperación de contraseña (respuestas almacenadas como hash)
    pregunta_seguridad_1: Mapped[str | None] = mapped_column(String(300), nullable=True)
    respuesta_seguridad_1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pregunta_seguridad_2: Mapped[str | None] = mapped_column(String(300), nullable=True)
    respuesta_seguridad_2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pregunta_seguridad_3: Mapped[str | None] = mapped_column(String(300), nullable=True)
    respuesta_seguridad_3: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    institucion: Mapped["Institucion | None"] = relationship("Institucion", back_populates="usuarios")
    auditorias: Mapped[list["Auditoria"]] = relationship("Auditoria", back_populates="usuario")
    partidos_arbitrados: Mapped[list["Partido"]] = relationship("Partido", back_populates="arbitro")
