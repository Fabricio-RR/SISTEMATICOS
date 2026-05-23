from pydantic import BaseModel


ESTADOS_TORNEO = [
    "inscripcion_abierta",
    "inscripcion_cerrada",
    "en_sorteo",
    "en_curso",
    "finalizado",
    "suspendido",
]

TRANSICIONES = {
    "inscripcion_abierta":  "inscripcion_cerrada",
    "inscripcion_cerrada":  "en_sorteo",
    "en_sorteo":            "en_curso",
    "en_curso":             "finalizado",
}


class TorneoCreate(BaseModel):
    deporte_id: int
    nombre: str
    formato: str = "liga"
    temporada: str


class TorneoOut(TorneoCreate):
    id: int
    estado: str

    model_config = {"from_attributes": True}