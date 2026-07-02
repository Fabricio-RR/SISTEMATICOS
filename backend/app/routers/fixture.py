from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.fixture import Fixture
from app.models.partidos import Partido
from app.models.inscripciones import Inscripcion
from app.models.torneos import Torneo
from app.services.notify import notify_institucion
from app.schemas.fixture import FixtureOut, GenerarFixtureRequest, FaseEliminatoriaRequest, SiguienteFaseRequest
from app.schemas.partidos import PartidoOut
from app.core.deps import require_admin
from app.models.usuarios import Usuario
from app.services.competition import (
    collect_winners,
    elimination_phase_name_from_size,
    next_elimination_phase_name,
    recalculate_atleta_stats,
)
from app.models.eventos_partido import EventoPartido
from app.models.notificaciones import Notificacion

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
    if torneo.estado != "en_sorteo":
        raise HTTPException(
            status_code=400,
            detail=f"El fixture solo puede generarse cuando el torneo está en estado 'en_sorteo'. Estado actual: '{torneo.estado}'.",
        )
    if torneo.formato == "eliminacion_simple":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Los torneos de eliminación simple no usan fixture de liga. Usa la generación de fase eliminatoria.",
        )

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

    fixture_ids = [f.id for f in db.query(Fixture.id).filter(Fixture.torneo_id == data.torneo_id).all()]
    if fixture_ids:
        partido_ids = [p.id for p in db.query(Partido.id).filter(Partido.fixture_id.in_(fixture_ids)).all()]
        if partido_ids:
            atleta_ids_a_resetear = [
                row[0]
                for row in db.query(EventoPartido.atleta_jugador_id)
                .filter(EventoPartido.partido_id.in_(partido_ids), EventoPartido.atleta_jugador_id.isnot(None))
                .distinct()
                .all()
            ]
            db.query(EventoPartido).filter(EventoPartido.partido_id.in_(partido_ids)).delete(synchronize_session=False)
            db.query(Notificacion).filter(Notificacion.partido_id.in_(partido_ids)).delete(synchronize_session=False)
            db.query(Partido).filter(Partido.id.in_(partido_ids)).delete(synchronize_session=False)
            db.flush()
            recalculate_atleta_stats(db, atleta_ids_a_resetear)
        db.query(Fixture).filter(Fixture.id.in_(fixture_ids)).delete(synchronize_session=False)

    db.query(Inscripcion).filter(Inscripcion.torneo_id == data.torneo_id).update({
        Inscripcion.puntos: 0,
        Inscripcion.partidos_jugados: 0,
        Inscripcion.partidos_ganados: 0,
        Inscripcion.partidos_empatados: 0,
        Inscripcion.partidos_perdidos: 0,
        Inscripcion.goles_a_favor: 0,
        Inscripcion.goles_en_contra: 0,
    }, synchronize_session=False)

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


