"""club_equipo: pais_asignado y pais_emoji por equipo

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-21
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("club_equipo", sa.Column("pais_asignado", sa.String(100), nullable=True))
    op.add_column("club_equipo", sa.Column("pais_emoji", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("club_equipo", "pais_asignado")
    op.drop_column("club_equipo", "pais_emoji")
