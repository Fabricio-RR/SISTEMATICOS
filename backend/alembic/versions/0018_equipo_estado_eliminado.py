"""permitir estado 'eliminado' en club_equipo (borrado lógico)

Revision ID: 0018
Revises: 0017
Create Date: 2026-06-22

"""
from typing import Sequence, Union
from alembic import op

revision: str = "0018"
down_revision: Union[str, None] = "0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_equipo_estado", "club_equipo", type_="check")
    op.create_check_constraint(
        "ck_equipo_estado",
        "club_equipo",
        "estado IN ('pendiente', 'aprobado', 'rechazado', 'eliminado')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_equipo_estado", "club_equipo", type_="check")
    op.create_check_constraint(
        "ck_equipo_estado",
        "club_equipo",
        "estado IN ('pendiente', 'aprobado', 'rechazado')",
    )
