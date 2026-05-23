"""corregir estados del torneo a flujo de 5 fases

Revision ID: 0005
Revises: 0004
Create Date: 2026-05-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Migrar datos existentes: activo → inscripcion_abierta
    op.execute("UPDATE torneos SET estado = 'inscripcion_abierta' WHERE estado = 'activo'")


def downgrade() -> None:
    op.execute("UPDATE torneos SET estado = 'activo' WHERE estado = 'inscripcion_abierta'")
    op.execute("UPDATE torneos SET estado = 'activo' WHERE estado = 'inscripcion_cerrada'")
    op.execute("UPDATE torneos SET estado = 'activo' WHERE estado = 'en_sorteo'")
    op.execute("UPDATE torneos SET estado = 'activo' WHERE estado = 'en_curso'")
