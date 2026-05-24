"""agrega goles_a_favor y goles_en_contra a inscripciones

Revision ID: 0013
Revises: 0012
Create Date: 2026-05-23

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "inscripciones",
        sa.Column("goles_a_favor", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "inscripciones",
        sa.Column("goles_en_contra", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("inscripciones", "goles_en_contra")
    op.drop_column("inscripciones", "goles_a_favor")
