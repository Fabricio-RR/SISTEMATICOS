"""deportes: campo tipo_estadistica para clasificar estadísticas por deporte

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("deportes", sa.Column(
        "tipo_estadistica", sa.String(20), nullable=False, server_default="otro"
    ))
    # Asignar tipo a los deportes existentes por nombre
    op.execute("""
        UPDATE deportes SET tipo_estadistica = 'futbol'
        WHERE LOWER(nombre) LIKE '%f%tbol%'
    """)
    op.execute("""
        UPDATE deportes SET tipo_estadistica = 'basket'
        WHERE LOWER(nombre) LIKE '%b%squet%' OR LOWER(nombre) LIKE '%basket%'
    """)
    op.execute("""
        UPDATE deportes SET tipo_estadistica = 'voley'
        WHERE LOWER(nombre) LIKE '%v%ley%' OR LOWER(nombre) LIKE '%volei%'
    """)


def downgrade() -> None:
    op.drop_column("deportes", "tipo_estadistica")
