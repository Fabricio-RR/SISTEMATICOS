"""instituciones: agregar nivel, categoria, pais_asignado, pais_emoji

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-21

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("instituciones", sa.Column("nivel", sa.String(30), nullable=True))
    op.add_column("instituciones", sa.Column("categoria", sa.String(50), nullable=True))
    op.add_column("instituciones", sa.Column("pais_asignado", sa.String(100), nullable=True))
    op.add_column("instituciones", sa.Column("pais_emoji", sa.String(10), nullable=True))


def downgrade() -> None:
    op.drop_column("instituciones", "pais_emoji")
    op.drop_column("instituciones", "pais_asignado")
    op.drop_column("instituciones", "categoria")
    op.drop_column("instituciones", "nivel")
