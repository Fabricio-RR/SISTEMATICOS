from pydantic import BaseModel


class SedeBase(BaseModel):
    nombre_sede: str
    ciudad: str
    capacidad: int | None = None
    esta_activo: bool = True


class SedeCreate(SedeBase):
    pass


class SedeUpdate(BaseModel):
    nombre_sede: str | None = None
    ciudad: str | None = None
    capacidad: int | None = None


class SedeOut(SedeBase):
    id: int

    model_config = {"from_attributes": True}