@router.post("/fase-eliminatoria", response_model=FixtureOut, status_code=status.HTTP_201_CREATED)
def generar_fase_eliminatoria(
    data: FaseEliminatoriaRequest,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    torneo = db.query(Torneo).filter(Torneo.id == data.torneo_id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    if torneo.estado != "en_curso":
        raise HTTPException(status_code=400, detail="La fase eliminatoria solo puede generarse con el torneo 'en_curso'")
    if data.n_clasificados not in (2, 4, 8):
        raise HTTPException(status_code=400, detail="n_clasificados debe ser 2, 4 u 8")
    if db.query(Fixture).filter(
        Fixture.torneo_id == data.torneo_id,
        Fixture.nombre_fase.in_(("Cuartos de Final", "Semifinales", "Final")),
    ).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La fase eliminatoria ya fue generada para este torneo",
        )

    inscripciones = (
        db.query(Inscripcion)
        .filter(Inscripcion.torneo_id == data.torneo_id, Inscripcion.estado == "aprobado")
        .order_by(
            Inscripcion.puntos.desc(),
            Inscripcion.partidos_ganados.desc(),
            Inscripcion.partidos_perdidos.asc(),
        )
        .limit(data.n_clasificados)
        .all()
    )
    if len(inscripciones) < data.n_clasificados:
        raise HTTPException(
            status_code=400,
            detail=f"Se necesitan {data.n_clasificados} equipos aprobados, hay {len(inscripciones)}",
        )

    max_fix = db.query(Fixture).filter(Fixture.torneo_id == data.torneo_id).order_by(Fixture.jornada.desc()).first()
    jornada = (max_fix.jornada + 1) if max_fix else 1

    nombre_fase = elimination_phase_name_from_size(data.n_clasificados)
    fix = Fixture(torneo_id=data.torneo_id, jornada=jornada, nombre_fase=nombre_fase)
    db.add(fix)
    db.flush()

    n = len(inscripciones)
    for i in range(n // 2):
        db.add(Partido(
            fixture_id=fix.id,
            inscripcion_local_id=inscripciones[i].id,
            inscripcion_visitante_id=inscripciones[n - 1 - i].id,
            ronda=nombre_fase,
        ))

    db.commit()
    db.refresh(fix)
    return fix


@router.post("/siguiente-fase", response_model=FixtureOut, status_code=status.HTTP_201_CREATED)
def generar_siguiente_fase(
    data: SiguienteFaseRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    fixture = db.query(Fixture).filter(
        Fixture.id == data.fixture_id, Fixture.torneo_id == data.torneo_id
    ).first()
    if not fixture:
        raise HTTPException(status_code=404, detail="Fixture no encontrado")
    if fixture.nombre_fase == "Final":
        raise HTTPException(status_code=400, detail="La Final ya es la última fase")

    partidos = db.query(Partido).filter(Partido.fixture_id == data.fixture_id).all()
    if not partidos:
        raise HTTPException(status_code=400, detail="Este fixture no tiene partidos")

    ganadores = collect_winners(partidos)
    nombre_siguiente = next_elimination_phase_name(fixture.nombre_fase)
    if db.query(Fixture).filter(
        Fixture.torneo_id == data.torneo_id,
        Fixture.nombre_fase == nombre_siguiente,
    ).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"La fase '{nombre_siguiente}' ya fue generada para este torneo",
        )
    next_fix = Fixture(
        torneo_id=data.torneo_id,
        jornada=fixture.jornada + 1,
        nombre_fase=nombre_siguiente,
    )
    db.add(next_fix)
    db.flush()

    n = len(ganadores)
    for i in range(n // 2):
        db.add(Partido(
            fixture_id=next_fix.id,
            inscripcion_local_id=ganadores[i],
            inscripcion_visitante_id=ganadores[n - 1 - i],
            ronda=nombre_siguiente,
        ))

    # Avisar a los equipos que avanzaron a la siguiente fase (in-app + correo).
    torneo = db.get(Torneo, data.torneo_id)
    torneo_nombre = torneo.nombre if torneo else "el torneo"
    for insc_id in ganadores:
        insc = db.get(Inscripcion, insc_id)
        if insc and insc.club_equipo:
            equipo = insc.club_equipo.nombre_equipo
            notify_institucion(
                db,
                background,
                insc.club_equipo.institucion_id,
                "¡Avanzaste de fase!",
                f"{equipo} avanzó a {nombre_siguiente} en {torneo_nombre}. ¡Felicidades!",
                cuerpo_email=(
                    f"¡Felicidades!\n\n"
                    f"Su equipo {equipo} ganó y avanzó a {nombre_siguiente} en el torneo "
                    f"{torneo_nombre}. ¡Sigan así!\n\n"
                    f"Pronto podrán ver el nuevo cruce en el portal.\n\n— El equipo de Olimpiadas Perú"
                ),
            )

    db.commit()
    db.refresh(next_fix)
    return next_fix


@router.delete("/{torneo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fixture(torneo_id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    fixture_ids = [f.id for f in db.query(Fixture.id).filter(Fixture.torneo_id == torneo_id).all()]
    if fixture_ids:
        partido_ids = [p.id for p in db.query(Partido.id).filter(Partido.fixture_id.in_(fixture_ids)).all()]
        if partido_ids:
            atleta_ids_a_resetear = [
                row[0]
                for row in db.query(EventoPartido.atleta_jugador_id)
                .filter(EventoPartido.partido_id.in_(partido_ids), EventoPartido.atleta_jugador_id.isnot(None))
                .distinct()
                .all()
            ]
            db.query(EventoPartido).filter(EventoPartido.partido_id.in_(partido_ids)).delete(synchronize_session=False)
            db.query(Notificacion).filter(Notificacion.partido_id.in_(partido_ids)).delete(synchronize_session=False)
            db.query(Partido).filter(Partido.id.in_(partido_ids)).delete(synchronize_session=False)
            db.flush()
            recalculate_atleta_stats(db, atleta_ids_a_resetear)
        db.query(Fixture).filter(Fixture.id.in_(fixture_ids)).delete(synchronize_session=False)

    db.query(Inscripcion).filter(Inscripcion.torneo_id == torneo_id).update({
        Inscripcion.puntos: 0,
        Inscripcion.partidos_jugados: 0,
        Inscripcion.partidos_ganados: 0,
        Inscripcion.partidos_empatados: 0,
        Inscripcion.partidos_perdidos: 0,
        Inscripcion.goles_a_favor: 0,
        Inscripcion.goles_en_contra: 0,
    }, synchronize_session=False)
    db.commit()
