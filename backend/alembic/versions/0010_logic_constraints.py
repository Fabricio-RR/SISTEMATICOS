"""add unique and check constraints for logic consistency

Revision ID: 0010
Revises: 0009
Create Date: 2026-05-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_unique(inspector: sa.Inspector, table_name: str, constraint_name: str) -> bool:
    return any(item["name"] == constraint_name for item in inspector.get_unique_constraints(table_name))


def _has_check(inspector: sa.Inspector, table_name: str, constraint_name: str) -> bool:
    return any(item["name"] == constraint_name for item in inspector.get_check_constraints(table_name))


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if not _has_unique(inspector, "club_equipo", "uq_equipo_inst_dep_nombre"):
        op.create_unique_constraint(
            "uq_equipo_inst_dep_nombre",
            "club_equipo",
            ["institucion_id", "deporte_id", "nombre_equipo"],
        )

    if not _has_unique(inspector, "inscripciones", "uq_inscripcion_torneo_equipo"):
        op.create_unique_constraint(
            "uq_inscripcion_torneo_equipo",
            "inscripciones",
            ["torneo_id", "club_equipo_id"],
        )

    if not _has_unique(inspector, "atleta_jugador", "uq_atleta_equipo_documento"):
        op.create_unique_constraint(
            "uq_atleta_equipo_documento",
            "atleta_jugador",
            ["club_equipo_id", "documento_identidad"],
        )

    if not _has_check(inspector, "partidos", "ck_partido_equipos_distintos"):
        op.create_check_constraint(
            "ck_partido_equipos_distintos",
            "partidos",
            "inscripcion_local_id <> inscripcion_visitante_id",
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if _has_check(inspector, "partidos", "ck_partido_equipos_distintos"):
        op.drop_constraint("ck_partido_equipos_distintos", "partidos", type_="check")

    if _has_unique(inspector, "atleta_jugador", "uq_atleta_equipo_documento"):
        op.drop_constraint("uq_atleta_equipo_documento", "atleta_jugador", type_="unique")

    if _has_unique(inspector, "inscripciones", "uq_inscripcion_torneo_equipo"):
        op.drop_constraint("uq_inscripcion_torneo_equipo", "inscripciones", type_="unique")

    if _has_unique(inspector, "club_equipo", "uq_equipo_inst_dep_nombre"):
        op.drop_constraint("uq_equipo_inst_dep_nombre", "club_equipo", type_="unique")
