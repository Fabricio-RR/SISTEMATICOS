"""add status check constraints

Revision ID: 0012
Revises: 0011
Create Date: 2026-05-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_check(inspector: sa.Inspector, table_name: str, constraint_name: str) -> bool:
    return any(item["name"] == constraint_name for item in inspector.get_check_constraints(table_name))


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if not _has_check(inspector, "instituciones", "ck_institucion_estado"):
        op.create_check_constraint(
            "ck_institucion_estado",
            "instituciones",
            "estado IN ('activo', 'pendiente', 'inactivo')",
        )

    if not _has_check(inspector, "deportes", "ck_deporte_tipo_competidor"):
        op.create_check_constraint(
            "ck_deporte_tipo_competidor",
            "deportes",
            "tipo_competidor IN ('equipo', 'individual')",
        )

    if not _has_check(inspector, "club_equipo", "ck_equipo_estado"):
        op.create_check_constraint(
            "ck_equipo_estado",
            "club_equipo",
            "estado IN ('pendiente', 'aprobado', 'rechazado')",
        )

    if not _has_check(inspector, "inscripciones", "ck_inscripcion_estado"):
        op.create_check_constraint(
            "ck_inscripcion_estado",
            "inscripciones",
            "estado IN ('pendiente', 'aprobado', 'rechazado', 'retirado')",
        )

    if not _has_check(inspector, "torneos", "ck_torneo_formato"):
        op.create_check_constraint(
            "ck_torneo_formato",
            "torneos",
            "formato IN ('liga', 'eliminacion_simple', 'grupos')",
        )

    if not _has_check(inspector, "torneos", "ck_torneo_estado"):
        op.create_check_constraint(
            "ck_torneo_estado",
            "torneos",
            "estado IN ('inscripcion_abierta', 'inscripcion_cerrada', 'en_sorteo', 'en_curso', 'finalizado', 'suspendido')",
        )

    if not _has_check(inspector, "partidos", "ck_partido_estado"):
        op.create_check_constraint(
            "ck_partido_estado",
            "partidos",
            "estado IN ('programado', 'en_curso', 'finalizado')",
        )

    if not _has_check(inspector, "atleta_jugador", "ck_atleta_estado"):
        op.create_check_constraint(
            "ck_atleta_estado",
            "atleta_jugador",
            "estado IN ('activo', 'inactivo', 'suspendido')",
        )

    if not _has_check(inspector, "fixture", "ck_fixture_estado"):
        op.create_check_constraint(
            "ck_fixture_estado",
            "fixture",
            "estado IN ('activo', 'inactivo')",
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if _has_check(inspector, "fixture", "ck_fixture_estado"):
        op.drop_constraint("ck_fixture_estado", "fixture", type_="check")

    if _has_check(inspector, "atleta_jugador", "ck_atleta_estado"):
        op.drop_constraint("ck_atleta_estado", "atleta_jugador", type_="check")

    if _has_check(inspector, "partidos", "ck_partido_estado"):
        op.drop_constraint("ck_partido_estado", "partidos", type_="check")

    if _has_check(inspector, "torneos", "ck_torneo_estado"):
        op.drop_constraint("ck_torneo_estado", "torneos", type_="check")

    if _has_check(inspector, "torneos", "ck_torneo_formato"):
        op.drop_constraint("ck_torneo_formato", "torneos", type_="check")

    if _has_check(inspector, "inscripciones", "ck_inscripcion_estado"):
        op.drop_constraint("ck_inscripcion_estado", "inscripciones", type_="check")

    if _has_check(inspector, "club_equipo", "ck_equipo_estado"):
        op.drop_constraint("ck_equipo_estado", "club_equipo", type_="check")

    if _has_check(inspector, "deportes", "ck_deporte_tipo_competidor"):
        op.drop_constraint("ck_deporte_tipo_competidor", "deportes", type_="check")

    if _has_check(inspector, "instituciones", "ck_institucion_estado"):
        op.drop_constraint("ck_institucion_estado", "instituciones", type_="check")
