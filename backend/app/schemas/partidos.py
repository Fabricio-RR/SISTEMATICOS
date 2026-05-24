from pydantic import BaseModel, Field
from datetime import datetime


class InscripcionMin(BaseModel):
    id: int
    club_equipo_id: int
    club_nombre: str = ""

    model_config = {"from_attributes": True}


class PartidoCreate(BaseModel):
    fixture_id: int
    inscripcion_local_id: int
    inscripcion_visitante_id: int
    grupo_id: int | None = None
    sede_id: int | None = None
    arbitro_id: int | None = None
    ronda: str | None = None
    fecha_hora: datetime | None = None


class PartidoUpdate(BaseModel):
    sede_id: int | None = None
    arbitro_id: int | None = None
    fecha_hora: datetime | None = None
    ronda: str | None = None
    estado: str | None = None
    motivo_reprogramacion: str | None = None


class EventoPartidoCreate(BaseModel):
    atleta_jugador_id: int
    tipo_evento: str  # gol, puntos, tarjeta_amarilla, tarjeta_roja
    minuto: int | None = None
    descripcion: str | None = None


class EventoPartidoOut(BaseModel):
    id: int
    partido_id: int
    atleta_jugador_id: int | None
    tipo_evento: str
    minuto: int | None = None
    descripcion: str | None = None

    model_config = {"from_attributes": True}


class ResultadoUpdate(BaseModel):
    resultado_local: int = Field(..., ge=0, le=99)
    resultado_visitante: int = Field(..., ge=0, le=99)
    eventos: list[EventoPartidoCreate] | None = None


class PartidoOut(BaseModel):
    id: int
    fixture_id: int
    inscripcion_local_id: int
    inscripcion_visitante_id: int
    grupo_id: int | None
    sede_id: int | None
    arbitro_id: int | None
    ronda: str | None
    fecha_hora: datetime | None
    resultado_local: int | None
    resultado_visitante: int | None
    estado: str
    es_walkover: bool = False
    motivo_reprogramacion: str | None = None
    reprogramado_en: datetime | None = None
    local_nombre: str = ""
    visitante_nombre: str = ""
    local_club_equipo_id: int | None = None
    visitante_club_equipo_id: int | None = None
    torneo_nombre: str = ""
    sede_nombre: str = ""
    jornada: int = 0
    eventos: list[EventoPartidoOut] = []

    model_config = {"from_attributes": True}

