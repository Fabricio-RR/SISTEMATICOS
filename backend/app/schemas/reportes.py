from pydantic import BaseModel

# Schemas de salida de los reportes (lo que devuelve cada endpoint de /reportes).


class ResumenGeneral(BaseModel):
    instituciones: int
    equipos: int
    atletas: int
    deportes: int
    torneos: int
    partidos_jugados: int


class ParticipantesInstitucion(BaseModel):
    institucion_id: int
    institucion: str
    equipos: int
    atletas: int


class EquiposPorDeporte(BaseModel):
    deporte_id: int
    deporte: str
    equipos: int
