"""agregar nombre_normalizado a instituciones (deduplicación)

Revision ID: 0019
Revises: 0018
Create Date: 2026-06-23

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.services.instituciones import clave_canonica

revision: str = "0019"
down_revision: Union[str, None] = "0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Se agrega nullable para poder rellenar las filas existentes antes de fijar
    # el valor por defecto definitivo.
    op.add_column(
        "instituciones",
        sa.Column("nombre_normalizado", sa.String(200), nullable=True),
    )

    conn = op.get_bind()
    filas = conn.execute(sa.text("SELECT id, nombre FROM instituciones")).fetchall()
    for fila in filas:
        conn.execute(
            sa.text("UPDATE instituciones SET nombre_normalizado = :valor WHERE id = :id"),
            {"valor": clave_canonica(fila.nombre), "id": fila.id},
        )

    op.alter_column(
        "instituciones",
        "nombre_normalizado",
        existing_type=sa.String(200),
        nullable=False,
        server_default="",
    )
    op.create_index(
        "ix_instituciones_nombre_normalizado",
        "instituciones",
        ["nombre_normalizado"],
    )


def downgrade() -> None:
    op.drop_index("ix_instituciones_nombre_normalizado", table_name="instituciones")
    op.drop_column("instituciones", "nombre_normalizado")
