"""agregar es_obligatorio a deportes y sembrar los 4 deportes obligatorios

Revision ID: 0006
Revises: 0005
Create Date: 2026-05-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEPORTES_OBLIGATORIOS = [
    ("Fútbol Varones",   "equipo"),
    ("Básquet Varones",  "equipo"),
    ("Vóley Damas",      "equipo"),
    ("Ping Pong Mixto",  "equipo"),
]


def upgrade() -> None:
    op.add_column("deportes", sa.Column("es_obligatorio", sa.Boolean(), nullable=False, server_default="0"))

    conn = op.get_bind()
    for nombre, tipo in DEPORTES_OBLIGATORIOS:
        existing = conn.execute(
            sa.text("SELECT id FROM deportes WHERE nombre = :nombre"),
            {"nombre": nombre},
        ).fetchone()
        if existing:
            conn.execute(
                sa.text("UPDATE deportes SET es_obligatorio = true WHERE id = :id"),
                {"id": existing[0]},
            )
        else:
            conn.execute(
                sa.text(
                    "INSERT INTO deportes (nombre, tipo_competidor, esta_activo, es_obligatorio) "
                    "VALUES (:nombre, :tipo, true, true)"
                ),
                {"nombre": nombre, "tipo": tipo},
            )


def downgrade() -> None:
    op.drop_column("deportes", "es_obligatorio")
