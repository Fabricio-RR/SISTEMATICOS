import pytest
from fastapi import HTTPException

from app.models.inscripciones import Inscripcion
from app.services.enrollment import (
    assert_atleta_creation_allowed,
    assert_inscripcion_admin_change_allowed,
    assert_inscripcion_allowed,
    assert_team_creation_allowed,
)
from tests.factories import (
    make_deporte,
    make_equipo,
    make_fixture,
    make_institucion,
    make_inscripcion,
    make_torneo,
    make_user,
)


def test_assert_inscripcion_allowed_rejects_closed_tournament(db_session):
    institucion = make_institucion()
    deporte = make_deporte()
    db_session.add_all([institucion, deporte])
    db_session.commit()

    torneo = make_torneo(deporte.id, estado="en_sorteo")
    equipo = make_equipo(institucion.id, deporte.id, "Demo")
    db_session.add_all([torneo, equipo])
    db_session.commit()

    current_user = make_user("institucion", institucion.id)

    with pytest.raises(HTTPException, match="Las inscripciones están cerradas"):
        assert_inscripcion_allowed(
            torneo_id=torneo.id,
            club_equipo_id=equipo.id,
            current_user=current_user,
            db=db_session,
        )


def test_assert_inscripcion_allowed_rejects_foreign_team_for_non_admin(db_session):
    inst_a = make_institucion("Colegio A", "COLA")
    inst_b = make_institucion("Colegio B", "COLB")
    deporte = make_deporte()
    db_session.add_all([inst_a, inst_b, deporte])
    db_session.commit()

    torneo = make_torneo(deporte.id)
    equipo = make_equipo(inst_b.id, deporte.id, "Visitante")
    db_session.add_all([torneo, equipo])
    db_session.commit()

    current_user = make_user("institucion", inst_a.id)

    with pytest.raises(HTTPException, match="Solo puedes inscribir equipos de tu institución"):
        assert_inscripcion_allowed(
            torneo_id=torneo.id,
            club_equipo_id=equipo.id,
            current_user=current_user,
            db=db_session,
        )


def test_assert_team_creation_allowed_rejects_duplicate_name(db_session):
    institucion = make_institucion()
    deporte = make_deporte()
    db_session.add_all([institucion, deporte])
    db_session.commit()

    equipo = make_equipo(institucion.id, deporte.id, "Los Tigres")
    db_session.add(equipo)
    db_session.commit()

    with pytest.raises(HTTPException, match="Ya existe un equipo con ese nombre"):
        assert_team_creation_allowed(
            institucion_id=institucion.id,
            deporte_id=deporte.id,
            nombre_equipo="Los Tigres",
            current_user=make_user("admin"),
            db=db_session,
        )


def test_assert_atleta_creation_allowed_requires_approved_team(db_session):
    institucion = make_institucion()
    deporte = make_deporte()
    db_session.add_all([institucion, deporte])
    db_session.commit()

    equipo = make_equipo(institucion.id, deporte.id, "Pendiente", estado="pendiente")
    db_session.add(equipo)
    db_session.commit()

    with pytest.raises(HTTPException, match="equipos aprobados"):
        assert_atleta_creation_allowed(
            club_equipo_id=equipo.id,
            documento_identidad="12345678",
            current_user=make_user("institucion", institucion.id),
            db=db_session,
        )


def test_assert_inscripcion_admin_change_allowed_blocks_approval_after_fixture(db_session):
    institucion = make_institucion()
    deporte = make_deporte()
    db_session.add_all([institucion, deporte])
    db_session.commit()

    torneo = make_torneo(deporte.id, estado="en_sorteo")
    equipo = make_equipo(institucion.id, deporte.id, "Demo")
    db_session.add_all([torneo, equipo])
    db_session.commit()

    inscripcion = make_inscripcion(torneo.id, equipo.id, estado="pendiente")
    fixture = make_fixture(torneo.id)
    db_session.add_all([inscripcion, fixture])
    db_session.commit()

    inscripcion = db_session.query(Inscripcion).filter(Inscripcion.id == inscripcion.id).first()
    assert inscripcion is not None

    with pytest.raises(HTTPException, match="después de generar el fixture"):
        assert_inscripcion_admin_change_allowed(inscripcion, db_session, action="aprobar")
