from pydantic import BaseModel


class PosicionTabla(BaseModel):
    posicion: int
    equipo_id: int
    nombre_equipo: str
    puntos: int
    partidos_jugados: int
    partidos_ganados: int
    partidos_empatados: int
    partidos_perdidos: int
    goles_a_favor: int
    goles_en_contra: int
    diferencia_goles: int

    model_config = {"from_attributes": True}


class Goleador(BaseModel):
    posicion: int
    atleta_id: int
    nombre_completo: str
    nombre_equipo: str
    goles: int
    tarjetas_amarillas: int
    tarjetas_rojas: int
    etiqueta: str = "Goles"
