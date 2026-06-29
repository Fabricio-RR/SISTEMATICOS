from app.models.club_equipo import ClubEquipo
from app.models.deportes import Deporte
from app.models.fixture import Fixture
from app.models.inscripciones import Inscripcion
from app.models.instituciones import Institucion
from app.models.partidos import Partido
from app.models.torneos import Torneo
from app.models.usuarios import Usuario


def make_institucion(nombre: str = "Colegio Demo", nombre_corto: str = "DEMO") -> Institucion:
    return Institucion(nombre=nombre, nombre_corto=nombre_corto, ciudad="Lima", estado="activo")


def make_user(rol: str = "admin", institucion_id: int | None = None) -> Usuario:
    return Usuario(
        nombres="Test",
        apellidos="User",
        correo=f"{rol}-{institucion_id or 0}@test.pe",
        contrasena_hash="hash",
        rol=rol,
        esta_activo=True,
        institucion_id=institucion_id,
    )


def make_deporte(nombre: str = "Futbol Varones") -> Deporte:
    return Deporte(nombre=nombre, tipo_competidor="equipo", esta_activo=True)


def make_torneo(deporte_id: int, *, estado: str = "inscripcion_abierta", formato: str = "liga") -> Torneo:
    return Torneo(
        deporte_id=deporte_id,
        nombre="Torneo Demo",
        formato=formato,
        temporada="2026",
        estado=estado,
    )


def make_equipo(institucion_id: int, deporte_id: int, nombre_equipo: str, *, estado: str = "aprobado") -> ClubEquipo:
    return ClubEquipo(
        institucion_id=institucion_id,
        deporte_id=deporte_id,
        nombre_equipo=nombre_equipo,
        estado=estado,
    )


def make_inscripcion(torneo_id: int, club_equipo_id: int, *, estado: str = "aprobado") -> Inscripcion:
    return Inscripcion(torneo_id=torneo_id, club_equipo_id=club_equipo_id, estado=estado)


def make_fixture(torneo_id: int, *, jornada: int = 1, nombre_fase: str = "Jornada 1") -> Fixture:
    return Fixture(torneo_id=torneo_id, jornada=jornada, nombre_fase=nombre_fase)


def make_partido(
    fixture_id: int,
    local_id: int,
    visitante_id: int,
    *,
    estado: str = "programado",
    resultado_local: int | None = None,
    resultado_visitante: int | None = None,
) -> Partido:
    return Partido(
        fixture_id=fixture_id,
        inscripcion_local_id=local_id,
        inscripcion_visitante_id=visitante_id,
        estado=estado,
        resultado_local=resultado_local,
        resultado_visitante=resultado_visitante,
    )
