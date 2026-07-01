"""initial tables

Revision ID: 0001
Revises:
Create Date: 2026-05-15

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "instituciones",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("nombre_corto", sa.String(50), nullable=False),
        sa.Column("ciudad", sa.String(100), nullable=False),
        sa.Column("estado", sa.String(30), nullable=False, server_default="activo"),
        sa.Column("imagen_url", sa.String(500), nullable=True),
    )

    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("institucion_id", sa.Integer(), sa.ForeignKey("instituciones.id"), nullable=True),
        sa.Column("nombres", sa.String(100), nullable=False),
        sa.Column("apellidos", sa.String(100), nullable=False),
        sa.Column("correo", sa.String(150), nullable=False, unique=True),
        sa.Column("contrasena_hash", sa.String(255), nullable=False),
        sa.Column("rol", sa.String(30), nullable=False, server_default="institucion"),
        sa.Column("esta_activo", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("pregunta_seguridad_1", sa.String(300), nullable=True),
        sa.Column("respuesta_seguridad_1", sa.String(255), nullable=True),
        sa.Column("pregunta_seguridad_2", sa.String(300), nullable=True),
        sa.Column("respuesta_seguridad_2", sa.String(255), nullable=True),
        sa.Column("pregunta_seguridad_3", sa.String(300), nullable=True),
        sa.Column("respuesta_seguridad_3", sa.String(255), nullable=True),
    )
    op.create_index("ix_usuarios_correo", "usuarios", ["correo"], unique=True)

    op.create_table(
        "deportes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column("tipo_competidor", sa.String(20), nullable=False, server_default="equipo"),
        sa.Column("esta_activo", sa.Boolean(), nullable=False, server_default="1"),
    )

    op.create_table(
        "club_equipo",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("institucion_id", sa.Integer(), sa.ForeignKey("instituciones.id"), nullable=False),
        sa.Column("deporte_id", sa.Integer(), sa.ForeignKey("deportes.id"), nullable=False),
        sa.Column("nombre_equipo", sa.String(150), nullable=False),
        sa.Column("estado", sa.String(30), nullable=False, server_default="pendiente"),
        sa.Column("posicion_tabla", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("puntos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("partidos_jugados", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("partidos_ganados", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("partidos_perdidos", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "atleta_jugador",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("club_equipo_id", sa.Integer(), sa.ForeignKey("club_equipo.id"), nullable=False),
        sa.Column("nombre_completo", sa.String(200), nullable=False),
        sa.Column("numero_camiseta", sa.String(10), nullable=True),
        sa.Column("posicion_rol", sa.String(50), nullable=True),
        sa.Column("documento_identidad", sa.String(20), nullable=False),
        sa.Column("goles_anotados", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tarjetas_amarillas", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tarjetas_rojas", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("estado", sa.String(30), nullable=False, server_default="activo"),
    )

    op.create_table(
        "torneos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("deporte_id", sa.Integer(), sa.ForeignKey("deportes.id"), nullable=False),
        sa.Column("nombre", sa.String(150), nullable=False),
        sa.Column("formato", sa.String(30), nullable=False, server_default="liga"),
        sa.Column("temporada", sa.String(20), nullable=False),
        sa.Column("estado", sa.String(30), nullable=False, server_default="activo"),
    )

    op.create_table(
        "grupos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("torneo_id", sa.Integer(), sa.ForeignKey("torneos.id"), nullable=False),
        sa.Column("nombre_grupo", sa.String(50), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="1"),
    )

    op.create_table(
        "sedes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nombre_sede", sa.String(150), nullable=False),
        sa.Column("ciudad", sa.String(100), nullable=False),
        sa.Column("capacidad", sa.Integer(), nullable=True),
        sa.Column("esta_activo", sa.Boolean(), nullable=False, server_default="1"),
    )

    op.create_table(
        "inscripciones",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("torneo_id", sa.Integer(), sa.ForeignKey("torneos.id"), nullable=False),
        sa.Column("club_equipo_id", sa.Integer(), sa.ForeignKey("club_equipo.id"), nullable=False),
        sa.Column("grupo_id", sa.Integer(), sa.ForeignKey("grupos.id"), nullable=True),
        sa.Column("numero_seeding", sa.Integer(), nullable=True),
        sa.Column("estado", sa.String(30), nullable=False, server_default="pendiente"),
    )

    op.create_table(
        "fixture",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("torneo_id", sa.Integer(), sa.ForeignKey("torneos.id"), nullable=False),
        sa.Column("jornada", sa.Integer(), nullable=False),
        sa.Column("nombre_fase", sa.String(100), nullable=False),
        sa.Column("fecha_generacion", sa.DateTime(), nullable=False),
        sa.Column("estado", sa.String(30), nullable=False, server_default="activo"),
    )

    op.create_table(
        "partidos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("fixture_id", sa.Integer(), sa.ForeignKey("fixture.id"), nullable=False),
        sa.Column("inscripcion_local_id", sa.Integer(), sa.ForeignKey("inscripciones.id"), nullable=False),
        sa.Column("inscripcion_visitante_id", sa.Integer(), sa.ForeignKey("inscripciones.id"), nullable=False),
        sa.Column("grupo_id", sa.Integer(), sa.ForeignKey("grupos.id"), nullable=True),
        sa.Column("sede_id", sa.Integer(), sa.ForeignKey("sedes.id"), nullable=True),
        sa.Column("arbitro_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("ronda", sa.String(50), nullable=True),
        sa.Column("fecha_hora", sa.DateTime(), nullable=True),
        sa.Column("resultado_local", sa.Integer(), nullable=True),
        sa.Column("resultado_visitante", sa.Integer(), nullable=True),
        sa.Column("estado", sa.String(30), nullable=False, server_default="programado"),
    )

    op.create_table(
        "eventos_partido",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("partido_id", sa.Integer(), sa.ForeignKey("partidos.id"), nullable=False),
        sa.Column("atleta_jugador_id", sa.Integer(), sa.ForeignKey("atleta_jugador.id"), nullable=True),
        sa.Column("tipo_evento", sa.String(30), nullable=False),
        sa.Column("minuto", sa.Integer(), nullable=True),
        sa.Column("descripcion", sa.String(300), nullable=True),
    )

    op.create_table(
        "auditoria",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("usuario_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("tabla_afectada", sa.String(100), nullable=False),
        sa.Column("accion", sa.String(20), nullable=False),
        sa.Column("valor_anterior", sa.Text(), nullable=True),
        sa.Column("valor_nuevo", sa.Text(), nullable=True),
        sa.Column("creado_en", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "noticias",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("titulo", sa.String(250), nullable=False),
        sa.Column("contenido", sa.Text(), nullable=False),
        sa.Column("imagen_url", sa.String(500), nullable=True),
        sa.Column("esta_publicado", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("fecha_publicacion", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("noticias")
    op.drop_table("auditoria")
    op.drop_table("eventos_partido")
    op.drop_table("partidos")
    op.drop_table("fixture")
    op.drop_table("inscripciones")
    op.drop_table("sedes")
    op.drop_table("grupos")
    op.drop_table("torneos")
    op.drop_table("atleta_jugador")
    op.drop_table("club_equipo")
    op.drop_table("deportes")
    op.drop_index("ix_usuarios_correo", "usuarios")
    op.drop_table("usuarios")
    op.drop_table("instituciones")
