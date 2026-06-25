from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.club_equipo import ClubEquipo
from app.models.instituciones import Institucion
from app.schemas.club_equipo import ClubEquipoCreate, ClubEquipoUpdate, ClubEquipoOut
from app.core.deps import get_current_user, require_admin
from app.core.pais_categoria import asignar_pais, LISTA_PAISES
from app.models.usuarios import Usuario

router = APIRouter()


def _asignar_pais_equipo(db: Session, equipo: ClubEquipo) -> None:
    """Asigna país al equipo basado en la institución; garantiza unicidad por deporte."""
    inst = db.query(Institucion).filter(Institucion.id == equipo.institucion_id).first()
    if not inst:
        return
    deseado_pais, deseado_emoji = asignar_pais(inst.nivel, inst.categoria)
    if not deseado_pais:
        # Si la institución no tiene nivel/categoría, tomar el primero disponible
        deseado_pais, deseado_emoji = LISTA_PAISES[0]

    tomados = {
        e.pais_asignado
        for e in db.query(ClubEquipo).filter(
            ClubEquipo.deporte_id == equipo.deporte_id,
            ClubEquipo.id != equipo.id,
        ).all()
        if e.pais_asignado
    }

    if deseado_pais not in tomados:
        equipo.pais_asignado = deseado_pais
        equipo.pais_emoji = deseado_emoji
    else:
        for pais, emoji in LISTA_PAISES:
            if pais not in tomados:
                equipo.pais_asignado = pais
                equipo.pais_emoji = emoji
                break


@router.get("/", response_model=list[ClubEquipoOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(ClubEquipo).all()


@router.get("/{id}", response_model=ClubEquipoOut)
def get_by_id(id: int, db: Session = Depends(get_db)):
    equipo = db.query(ClubEquipo).filter(ClubEquipo.id == id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return equipo


@router.post("/", response_model=ClubEquipoOut, status_code=status.HTTP_201_CREATED)
def create(data: ClubEquipoCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    equipo = ClubEquipo(**data.model_dump())
    db.add(equipo)
    db.flush()  # obtiene id antes de commit para poder excluirlo en uniqueness check
    _asignar_pais_equipo(db, equipo)
    db.commit()
    db.refresh(equipo)
    return equipo


@router.put("/{id}", response_model=ClubEquipoOut)
def update(id: int, data: ClubEquipoUpdate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    equipo = db.query(ClubEquipo).filter(ClubEquipo.id == id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(equipo, field, value)
    db.commit()
    db.refresh(equipo)
    return equipo