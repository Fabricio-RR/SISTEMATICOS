"""
Router de Fixture y Sorteo.

Lógica del torneo:
- Fase de grupos: los equipos se dividen en grupos de 4.
  Dentro del grupo todos juegan contra todos (round-robin).
- Fase eliminatoria: cuartos de final, semifinales y final.
  Se genera automáticamente después de cerrar la fase de grupos.
"""
import random
from math import ceil
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.inscripciones import Inscripcion
from app.models.torneos import Torneo
from app.models.grupos import Grupo
from app.models.fixture import Fixture
from app.models.partidos import Partido
from app.models.eventos_partido import EventoPartido
from app.models.usuarios import Usuario
from app.core.deps import require_admin

router = APIRouter()


# ── Schemas de respuesta inline ───────────────────────────────────────────────

def _partido_out(p: Partido) -> dict:
    local = p.local.club_equipo if p.local else None
    visitante = p.visitante.club_equipo if p.visitante else None
    return {
        "id": p.id,
        "fixture_id": p.fixture_id,
        "ronda": p.ronda,
        "estado": p.estado,
        "fecha_hora": p.fecha_hora.isoformat() if p.fecha_hora else None,
        "sede_id": p.sede_id,
        "resultado_local": p.resultado_local,
        "resultado_visitante": p.resultado_visitante,
        "local": {"id": local.id, "nombre": local.nombre_equipo, "pais": local.pais_asignado, "pais_emoji": local.pais_emoji} if local else None,
        "visitante": {"id": visitante.id, "nombre": visitante.nombre_equipo, "pais": visitante.pais_asignado, "pais_emoji": visitante.pais_emoji} if visitante else None,
    }


