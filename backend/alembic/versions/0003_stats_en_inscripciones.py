"""mover stats de posicion a inscripciones (por torneo)

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_COLS = [
    "puntos",
    "partidos_jugados",
    "partidos_ganados",
    "partidos_empatados",
    "partidos_perdidos",
]


def upgrade() -> None:
    for col in _COLS:
        op.add_column(
            "inscripciones",
            sa.Column(col, sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    for col in reversed(_COLS):
        op.drop_column("inscripciones", col)
