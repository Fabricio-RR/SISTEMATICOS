"""elimina columnas de stats globales de club_equipo (nunca se usaban)

Revision ID: 0014
Revises: 0013
Create Date: 2026-05-24

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("club_equipo", "posicion_tabla")
    op.drop_column("club_equipo", "puntos")
    op.drop_column("club_equipo", "partidos_jugados")
    op.drop_column("club_equipo", "partidos_ganados")
    op.drop_column("club_equipo", "partidos_perdidos")


def downgrade() -> None:
    op.add_column("club_equipo", sa.Column("partidos_perdidos", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("club_equipo", sa.Column("partidos_ganados", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("club_equipo", sa.Column("partidos_jugados", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("club_equipo", sa.Column("puntos", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("club_equipo", sa.Column("posicion_tabla", sa.Integer(), nullable=False, server_default="0"))