def _fixture_out(f: Fixture) -> dict:
    return {
        "id": f.id,
        "torneo_id": f.torneo_id,
        "jornada": f.jornada,
        "nombre_fase": f.nombre_fase,
        "estado": f.estado,
        "fecha_generacion": f.fecha_generacion.isoformat(),
        "partidos": [_partido_out(p) for p in f.partidos],
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/torneo/{torneo_id}")
def get_fixture(torneo_id: int, db: Session = Depends(get_db)):
    """Devuelve todos los fixtures (jornadas) de un torneo con sus partidos."""
    fixtures = (
        db.query(Fixture)
        .options(
            joinedload(Fixture.partidos).joinedload(Partido.local).joinedload(Inscripcion.club_equipo),
            joinedload(Fixture.partidos).joinedload(Partido.visitante).joinedload(Inscripcion.club_equipo),
        )
        .filter(Fixture.torneo_id == torneo_id, Fixture.estado == "activo")
        .order_by(Fixture.jornada)
        .all()
    )
    return [_fixture_out(f) for f in fixtures]


@router.post("/sorteo/{torneo_id}", status_code=status.HTTP_201_CREATED)
def generar_sorteo(torneo_id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    """
    Genera el sorteo aleatorio de grupos y la fase de grupos (round-robin).
    Solo se puede ejecutar si no hay fixtures activos previos.
    """
    torneo = db.query(Torneo).filter(Torneo.id == torneo_id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")

    # Verificar que no haya fixtures ya generados
    ya_generado = db.query(Fixture).filter(Fixture.torneo_id == torneo_id, Fixture.estado == "activo").first()
    if ya_generado:
        raise HTTPException(status_code=400, detail="Ya existe un fixture generado para este torneo. Elimínalo antes de regenerar.")

    # Obtener inscripciones aprobadas
    inscripciones = (
        db.query(Inscripcion)
        .filter(Inscripcion.torneo_id == torneo_id, Inscripcion.estado == "aprobado")
        .all()
    )
    if len(inscripciones) < 2:
        raise HTTPException(status_code=400, detail="Se necesitan al menos 2 equipos inscritos y aprobados para generar el sorteo")

    # Mezclar aleatoriamente
    random.shuffle(inscripciones)

    # Dividir en grupos de 4 (o menos si no alcanza)
    tamanio_grupo = 4
    num_grupos = ceil(len(inscripciones) / tamanio_grupo)

    grupos_db = []
    nombres_grupos = "ABCDEFGHIJKLMNOP"
    for i in range(num_grupos):
        g = Grupo(torneo_id=torneo_id, nombre_grupo=f"Grupo {nombres_grupos[i]}", orden=i + 1)
        db.add(g)
        db.flush()
        grupos_db.append(g)

    # Asignar inscripciones a grupos con seeding
    for idx, insc in enumerate(inscripciones):
        grupo = grupos_db[idx % num_grupos]
        insc.grupo_id = grupo.id
        insc.numero_seeding = idx + 1

    db.flush()

    # Generar partidos round-robin dentro de cada grupo
    jornada = 1
    partidos_creados = 0

    for grupo in grupos_db:
        miembros = [i for i in inscripciones if i.grupo_id == grupo.id]
        fixture = Fixture(
            torneo_id=torneo_id,
            jornada=jornada,
            nombre_fase=f"Fase de Grupos — {grupo.nombre_grupo}",
            fecha_generacion=datetime.utcnow(),
            estado="activo",
        )
        db.add(fixture)
        db.flush()

        # Round-robin: todos contra todos dentro del grupo
        for i in range(len(miembros)):
            for j in range(i + 1, len(miembros)):
                partido = Partido(
                    fixture_id=fixture.id,
                    inscripcion_local_id=miembros[i].id,
                    inscripcion_visitante_id=miembros[j].id,
                    grupo_id=grupo.id,
                    ronda="Fase de Grupos",
                    estado="programado",
                )
                db.add(partido)
                partidos_creados += 1
        jornada += 1

    # Actualizar estado del torneo
    torneo.estado = "en_sorteo"
    db.commit()

    return {
        "message": "Sorteo generado exitosamente",
        "grupos": num_grupos,
        "equipos": len(inscripciones),
        "partidos_creados": partidos_creados,
    }


@router.post("/eliminatoria/{torneo_id}", status_code=status.HTTP_201_CREATED)
def generar_eliminatoria(torneo_id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    """
    Genera la fase eliminatoria (cuartos, semis, final) con los primeros
    clasificados de cada grupo. Se llama después de cerrar la fase de grupos.
    """
    torneo = db.query(Torneo).filter(Torneo.id == torneo_id).first()
    if not torneo:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")

    # Obtener el mejor de cada grupo (por puntos DESC)
    grupos = db.query(Grupo).filter(Grupo.torneo_id == torneo_id).all()
    if not grupos:
        raise HTTPException(status_code=400, detail="No hay grupos generados")

    clasificados = []
    for grupo in grupos:
        miembros = db.query(Inscripcion).filter(
            Inscripcion.grupo_id == grupo.id,
            Inscripcion.estado == "aprobado",
        ).all()

        def _puntos_en_torneo(insc: Inscripcion) -> int:
            pts = 0
            partidos = db.query(Partido).filter(
                Partido.estado == "finalizado",
                Partido.grupo_id == grupo.id,
            ).all()
            for p in partidos:
                if p.resultado_local is None or p.resultado_visitante is None:
                    continue
                es_local = p.inscripcion_local_id == insc.id
                es_visitante = p.inscripcion_visitante_id == insc.id
                if not es_local and not es_visitante:
                    continue
                rl, rv = p.resultado_local, p.resultado_visitante
                if (es_local and rl > rv) or (es_visitante and rv > rl):
                    pts += 3
                elif rl == rv:
                    pts += 1
            return pts

        miembros.sort(key=_puntos_en_torneo, reverse=True)
        clasificados.extend(miembros[:2])

    if len(clasificados) < 2:
        raise HTTPException(status_code=400, detail="No hay suficientes clasificados para la fase eliminatoria")

    random.shuffle(clasificados)

    fases = []
    if len(clasificados) >= 8:
        fases = [("Cuartos de Final", 8), ("Semifinal", 4), ("Final", 2)]
    elif len(clasificados) >= 4:
        fases = [("Semifinal", 4), ("Final", 2)]
    else:
        fases = [("Final", 2)]

    jornada_base = db.query(Fixture).filter(Fixture.torneo_id == torneo_id).count() + 1
    equipos_fase = clasificados[:fases[0][1]]
    partidos_creados = 0

    for nombre_fase, _ in fases:
        fixture = Fixture(
            torneo_id=torneo_id,
            jornada=jornada_base,
            nombre_fase=nombre_fase,
            fecha_generacion=datetime.utcnow(),
            estado="activo",
        )
        db.add(fixture)
        db.flush()

        for i in range(0, len(equipos_fase) - 1, 2):
            partido = Partido(
                fixture_id=fixture.id,
                inscripcion_local_id=equipos_fase[i].id,
                inscripcion_visitante_id=equipos_fase[i + 1].id,
                ronda=nombre_fase,
                estado="programado",
            )
            db.add(partido)
            partidos_creados += 1

        # La siguiente fase tendrá la mitad de equipos (placeholders se completan al ingresar resultados)
        equipos_fase = equipos_fase[:len(equipos_fase) // 2]
        jornada_base += 1

    torneo.estado = "en_curso"
    db.commit()

    return {
        "message": "Fase eliminatoria generada",
        "fases": [f[0] for f in fases],
        "partidos_creados": partidos_creados,
    }


@router.delete("/torneo/{torneo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_fixture(torneo_id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    """Elimina todos los fixtures y partidos de un torneo (para regenerar sorteo)."""
    fixtures = db.query(Fixture).filter(Fixture.torneo_id == torneo_id).all()
    for f in fixtures:
        for p in f.partidos:
            db.query(EventoPartido).filter(EventoPartido.partido_id == p.id).delete()
            db.delete(p)
        db.delete(f)
    # Limpiar grupos y seeding de inscripciones
    grupos = db.query(Grupo).filter(Grupo.torneo_id == torneo_id).all()
    for g in grupos:
        db.delete(g)
    inscripciones = db.query(Inscripcion).filter(Inscripcion.torneo_id == torneo_id).all()
    for i in inscripciones:
        i.grupo_id = None
        i.numero_seeding = None
    # Resetear estado del torneo
    torneo = db.query(Torneo).filter(Torneo.id == torneo_id).first()
    if torneo:
        torneo.estado = "inscripciones"
    db.commit()
