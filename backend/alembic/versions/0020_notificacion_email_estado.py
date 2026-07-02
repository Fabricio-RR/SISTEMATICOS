"""registrar estado de envío de correo en notificaciones

Revision ID: 0020
Revises: 0019
Create Date: 2026-06-29

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0020"
down_revision: Union[str, None] = "0019"
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

    if not _column_exists(conn, "notificaciones", "email_estado"):
        op.add_column(
            "notificaciones",
            sa.Column("email_estado", sa.String(20), nullable=False, server_default="no_aplica"),
        )
    if not _column_exists(conn, "notificaciones", "email_enviado_en"):
        op.add_column(
            "notificaciones",
            sa.Column("email_enviado_en", sa.DateTime(), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("notificaciones", "email_enviado_en")
    op.drop_column("notificaciones", "email_estado")
