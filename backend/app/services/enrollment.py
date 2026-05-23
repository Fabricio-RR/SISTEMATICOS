from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.atleta_jugador import AtletaJugador
from app.models.club_equipo import ClubEquipo
from app.models.deportes import Deporte
from app.models.fixture import Fixture
from app.models.inscripciones import Inscripcion
from app.models.instituciones import Institucion
from app.models.torneos import Torneo
from app.models.usuarios import Usuario


def assert_team_creation_allowed(
    *,
    institucion_id: int,
    deporte_id: int,
    nombre_equipo: str,
    current_user: Usuario,
    db: Session,
    exclude_team_id: int | None = None,
) -> None:
    if current_user.rol != "admin" and institucion_id != current_user.institucion_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes crear equipos para tu institución",
        )

    if not db.query(Institucion).filter(Institucion.id == institucion_id).first():
        raise HTTPException(status_code=404, detail="Institución no encontrada")

    deporte = db.query(Deporte).filter(
        Deporte.id == deporte_id,
        Deporte.esta_activo.is_(True),
    ).first()
    if not deporte:
        raise HTTPException(status_code=404, detail="Deporte no encontrado o inactivo")

    assert_team_name_available(
        db,
        institucion_id=institucion_id,
        deporte_id=deporte_id,
        nombre_equipo=nombre_equipo,
        exclude_team_id=exclude_team_id,
    )


def assert_team_name_available(
    db: Session,
    *,
    institucion_id: int,
    deporte_id: int,
    nombre_equipo: str,
    exclude_team_id: int | None = None,
) -> None:
    q = db.query(ClubEquipo).filter(
        ClubEquipo.institucion_id == institucion_id,
        ClubEquipo.deporte_id == deporte_id,
        ClubEquipo.nombre_equipo == nombre_equipo,
    )
    if exclude_team_id is not None:
        q = q.filter(ClubEquipo.id != exclude_team_id)
    if q.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un equipo con ese nombre en la institución y deporte seleccionados",
        )


def assert_inscripcion_allowed(
    *,
    torneo_id: int,
    club_equipo_id: int,
    current_user: Usuario,
    db: Session,
) -> tuple[Torneo, ClubEquipo]:
    torneo = db.query(Torneo).filter(Torneo.id == torneo_id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    if torneo.estado != "inscripcion_abierta":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Las inscripciones están cerradas. El torneo está en estado '{torneo.estado}'.",
        )

    club = db.query(ClubEquipo).filter(ClubEquipo.id == club_equipo_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if club.estado != "aprobado":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Solo se pueden inscribir equipos aprobados",
        )
    if club.deporte_id != torneo.deporte_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El deporte del equipo no coincide con el torneo",
        )
    if current_user.rol != "admin" and club.institucion_id != current_user.institucion_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes inscribir equipos de tu institución",
        )

    existe = db.query(Inscripcion).filter(
        Inscripcion.torneo_id == torneo_id,
        Inscripcion.club_equipo_id == club_equipo_id,
    ).first()
    if existe:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El equipo ya está inscrito en este torneo")

    return torneo, club


def assert_inscripcion_admin_change_allowed(
    inscripcion: Inscripcion,
    db: Session,
    *,
    action: str,
) -> None:
    torneo = inscripcion.torneo
    if torneo is None:
        return

    if torneo.estado in ("en_curso", "finalizado", "suspendido"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"No se puede {action} una inscripción de un torneo en estado '{torneo.estado}'",
        )

    fixture_generado = db.query(Fixture).filter(Fixture.torneo_id == torneo.id).first() is not None
    if torneo.estado != "en_sorteo" or not fixture_generado:
        return

    if action == "aprobar":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pueden aprobar inscripciones después de generar el fixture",
        )

    if inscripcion.estado == "aprobado":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pueden modificar inscripciones aprobadas después de generar el fixture",
        )


def assert_atleta_creation_allowed(
    *,
    club_equipo_id: int,
    documento_identidad: str,
    current_user: Usuario,
    db: Session,
) -> ClubEquipo:
    club = db.query(ClubEquipo).filter(ClubEquipo.id == club_equipo_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    if club.estado != "aprobado":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Solo puedes registrar atletas en equipos aprobados",
        )
    if current_user.rol != "admin" and club.institucion_id != current_user.institucion_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes registrar atletas de tu institución",
        )
    if db.query(AtletaJugador).filter(
        AtletaJugador.club_equipo_id == club_equipo_id,
        AtletaJugador.documento_identidad == documento_identidad,
    ).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un atleta con ese documento en el equipo",
        )
    return club


def assert_atleta_access_allowed(atleta: AtletaJugador, current_user: Usuario) -> None:
    if current_user.rol == "admin":
        return
    if not atleta.club_equipo or atleta.club_equipo.institucion_id != current_user.institucion_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo puedes gestionar atletas de tu institución",
        )
