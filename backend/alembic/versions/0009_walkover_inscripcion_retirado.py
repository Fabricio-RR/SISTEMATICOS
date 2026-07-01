"""agregar es_walkover a partidos para manejar retiros e inasistencias

Revision ID: 0009
Revises: 0008
Create Date: 2026-05-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "partidos",
        sa.Column("es_walkover", sa.Boolean(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("partidos", "es_walkover")
