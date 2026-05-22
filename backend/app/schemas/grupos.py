from pydantic import BaseModel


class GrupoCreate(BaseModel):
    torneo_id: int
    nombre_grupo: str
    orden: int = 1


class GrupoOut(BaseModel):
    id: int
    torneo_id: int
    nombre_grupo: str
    orden: int

    model_config = {"from_attributes": True}
