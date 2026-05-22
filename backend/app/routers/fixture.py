from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.fixture import Fixture
from app.models.partidos import Partido
from app.models.inscripciones import Inscripcion
from app.models.torneos import Torneo
from app.schemas.fixture import FixtureOut, GenerarFixtureRequest
from app.schemas.partidos import PartidoOut
from app.core.deps import require_admin
from app.models.usuarios import Usuario

router = APIRouter()


def _round_robin(teams: list) -> list[list[tuple]]:
    """Genera jornadas round-robin. Retorna lista de jornadas, cada jornada con pares (local, visitante)."""
    if len(teams) % 2:
        teams = teams + [None]
    n = len(teams)
    rounds = []
    teams = list(teams)
    for _ in range(n - 1):
        pares = []
        for i in range(n // 2):
            home = teams[i]
            away = teams[n - 1 - i]
            if home is not None and away is not None:
                pares.append((home, away))
        rounds.append(pares)
        teams.insert(1, teams.pop())
    return rounds


def _build_partido_out(p: Partido) -> PartidoOut:
    out = PartidoOut.model_validate(p)
    if p.local and p.local.club_equipo:
        out.local_nombre = p.local.club_equipo.nombre_equipo
    if p.visitante and p.visitante.club_equipo:
        out.visitante_nombre = p.visitante.club_equipo.nombre_equipo
    if p.fixture and p.fixture.torneo:
        out.torneo_nombre = p.fixture.torneo.nombre
        out.jornada = p.fixture.jornada
    return out


@router.get("/", response_model=list[FixtureOut])
def get_all(torneo_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Fixture)
    if torneo_id:
        q = q.filter(Fixture.torneo_id == torneo_id)
    return q.order_by(Fixture.torneo_id, Fixture.jornada).all()


@router.post("/generar", response_model=list[FixtureOut], status_code=status.HTTP_201_CREATED)
def generar(data: GenerarFixtureRequest, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    torneo = db.query(Torneo).filter(Torneo.id == data.torneo_id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")

    inscripciones = db.query(Inscripcion).filter(
        Inscripcion.torneo_id == data.torneo_id,
        Inscripcion.estado == "aprobado",
    ).all()

    if len(inscripciones) < 2:
        raise HTTPException(status_code=400, detail="Se necesitan al menos 2 equipos aprobados para generar el fixture")

    fixtures_existentes = db.query(Fixture).filter(Fixture.torneo_id == data.torneo_id).count()
    if fixtures_existentes > 0 and not data.force:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un fixture con {fixtures_existentes} jornadas. Envía force=true para regenerarlo.",
        )

    db.query(Partido).filter(
        Partido.fixture_id.in_(
            db.query(Fixture.id).filter(Fixture.torneo_id == data.torneo_id)
        )
    ).delete(synchronize_session=False)
    db.query(Fixture).filter(Fixture.torneo_id == data.torneo_id).delete()

    jornadas = _round_robin([i.id for i in inscripciones])
    fixtures_creados = []

    for num_jornada, pares in enumerate(jornadas, start=1):
        fix = Fixture(
            torneo_id=data.torneo_id,
            jornada=num_jornada,
            nombre_fase=f"Jornada {num_jornada}",
        )
        db.add(fix)
        db.flush()

        for local_id, visitante_id in pares:
            partido = Partido(
                fixture_id=fix.id,
                inscripcion_local_id=local_id,
                inscripcion_visitante_id=visitante_id,
                ronda=f"Jornada {num_jornada}",
            )
            db.add(partido)

        fixtures_creados.append(fix)

    db.commit()
    return fixtures_creados


@router.delete("/{torneo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fixture(torneo_id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    db.query(Partido).filter(
        Partido.fixture_id.in_(
            db.query(Fixture.id).filter(Fixture.torneo_id == torneo_id)
        )
    ).delete(synchronize_session=False)
    db.query(Fixture).filter(Fixture.torneo_id == torneo_id).delete()
    db.commit()
