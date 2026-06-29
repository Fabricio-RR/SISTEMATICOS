"""agregar puntos_anotados a atleta_jugador para deportes no-fútbol

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "atleta_jugador",
        sa.Column("puntos_anotados", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("atleta_jugador", "puntos_anotados")
