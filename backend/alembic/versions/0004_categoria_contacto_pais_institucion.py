"""agregar categoria, contacto y pais_representativo a instituciones

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("instituciones", sa.Column("contacto", sa.String(200), nullable=True))
    op.add_column("instituciones", sa.Column("categoria", sa.String(50), nullable=True))
    op.add_column("instituciones", sa.Column("pais_representativo", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("instituciones", "pais_representativo")
    op.drop_column("instituciones", "categoria")
    op.drop_column("instituciones", "contacto")
