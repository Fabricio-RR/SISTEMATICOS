from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.fixture import Fixture
from app.models.inscripciones import Inscripcion
from app.models.partidos import Partido
from app.models.torneos import Torneo

ELIMINATION_PHASE_NAMES = ("Cuartos de Final", "Semifinales", "Final")


def count_approved_enrollments(torneo_id: int, db: Session) -> int:
    return db.query(Inscripcion).filter(
        Inscripcion.torneo_id == torneo_id,
        Inscripcion.estado == "aprobado",
    ).count()


def assert_transition_allowed(torneo: Torneo, siguiente: str, db: Session) -> None:
    if siguiente == "en_sorteo":
        aprobadas = count_approved_enrollments(torneo.id, db)
        if aprobadas < 2:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Se necesitan al menos 2 equipos aprobados para pasar a sorteo",
            )
        return

    if siguiente == "en_curso":
        aprobadas = count_approved_enrollments(torneo.id, db)
        if aprobadas < 2:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Se necesitan al menos 2 equipos aprobados para iniciar el torneo",
            )
        if torneo.formato in ("liga", "grupos"):
            fixture_count = db.query(Fixture).filter(Fixture.torneo_id == torneo.id).count()
            if fixture_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Genera el fixture antes de iniciar el torneo",
                )
        return

    if siguiente == "finalizado":
        partidos = (
            db.query(Partido)
            .join(Fixture, Partido.fixture_id == Fixture.id)
            .filter(Fixture.torneo_id == torneo.id)
            .all()
        )
        if not partidos:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede finalizar un torneo sin partidos generados",
            )
        pendientes = [p for p in partidos if p.estado != "finalizado"]
        if pendientes:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Faltan {len(pendientes)} partido(s) por finalizar antes de cerrar el torneo",
            )


def elimination_phase_name_from_size(n_clasificados: int) -> str:
    if n_clasificados >= 8:
        return "Cuartos de Final"
    if n_clasificados >= 4:
        return "Semifinales"
    return "Final"


def next_elimination_phase_name(nombre: str) -> str:
    orden = list(ELIMINATION_PHASE_NAMES)
    try:
        idx = orden.index(nombre)
        return orden[idx + 1] if idx + 1 < len(orden) else "Final"
    except ValueError:
        return "Final"


def is_elimination_match(partido: Partido, torneo: Torneo | None = None) -> bool:
    fixture = partido.fixture
    if fixture and fixture.nombre_fase in ELIMINATION_PHASE_NAMES:
        return True
    return torneo is not None and torneo.formato == "eliminacion_simple"


def collect_winners(partidos: list[Partido]) -> list[int]:
    ganadores: list[int] = []
    for partido in sorted(partidos, key=lambda item: item.id):
        if partido.estado != "finalizado":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Faltan partidos por finalizar en esta fase. Revisa el partido #{partido.id}.",
            )
        if partido.resultado_local is None or partido.resultado_visitante is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El partido #{partido.id} no tiene resultado",
            )
        if partido.resultado_local == partido.resultado_visitante:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El partido #{partido.id} terminó empatado. En fase eliminatoria no puede haber empates.",
            )
        ganadores.append(
            partido.inscripcion_local_id
            if partido.resultado_local > partido.resultado_visitante
            else partido.inscripcion_visitante_id
        )
    return ganadores


def apply_result_change(
    partido: Partido,
    resultado_local: int,
    resultado_visitante: int,
    *,
    torneo: Torneo | None = None,
) -> None:
    if is_elimination_match(partido, torneo) and resultado_local == resultado_visitante:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="En fase eliminatoria no se permiten empates. Corrige el resultado.",
        )

    if partido.estado == "finalizado" and partido.resultado_local is not None and partido.resultado_visitante is not None:
        _apply_table_delta(
            partido.local,
            partido.visitante,
            partido.resultado_local,
            partido.resultado_visitante,
            factor=-1,
        )

    partido.resultado_local = resultado_local
    partido.resultado_visitante = resultado_visitante
    partido.estado = "finalizado"
    partido.es_walkover = False

    _apply_table_delta(partido.local, partido.visitante, resultado_local, resultado_visitante, factor=1)


def apply_walkover(partido: Partido, inscripcion_retirada_id: int) -> None:
    if partido.inscripcion_local_id == inscripcion_retirada_id:
        resultado_local, resultado_visitante = 0, 3
    elif partido.inscripcion_visitante_id == inscripcion_retirada_id:
        resultado_local, resultado_visitante = 3, 0
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La inscripción retirada no participa en el partido indicado",
        )

    if partido.estado == "finalizado" and partido.resultado_local is not None and partido.resultado_visitante is not None:
        _apply_table_delta(
            partido.local,
            partido.visitante,
            partido.resultado_local,
            partido.resultado_visitante,
            factor=-1,
        )

    partido.resultado_local = resultado_local
    partido.resultado_visitante = resultado_visitante
    partido.es_walkover = True
    partido.estado = "finalizado"
    _apply_table_delta(partido.local, partido.visitante, resultado_local, resultado_visitante, factor=1)


def _apply_table_delta(
    local: Inscripcion | None,
    visitante: Inscripcion | None,
    resultado_local: int | None,
    resultado_visitante: int | None,
    *,
    factor: int,
) -> None:
    if resultado_local is None or resultado_visitante is None:
        return
    if not local or not visitante:
        return

    local.partidos_jugados += factor
    visitante.partidos_jugados += factor
    local.goles_a_favor += resultado_local * factor
    local.goles_en_contra += resultado_visitante * factor
    visitante.goles_a_favor += resultado_visitante * factor
    visitante.goles_en_contra += resultado_local * factor

    if resultado_local > resultado_visitante:
        local.partidos_ganados += factor
        local.puntos += 3 * factor
        visitante.partidos_perdidos += factor
        return

    if resultado_visitante > resultado_local:
        visitante.partidos_ganados += factor
        visitante.puntos += 3 * factor
        local.partidos_perdidos += factor
        return

    local.partidos_empatados += factor
    visitante.partidos_empatados += factor
    local.puntos += factor
    visitante.puntos += factor
