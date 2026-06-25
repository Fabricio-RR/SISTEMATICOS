from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.inscripciones import Inscripcion
from app.models.club_equipo import ClubEquipo
from app.models.atleta_jugador import AtletaJugador
from app.models.torneos import Torneo
from app.models.usuarios import Usuario
from app.schemas.inscripciones import InscripcionCreate, InscripcionOut, InscripcionDetalle
from app.core.deps import get_current_user, require_admin
import app.core.email as email_service

router = APIRouter()


@router.get("/torneo/{torneo_id}", response_model=list[InscripcionDetalle])
def get_by_torneo(torneo_id: int, db: Session = Depends(get_db)):
    """Lista todas las inscripciones de un torneo con detalle de equipo e institución."""
    rows = (
        db.query(Inscripcion)
        .options(
            joinedload(Inscripcion.club_equipo).joinedload(ClubEquipo.institucion),
            joinedload(Inscripcion.torneo).joinedload(Torneo.deporte),
        )
        .filter(Inscripcion.torneo_id == torneo_id)
        .all()
    )
    result = []
    for r in rows:
        result.append(InscripcionDetalle(
            id=r.id,
            torneo_id=r.torneo_id,
            club_equipo_id=r.club_equipo_id,
            grupo_id=r.grupo_id,
            numero_seeding=r.numero_seeding,
            estado=r.estado,
            nombre_equipo=r.club_equipo.nombre_equipo,
            nombre_institucion=r.club_equipo.institucion.nombre,
            nombre_deporte=r.torneo.deporte.nombre,
            pais_asignado=r.club_equipo.pais_asignado,
            pais_emoji=r.club_equipo.pais_emoji,
        ))
    return result


@router.get("/mis-inscripciones", response_model=list[InscripcionDetalle])
def get_mis_inscripciones(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    """Devuelve las inscripciones de los equipos de la institución del usuario actual."""
    if not current_user.institucion_id:
        return []
    equipos = db.query(ClubEquipo).filter(ClubEquipo.institucion_id == current_user.institucion_id).all()
    equipo_ids = [e.id for e in equipos]
    rows = (
        db.query(Inscripcion)
        .options(
            joinedload(Inscripcion.club_equipo).joinedload(ClubEquipo.institucion),
            joinedload(Inscripcion.torneo).joinedload(Torneo.deporte),
        )
        .filter(Inscripcion.club_equipo_id.in_(equipo_ids))
        .all()
    )
    result = []
    for r in rows:
        result.append(InscripcionDetalle(
            id=r.id,
            torneo_id=r.torneo_id,
            club_equipo_id=r.club_equipo_id,
            grupo_id=r.grupo_id,
            numero_seeding=r.numero_seeding,
            estado=r.estado,
            nombre_equipo=r.club_equipo.nombre_equipo,
            nombre_institucion=r.club_equipo.institucion.nombre,
            nombre_deporte=r.torneo.deporte.nombre,
            pais_asignado=r.club_equipo.pais_asignado,
            pais_emoji=r.club_equipo.pais_emoji,
        ))
    return result


@router.post("/", response_model=InscripcionOut, status_code=status.HTTP_201_CREATED)
def inscribir(data: InscripcionCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    """Inscribe un equipo en un torneo. Solo el admin o la propia institución puede hacerlo."""
    torneo = db.query(Torneo).filter(Torneo.id == data.torneo_id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")

    equipo = db.query(ClubEquipo).filter(ClubEquipo.id == data.club_equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    if current_user.rol != "admin" and equipo.institucion_id != current_user.institucion_id:
        raise HTTPException(status_code=403, detail="No tienes permiso para inscribir este equipo")

    # Verificar que el deporte del equipo coincida con el del torneo
    if equipo.deporte_id != torneo.deporte_id:
        raise HTTPException(status_code=400, detail="El deporte del equipo no coincide con el del torneo")

    # Evitar inscripciones duplicadas
    existe = db.query(Inscripcion).filter(
        Inscripcion.torneo_id == data.torneo_id,
        Inscripcion.club_equipo_id == data.club_equipo_id,
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="El equipo ya está inscrito en este torneo")

    inscripcion = Inscripcion(
        torneo_id=data.torneo_id,
        club_equipo_id=data.club_equipo_id,
        estado="pendiente",
    )
    db.add(inscripcion)
    db.commit()
    db.refresh(inscripcion)
    return inscripcion


@router.patch("/{id}/aprobar", response_model=InscripcionOut)
def aprobar(
    id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    """El admin aprueba una inscripción. Valida la cantidad de jugadores vs los límites del deporte."""
    insc = db.query(Inscripcion).filter(Inscripcion.id == id).first()
    if not insc:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")

    equipo = insc.club_equipo
    torneo = db.query(Torneo).filter(Torneo.id == insc.torneo_id).first()
    deporte = torneo.deporte
    total_jugadores = db.query(AtletaJugador).filter(
        AtletaJugador.club_equipo_id == insc.club_equipo_id,
        AtletaJugador.estado == "activo",
    ).count()

    if total_jugadores < deporte.min_jugadores:
        raise HTTPException(
            status_code=400,
            detail=f"El equipo tiene {total_jugadores} jugadores pero {deporte.nombre} requiere mínimo {deporte.min_jugadores}"
        )
    if total_jugadores > deporte.max_jugadores:
        raise HTTPException(
            status_code=400,
            detail=f"El equipo tiene {total_jugadores} jugadores pero {deporte.nombre} permite máximo {deporte.max_jugadores}"
        )

    insc.estado = "aprobado"
    db.commit()
    db.refresh(insc)

    # Notificar al representante de la institución
    usuario = db.query(Usuario).filter(
        Usuario.institucion_id == equipo.institucion_id,
        Usuario.esta_activo == True,
    ).first()
    if usuario:
        background_tasks.add_task(
            email_service.enviar_inscripcion_aprobada,
            correo=usuario.correo,
            nombre=f"{usuario.nombres} {usuario.apellidos}",
            nombre_equipo=equipo.nombre_equipo,
            nombre_torneo=torneo.nombre,
            deporte=deporte.nombre,
            pais=equipo.pais_asignado or "",
            pais_emoji=equipo.pais_emoji or "",
        )

    return insc


@router.patch("/{id}/rechazar", response_model=InscripcionOut)
def rechazar(
    id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    """El admin rechaza una inscripción."""
    insc = db.query(Inscripcion).filter(Inscripcion.id == id).first()
    if not insc:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")

    equipo = insc.club_equipo
    torneo = db.query(Torneo).filter(Torneo.id == insc.torneo_id).first()

    insc.estado = "rechazado"
    db.commit()
    db.refresh(insc)

    usuario = db.query(Usuario).filter(
        Usuario.institucion_id == equipo.institucion_id,
        Usuario.esta_activo == True,
    ).first()
    if usuario:
        background_tasks.add_task(
            email_service.enviar_inscripcion_rechazada,
            correo=usuario.correo,
            nombre=f"{usuario.nombres} {usuario.apellidos}",
            nombre_equipo=equipo.nombre_equipo,
            nombre_torneo=torneo.nombre,
        )

    return insc


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    insc = db.query(Inscripcion).filter(Inscripcion.id == id).first()
    if not insc:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    db.delete(insc)
    db.commit()
