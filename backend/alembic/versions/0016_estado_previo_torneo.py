"""agregar columna estado_previo a torneos (reactivación de torneos)

Revision ID: 0016
Revises: 0015
Create Date: 2026-06-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "torneos",
        sa.Column("estado_previo", sa.String(length=30), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("torneos", "estado_previo")
