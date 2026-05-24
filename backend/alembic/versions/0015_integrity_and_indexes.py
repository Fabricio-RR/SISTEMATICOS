"""integridad referencial, índices faltantes y constraints de validación

Revision ID: 0015
Revises: 0014
Create Date: 2026-05-24

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0015"
down_revision: Union[str, None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Índices ---

    # Eliminar índice duplicado en usuarios.correo (unique=True ya crea uno)
    op.drop_index("ix_usuarios_correo", table_name="usuarios")

    # Índices faltantes en notificaciones (consulta frecuente por institución y por leída)
    op.create_index("ix_notificaciones_institucion_id", "notificaciones", ["institucion_id"])
    op.create_index("ix_notificaciones_leida", "notificaciones", ["leida"])

    # --- CheckConstraints ---

    op.create_check_constraint(
        "ck_usuario_rol", "usuarios",
        "rol IN ('admin', 'institucion', 'arbitro')",
    )
    op.create_check_constraint(
        "ck_auditoria_accion", "auditoria",
        "accion IN ('INSERT', 'UPDATE', 'DELETE')",
    )
    op.create_check_constraint(
        "ck_evento_tipo", "eventos_partido",
        "tipo_evento IN ('gol', 'puntos', 'tarjeta_amarilla', 'tarjeta_roja', 'falta', 'tiempo')",
    )
    op.create_check_constraint(
        "ck_partido_resultado_local_positivo", "partidos",
        "resultado_local IS NULL OR resultado_local >= 0",
    )
    op.create_check_constraint(
        "ck_partido_resultado_visitante_positivo", "partidos",
        "resultado_visitante IS NULL OR resultado_visitante >= 0",
    )

    # --- UniqueConstraints ---

    op.create_unique_constraint(
        "uq_grupo_torneo_nombre", "grupos", ["torneo_id", "nombre_grupo"],
    )
    op.create_unique_constraint(
        "uq_torneo_deporte_nombre_temporada", "torneos", ["deporte_id", "nombre", "temporada"],
    )

    # --- FKs con ON DELETE correcto ---
    # MySQL requiere DROP + ADD para cambiar el ON DELETE de una FK existente

    # eventos_partido.partido_id → CASCADE (si se borra el partido, se borran sus eventos)
    op.drop_constraint("eventos_partido_ibfk_1", "eventos_partido", type_="foreignkey")
    op.create_foreign_key(
        "fk_evento_partido_id", "eventos_partido", "partidos",
        ["partido_id"], ["id"], ondelete="CASCADE",
    )

    # eventos_partido.atleta_jugador_id → SET NULL (si se borra el atleta, el evento queda sin atleta)
    op.drop_constraint("eventos_partido_ibfk_2", "eventos_partido", type_="foreignkey")
    op.create_foreign_key(
        "fk_evento_atleta_id", "eventos_partido", "atleta_jugador",
        ["atleta_jugador_id"], ["id"], ondelete="SET NULL",
    )

    # notificaciones.partido_id → SET NULL (si se borra el partido, la notificación queda sin partido)
    op.drop_constraint("notificaciones_ibfk_2", "notificaciones", type_="foreignkey")
    op.create_foreign_key(
        "fk_notificacion_partido_id", "notificaciones", "partidos",
        ["partido_id"], ["id"], ondelete="SET NULL",
    )

    # refresh_tokens.usuario_id → CASCADE (si se borra el usuario, se borran sus tokens)
    op.drop_constraint("refresh_tokens_ibfk_1", "refresh_tokens", type_="foreignkey")
    op.create_foreign_key(
        "fk_refresh_token_usuario_id", "refresh_tokens", "usuarios",
        ["usuario_id"], ["id"], ondelete="CASCADE",
    )

    # auditoria.usuario_id → SET NULL (si se borra el usuario, la auditoría queda sin usuario)
    op.drop_constraint("auditoria_ibfk_1", "auditoria", type_="foreignkey")
    op.create_foreign_key(
        "fk_auditoria_usuario_id", "auditoria", "usuarios",
        ["usuario_id"], ["id"], ondelete="SET NULL",
    )


def downgrade() -> None:
    # Revertir FKs
    op.drop_constraint("fk_auditoria_usuario_id", "auditoria", type_="foreignkey")
    op.create_foreign_key("auditoria_ibfk_1", "auditoria", "usuarios", ["usuario_id"], ["id"])

    op.drop_constraint("fk_refresh_token_usuario_id", "refresh_tokens", type_="foreignkey")
    op.create_foreign_key("refresh_tokens_ibfk_1", "refresh_tokens", "usuarios", ["usuario_id"], ["id"])

    op.drop_constraint("fk_notificacion_partido_id", "notificaciones", type_="foreignkey")
    op.create_foreign_key("notificaciones_ibfk_2", "notificaciones", "partidos", ["partido_id"], ["id"])

    op.drop_constraint("fk_evento_atleta_id", "eventos_partido", type_="foreignkey")
    op.create_foreign_key("eventos_partido_ibfk_2", "eventos_partido", "atleta_jugador", ["atleta_jugador_id"], ["id"])

    op.drop_constraint("fk_evento_partido_id", "eventos_partido", type_="foreignkey")
    op.create_foreign_key("eventos_partido_ibfk_1", "eventos_partido", "partidos", ["partido_id"], ["id"])

    # Revertir UniqueConstraints
    op.drop_constraint("uq_torneo_deporte_nombre_temporada", "torneos", type_="unique")
    op.drop_constraint("uq_grupo_torneo_nombre", "grupos", type_="unique")

    # Revertir CheckConstraints
    op.drop_constraint("ck_partido_resultado_visitante_positivo", "partidos", type_="check")
    op.drop_constraint("ck_partido_resultado_local_positivo", "partidos", type_="check")
    op.drop_constraint("ck_evento_tipo", "eventos_partido", type_="check")
    op.drop_constraint("ck_auditoria_accion", "auditoria", type_="check")
    op.drop_constraint("ck_usuario_rol", "usuarios", type_="check")

    # Revertir índices
    op.drop_index("ix_notificaciones_leida", table_name="notificaciones")
    op.drop_index("ix_notificaciones_institucion_id", table_name="notificaciones")
    op.create_index("ix_usuarios_correo", "usuarios", ["correo"], unique=True)
