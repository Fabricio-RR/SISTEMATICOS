import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.partidos import Partido
from app.models.fixture import Fixture
from app.models.inscripciones import Inscripcion
from app.models.club_equipo import ClubEquipo
from app.models.auditoria import Auditoria
from app.schemas.partidos import PartidoUpdate, ResultadoUpdate, PartidoOut
from app.core.deps import require_admin, get_current_user, require_admin_or_arbitro
from app.models.usuarios import Usuario

router = APIRouter()


def _load_partido(partido_id: int, db: Session) -> Partido | None:
    return (
        db.query(Partido)
        .options(
            joinedload(Partido.fixture).joinedload(Fixture.torneo),
            joinedload(Partido.local).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.visitante).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.sede),
        )
        .filter(Partido.id == partido_id)
        .first()
    )


def _build_out(p: Partido) -> PartidoOut:
    out = PartidoOut.model_validate(p)
    if p.local and p.local.club_equipo:
        out.local_nombre = p.local.club_equipo.nombre_equipo
    if p.visitante and p.visitante.club_equipo:
        out.visitante_nombre = p.visitante.club_equipo.nombre_equipo
    if p.fixture:
        out.jornada = p.fixture.jornada
        if p.fixture.torneo:
            out.torneo_nombre = p.fixture.torneo.nombre
    return out


def _get_all_query(db: Session):
    return (
        db.query(Partido)
        .options(
            joinedload(Partido.fixture).joinedload(Fixture.torneo),
            joinedload(Partido.local).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.visitante).joinedload(Inscripcion.club_equipo),
            joinedload(Partido.sede),
        )
    )


@router.get("/", response_model=list[PartidoOut])
def get_all(torneo_id: int | None = None, estado: str | None = None, db: Session = Depends(get_db)):
    q = _get_all_query(db)
    if torneo_id:
        q = q.join(Fixture).filter(Fixture.torneo_id == torneo_id)
    if estado:
        q = q.filter(Partido.estado == estado)
    return [_build_out(p) for p in q.all()]


@router.get("/{id}", response_model=PartidoOut)
def get_by_id(id: int, db: Session = Depends(get_db)):
    p = _load_partido(id, db)
    if not p:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return _build_out(p)


@router.patch("/{id}", response_model=PartidoOut)
def update(id: int, data: PartidoUpdate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    p = db.query(Partido).filter(Partido.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    for field, val in data.model_dump(exclude_none=True).items():
        setattr(p, field, val)
    db.commit()
    return _build_out(_load_partido(id, db))


@router.patch("/{id}/resultado", response_model=PartidoOut)
def set_resultado(id: int, data: ResultadoUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(require_admin_or_arbitro)):
    p = db.query(Partido).filter(Partido.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    if p.estado == "finalizado":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El partido ya está finalizado. Usa PATCH /{id} para corregir el estado primero.",
        )

    p.resultado_local = data.resultado_local
    p.resultado_visitante = data.resultado_visitante
    p.estado = data.estado

    if data.estado == "finalizado":
        _actualizar_tabla(p, db)
        db.add(Auditoria(
            usuario_id=current_user.id,
            tabla_afectada="partidos",
            accion="UPDATE",
            valor_nuevo=json.dumps({"partido_id": p.id, "resultado_local": p.resultado_local, "resultado_visitante": p.resultado_visitante}),
        ))

    db.commit()
    return _build_out(_load_partido(id, db))


def _actualizar_tabla(partido: Partido, db: Session):
    local = db.query(ClubEquipo).filter(
        ClubEquipo.id == db.query(Inscripcion.club_equipo_id)
        .filter(Inscripcion.id == partido.inscripcion_local_id)
        .scalar_subquery()
    ).first()
    visitante = db.query(ClubEquipo).filter(
        ClubEquipo.id == db.query(Inscripcion.club_equipo_id)
        .filter(Inscripcion.id == partido.inscripcion_visitante_id)
        .scalar_subquery()
    ).first()

    if not local or not visitante:
        return

    rl, rv = partido.resultado_local, partido.resultado_visitante
    local.partidos_jugados += 1
    visitante.partidos_jugados += 1

    if rl > rv:
        local.partidos_ganados += 1
        local.puntos += 3
        visitante.partidos_perdidos += 1
    elif rv > rl:
        visitante.partidos_ganados += 1
        visitante.puntos += 3
        local.partidos_perdidos += 1
    else:
        local.puntos += 1
        visitante.puntos += 1
