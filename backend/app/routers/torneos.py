from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.torneos import Torneo
from app.models.deportes import Deporte
from app.models.inscripciones import Inscripcion
from app.models.instituciones import Institucion
from app.models.fixture import Fixture
from app.models.partidos import Partido
from app.core.deps import require_admin
from app.core.texto import normalizar
from app.models.usuarios import Usuario
from app.schemas.torneos import TorneoCreate, TorneoUpdate, TorneoOut, TRANSICIONES
from app.services.competition import assert_transition_allowed
from app.services.notify import notify_institucion

router = APIRouter()


@router.get("/", response_model=list[TorneoOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Torneo).all()


@router.get("/{id}", response_model=TorneoOut)
def get_by_id(id: int, db: Session = Depends(get_db)):
    torneo = db.query(Torneo).filter(Torneo.id == id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    return torneo


@router.post("/", response_model=TorneoOut, status_code=status.HTTP_201_CREATED)
def create(data: TorneoCreate, background: BackgroundTasks, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    deporte = db.query(Deporte).filter(Deporte.id == data.deporte_id, Deporte.esta_activo == True).first()
    if not deporte:
        raise HTTPException(status_code=404, detail="Deporte no encontrado o inactivo")

    # Evitar torneos duplicados aunque el nombre esté escrito distinto
    # (mismo deporte y temporada). La restricción UNIQUE cubre el caso exacto.
    objetivo = normalizar(data.nombre)
    temporada_norm = normalizar(data.temporada)
    existentes = db.query(Torneo).filter(Torneo.deporte_id == data.deporte_id).all()
    if any(
        normalizar(t.nombre) == objetivo and normalizar(t.temporada) == temporada_norm
        for t in existentes
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un torneo con ese nombre para el deporte y la temporada indicados",
        )

    torneo = Torneo(**data.model_dump())
    db.add(torneo)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un torneo con ese nombre para el deporte y la temporada indicados",
        )
    db.refresh(torneo)

    # El torneo nace en "inscripcion_abierta": avisamos a todas las instituciones
    # activas para que puedan inscribir sus equipos (in-app + correo).
    instituciones = db.query(Institucion.id).filter(Institucion.estado == "activo").all()
    for (inst_id,) in instituciones:
        notify_institucion(
            db,
            background,
            inst_id,
            "Nuevo torneo disponible",
            f"Se abrió el torneo {torneo.nombre} de {deporte.nombre}. ¡Ya pueden inscribir sus equipos!",
            cuerpo_email=(
                f"¡Hola!\n\n"
                f"Tenemos un nuevo torneo para ustedes:\n"
                f"  • {torneo.nombre} ({deporte.nombre}, temporada {torneo.temporada})\n\n"
                f"Las inscripciones ya están abiertas. Ingresen al portal para inscribir a sus "
                f"equipos y competir.\n\n"
                f"¡Los esperamos!\n\n— El equipo de Olimpiadas Perú"
            ),
        )
    if instituciones:
        db.commit()

    return torneo


@router.patch("/{id}", response_model=TorneoOut)
def update(id: int, data: TorneoUpdate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    """Edita datos del torneo (nombre, formato, temporada). No cambia el deporte ni el estado."""
    torneo = db.query(Torneo).filter(Torneo.id == id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")

    cambios = data.model_dump(exclude_unset=True)
    if not cambios:
        return torneo

    # Cambiar el formato con un fixture ya generado corrompería el torneo
    if "formato" in cambios and cambios["formato"] != torneo.formato:
        if db.query(Fixture).filter(Fixture.torneo_id == id).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede cambiar el formato de un torneo con fixture generado",
            )

    # Revalidar duplicado (mismo deporte + temporada + nombre normalizado)
    nuevo_nombre = cambios.get("nombre", torneo.nombre)
    nueva_temporada = cambios.get("temporada", torneo.temporada)
    objetivo = normalizar(nuevo_nombre)
    temporada_norm = normalizar(nueva_temporada)
    existentes = db.query(Torneo).filter(
        Torneo.deporte_id == torneo.deporte_id, Torneo.id != id
    ).all()
    if any(
        normalizar(t.nombre) == objetivo and normalizar(t.temporada) == temporada_norm
        for t in existentes
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un torneo con ese nombre para el deporte y la temporada indicados",
        )

    for campo, valor in cambios.items():
        setattr(torneo, campo, valor)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un torneo con ese nombre para el deporte y la temporada indicados",
        )
    db.refresh(torneo)
    return torneo


def _determinar_campeon(torneo_id: int, db: Session) -> Inscripcion | None:
    """Campeón del torneo: en eliminatoria, el ganador de la Final; en liga, el
    líder de la tabla de posiciones (mismos criterios que /estadisticas/tabla)."""
    final = (
        db.query(Fixture)
        .filter(Fixture.torneo_id == torneo_id, Fixture.nombre_fase == "Final")
        .first()
    )
    if final:
        partido = (
            db.query(Partido)
            .filter(Partido.fixture_id == final.id, Partido.estado == "finalizado")
            .first()
        )
        if (
            partido
            and partido.resultado_local is not None
            and partido.resultado_visitante is not None
            and partido.resultado_local != partido.resultado_visitante
        ):
            ganador_id = (
                partido.inscripcion_local_id
                if partido.resultado_local > partido.resultado_visitante
                else partido.inscripcion_visitante_id
            )
            return db.get(Inscripcion, ganador_id)

    diferencia = Inscripcion.goles_a_favor - Inscripcion.goles_en_contra
    return (
        db.query(Inscripcion)
        .filter(Inscripcion.torneo_id == torneo_id, Inscripcion.estado == "aprobado")
        .order_by(
            Inscripcion.puntos.desc(),
            diferencia.desc(),
            Inscripcion.goles_a_favor.desc(),
            Inscripcion.partidos_ganados.desc(),
            Inscripcion.id.asc(),
        )
        .first()
    )


@router.patch("/{id}/avanzar", response_model=TorneoOut)
def avanzar(id: int, background: BackgroundTasks, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    torneo = db.query(Torneo).filter(Torneo.id == id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    siguiente = TRANSICIONES.get(torneo.estado)
    if not siguiente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El torneo está en estado '{torneo.estado}' y no puede avanzar.",
        )
    assert_transition_allowed(torneo, siguiente, db)
    torneo.estado = siguiente

    # Al finalizar el torneo, felicitamos al campeón (in-app + correo).
    if siguiente == "finalizado":
        campeon = _determinar_campeon(id, db)
        if campeon and campeon.club_equipo:
            equipo = campeon.club_equipo.nombre_equipo
            notify_institucion(
                db,
                background,
                campeon.club_equipo.institucion_id,
                "¡Campeones del torneo!",
                f"¡Felicidades! {equipo} se coronó campeón de {torneo.nombre}.",
                cuerpo_email=(
                    f"¡FELICIDADES, CAMPEONES!\n\n"
                    f"Su equipo {equipo} se coronó campeón del torneo {torneo.nombre}. "
                    f"Fue una gran competencia y se lo ganaron en la cancha.\n\n"
                    f"¡Gracias por ser parte de Olimpiadas Perú y los esperamos en el próximo torneo!\n\n"
                    f"— El equipo de Olimpiadas Perú"
                ),
            )

    db.commit()
    db.refresh(torneo)
    return torneo


@router.patch("/{id}/suspender", response_model=TorneoOut)
def suspender(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    torneo = db.query(Torneo).filter(Torneo.id == id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    if torneo.estado == "finalizado":
        raise HTTPException(status_code=400, detail="No se puede suspender un torneo finalizado.")
    if torneo.estado == "suspendido":
        raise HTTPException(status_code=400, detail="El torneo ya está suspendido.")
    torneo.estado_previo = torneo.estado
    torneo.estado = "suspendido"
    db.commit()
    db.refresh(torneo)
    return torneo


@router.patch("/{id}/reactivar", response_model=TorneoOut)
def reactivar(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    torneo = db.query(Torneo).filter(Torneo.id == id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    if torneo.estado != "suspendido":
        raise HTTPException(status_code=400, detail="El torneo no está suspendido.")
    if not torneo.estado_previo:
        raise HTTPException(status_code=400, detail="No hay estado anterior registrado. Contacta al administrador del sistema.")
    torneo.estado = torneo.estado_previo
    torneo.estado_previo = None
    db.commit()
    db.refresh(torneo)
    return torneo


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    torneo = db.query(Torneo).filter(Torneo.id == id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    if torneo.estado in ("en_curso", "finalizado"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar un torneo en curso o finalizado.",
        )
    if db.query(Inscripcion).filter(Inscripcion.torneo_id == id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar un torneo con inscripciones registradas",
        )
    if db.query(Fixture).filter(Fixture.torneo_id == id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Elimina el fixture del torneo antes de borrarlo",
        )
    db.delete(torneo)
    db.commit()
