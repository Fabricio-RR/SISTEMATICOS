import pytest
from fastapi import HTTPException

from app.services.competition import (
    apply_result_change,
    apply_walkover,
    assert_transition_allowed,
    collect_winners,
)
from tests.factories import (
    make_deporte,
    make_equipo,
    make_fixture,
    make_inscripcion,
    make_institucion,
    make_partido,
    make_torneo,
)


def _seed_two_team_bracket(db_session, *, torneo_estado: str, torneo_formato: str = "liga", fase: str = "Jornada 1"):
    inst_a = make_institucion("Colegio A", "COLA")
    inst_b = make_institucion("Colegio B", "COLB")
    deporte = make_deporte()
    db_session.add_all([inst_a, inst_b, deporte])
    db_session.commit()

    torneo = make_torneo(deporte.id, estado=torneo_estado, formato=torneo_formato)
    db_session.add(torneo)
    db_session.commit()

    equipo_a = make_equipo(inst_a.id, deporte.id, "A")
    equipo_b = make_equipo(inst_b.id, deporte.id, "B")
    db_session.add_all([equipo_a, equipo_b])
    db_session.commit()

    insc_a = make_inscripcion(torneo.id, equipo_a.id)
    insc_b = make_inscripcion(torneo.id, equipo_b.id)
    db_session.add_all([insc_a, insc_b])
    db_session.commit()

    fixture = make_fixture(torneo.id, nombre_fase=fase)
    db_session.add(fixture)
    db_session.commit()

    partido = make_partido(fixture.id, insc_a.id, insc_b.id)
    db_session.add(partido)
    db_session.commit()

    return torneo, insc_a, insc_b, partido


def test_assert_transition_requires_fixture_before_starting_league(db_session):
    inst_a = make_institucion("Colegio A", "COLA")
    inst_b = make_institucion("Colegio B", "COLB")
    deporte = make_deporte()
    db_session.add_all([inst_a, inst_b, deporte])
    db_session.commit()

    torneo = make_torneo(deporte.id, estado="en_sorteo", formato="liga")
    db_session.add(torneo)
    db_session.commit()

    equipo_a = make_equipo(inst_a.id, deporte.id, "A")
    equipo_b = make_equipo(inst_b.id, deporte.id, "B")
    db_session.add_all([equipo_a, equipo_b])
    db_session.commit()

    db_session.add_all([
        make_inscripcion(torneo.id, equipo_a.id),
        make_inscripcion(torneo.id, equipo_b.id),
    ])
    db_session.commit()

    with pytest.raises(HTTPException, match="Genera el fixture antes de iniciar el torneo"):
        assert_transition_allowed(torneo, "en_curso", db_session)


def test_apply_result_change_reverses_previous_points(db_session):
    torneo, local, visitante, partido = _seed_two_team_bracket(db_session, torneo_estado="en_curso")

    apply_result_change(partido, 2, 1, torneo=torneo)
    db_session.flush()

    assert local.puntos == 3
    assert local.partidos_ganados == 1
    assert visitante.partidos_perdidos == 1

    apply_result_change(partido, 0, 0, torneo=torneo)
    db_session.flush()

    assert local.puntos == 1
    assert visitante.puntos == 1
    assert local.partidos_ganados == 0
    assert local.partidos_empatados == 1
    assert visitante.partidos_empatados == 1
    assert visitante.partidos_perdidos == 0
    assert local.partidos_jugados == 1
    assert visitante.partidos_jugados == 1


def test_apply_result_change_rejects_draw_in_elimination_phase(db_session):
    torneo, _, _, partido = _seed_two_team_bracket(
        db_session,
        torneo_estado="en_curso",
        torneo_formato="eliminacion_simple",
        fase="Semifinales",
    )

    with pytest.raises(HTTPException, match="no se permiten empates"):
        apply_result_change(partido, 1, 1, torneo=torneo)


def test_collect_winners_rejects_draws(db_session):
    _, _, _, partido = _seed_two_team_bracket(
        db_session,
        torneo_estado="en_curso",
        torneo_formato="eliminacion_simple",
        fase="Semifinales",
    )
    partido.estado = "finalizado"
    partido.resultado_local = 2
    partido.resultado_visitante = 2

    with pytest.raises(HTTPException, match="terminó empatado"):
        collect_winners([partido])


def test_apply_walkover_awards_opponent_and_marks_match(db_session):
    _, local, visitante, partido = _seed_two_team_bracket(db_session, torneo_estado="en_curso")

    apply_walkover(partido, local.id)
    db_session.flush()

    assert partido.estado == "finalizado"
    assert partido.es_walkover is True
    assert partido.resultado_local == 0
    assert partido.resultado_visitante == 3
    assert local.partidos_perdidos == 1
    assert visitante.puntos == 3
    assert visitante.partidos_ganados == 1
