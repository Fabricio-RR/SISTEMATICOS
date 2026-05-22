from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.inscripciones import Inscripcion
from app.models.club_equipo import ClubEquipo
from app.models.torneos import Torneo
from app.models.auditoria import Auditoria
from app.schemas.inscripciones import InscripcionCreate, InscripcionOut
from app.core.deps import require_admin, get_current_user
from app.models.usuarios import Usuario

router = APIRouter()


def _enrich(insc: Inscripcion) -> InscripcionOut:
    out = InscripcionOut.model_validate(insc)
    if insc.club_equipo:
        out.club_equipo = insc.club_equipo  # type: ignore
    if insc.torneo:
        out.torneo = insc.torneo  # type: ignore
    return out


@router.get("/", response_model=list[InscripcionOut])
def get_all(torneo_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Inscripcion).options(
        joinedload(Inscripcion.club_equipo),
        joinedload(Inscripcion.torneo),
    )
    if torneo_id:
        q = q.filter(Inscripcion.torneo_id == torneo_id)
    return [_enrich(i) for i in q.all()]


@router.post("/", response_model=InscripcionOut, status_code=status.HTTP_201_CREATED)
def create(data: InscripcionCreate, db: Session = Depends(get_db), current: Usuario = Depends(get_current_user)):
    torneo = db.query(Torneo).filter(Torneo.id == data.torneo_id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    if torneo.estado == "finalizado":
        raise HTTPException(status_code=400, detail="No se pueden inscribir equipos en un torneo finalizado")

    club = db.query(ClubEquipo).filter(ClubEquipo.id == data.club_equipo_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if current.rol != "admin" and club.institucion_id != current.institucion_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo puedes inscribir equipos de tu institución")

    existe = db.query(Inscripcion).filter(
        Inscripcion.torneo_id == data.torneo_id,
        Inscripcion.club_equipo_id == data.club_equipo_id,
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="El equipo ya está inscrito en este torneo")

    insc = Inscripcion(**data.model_dump())
    if current.rol == "admin":
        insc.estado = "aprobado"
    db.add(insc)
    db.commit()
    db.refresh(insc)
    db.refresh(insc, ["club_equipo", "torneo"])
    return _enrich(insc)


@router.patch("/{id}/aprobar", response_model=InscripcionOut)
def aprobar(id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(require_admin)):
    insc = db.query(Inscripcion).options(
        joinedload(Inscripcion.club_equipo), joinedload(Inscripcion.torneo)
    ).filter(Inscripcion.id == id).first()
    if not insc:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    insc.estado = "aprobado"
    db.add(Auditoria(
        usuario_id=current_user.id,
        tabla_afectada="inscripciones",
        accion="UPDATE",
        valor_nuevo=f"inscripcion_id={id} aprobada",
    ))
    db.commit()
    return _enrich(insc)


@router.patch("/{id}/rechazar", response_model=InscripcionOut)
def rechazar(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    insc = db.query(Inscripcion).options(
        joinedload(Inscripcion.club_equipo), joinedload(Inscripcion.torneo)
    ).filter(Inscripcion.id == id).first()
    if not insc:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    insc.estado = "rechazado"
    db.commit()
    return _enrich(insc)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    insc = db.query(Inscripcion).filter(Inscripcion.id == id).first()
    if not insc:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    db.delete(insc)
    db.commit()
