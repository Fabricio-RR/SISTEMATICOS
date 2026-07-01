"""agregar motivo_reprogramacion a partidos y tabla notificaciones

Revision ID: 0008
Revises: 0007
Create Date: 2026-05-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(
        sa.text(
            "SELECT COUNT(*) FROM information_schema.columns "
            "WHERE table_schema = DATABASE() AND table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": column},
    )
    return result.scalar() > 0


def upgrade() -> None:
    conn = op.get_bind()

    if not _column_exists(conn, "partidos", "motivo_reprogramacion"):
        op.add_column("partidos", sa.Column("motivo_reprogramacion", sa.String(500), nullable=True))

    if not _column_exists(conn, "partidos", "reprogramado_en"):
        op.add_column("partidos", sa.Column("reprogramado_en", sa.DateTime(), nullable=True))

    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS notificaciones (
            id INTEGER NOT NULL AUTO_INCREMENT,
            institucion_id INTEGER NOT NULL,
            partido_id INTEGER,
            titulo VARCHAR(200) NOT NULL,
            contenido VARCHAR(1000) NOT NULL,
            leida BOOL NOT NULL DEFAULT 0,
            creada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            FOREIGN KEY (institucion_id) REFERENCES instituciones (id),
            FOREIGN KEY (partido_id) REFERENCES partidos (id)
        )
    """))


def downgrade() -> None:
    op.drop_table("notificaciones")
    op.drop_column("partidos", "reprogramado_en")
    op.drop_column("partidos", "motivo_reprogramacion")
