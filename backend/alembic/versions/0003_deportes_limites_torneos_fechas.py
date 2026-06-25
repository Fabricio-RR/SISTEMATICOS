"""deportes: min/max jugadores; torneos: fecha_inicio, fecha_fin

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-21
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("deportes", sa.Column("min_jugadores", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("deportes", sa.Column("max_jugadores", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("torneos", sa.Column("fecha_inicio", sa.String(20), nullable=True))
    op.add_column("torneos", sa.Column("fecha_fin", sa.String(20), nullable=True))
    op.add_column("torneos", sa.Column("descripcion", sa.String(300), nullable=True))


def downgrade() -> None:
    op.drop_column("deportes", "min_jugadores")
    op.drop_column("deportes", "max_jugadores")
    op.drop_column("torneos", "fecha_inicio")
    op.drop_column("torneos", "fecha_fin")
    op.drop_column("torneos", "descripcion")
