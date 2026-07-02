from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.instituciones import Institucion
from app.schemas.instituciones import (
    InstitucionCreate,
    InstitucionUpdate,
    InstitucionOut,
    InstitucionSimilar,
)
from app.core.deps import require_admin
from app.models.usuarios import Usuario
from app.core.categorias import pais_por_categoria
from app.models.club_equipo import ClubEquipo
from app.services.email import send_email
from app.services.instituciones import (
    candidatos_duplicados,
    clave_canonica,
    hay_duplicado_exacto,
)

router = APIRouter()


def _enviar_bienvenida(background: BackgroundTasks, inst: Institucion) -> None:
    """Encola el correo de bienvenida a la institución si su `contacto` es un correo.
    Se usa al crear y al editar (cuando se añade/cambia el correo de contacto)."""
    if inst.contacto and "@" in inst.contacto:
        background.add_task(
            send_email,
            inst.contacto,
            "¡Bienvenidos a Olimpiadas Perú!",
            f"¡Hola, {inst.nombre}!\n\n"
            f"¡Nos alegra tenerlos con nosotros! Ya están registrados en Olimpiadas Perú "
            f"y listos para competir.\n\n"
            f"Desde ahora pueden inscribir a sus equipos en los torneos disponibles, seguir "
            f"sus partidos y consultar la tabla de posiciones en tiempo real.\n\n"
            f"¡Les deseamos muchos éxitos en la competencia!\n\n— El equipo de Olimpiadas Perú",
        )


def _a_similar(candidatos) -> list[InstitucionSimilar]:
    return [
        InstitucionSimilar(
            id=c.institucion.id,
            nombre=c.institucion.nombre,
            nombre_corto=c.institucion.nombre_corto,
            ciudad=c.institucion.ciudad,
            estado=c.institucion.estado,
            motivo=c.motivo,
            exacto=c.exacto,
        )
        for c in candidatos
    ]


@router.get("/", response_model=list[InstitucionOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Institucion).all()


@router.get("/similares", response_model=list[InstitucionSimilar])
def similares(
    nombre: str = Query(..., min_length=2),
    nombre_corto: str | None = Query(default=None),
    excluir_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Devuelve instituciones existentes que podrían ser la misma que se intenta
    registrar (aunque esté escrita distinto). Lo usan el formulario de admin, el
    portal público y la pantalla de aprobación para avisar antes de duplicar.
    """
    candidatos = candidatos_duplicados(db, nombre, nombre_corto, excluir_id=excluir_id)
    return _a_similar(candidatos)


@router.get("/{id}", response_model=InstitucionOut)
def get_by_id(id: int, db: Session = Depends(get_db)):
    inst = db.query(Institucion).filter(Institucion.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institución no encontrada")
    return inst


@router.post("/", response_model=InstitucionOut, status_code=status.HTTP_201_CREATED)
def create(
    data: InstitucionCreate,
    background: BackgroundTasks,
    permitir_duplicado: bool = Query(
        default=False,
        description="Si es True, omite el bloqueo por coincidencia exacta (decisión del admin).",
    ),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    # Bloqueo solo ante coincidencia idéntica (tras normalizar). Las parecidas no
    # bloquean en el servidor: el frontend avisa y, si el admin confirma, reenvía
    # con permitir_duplicado=true.
    if not permitir_duplicado:
        candidatos = candidatos_duplicados(db, data.nombre, data.nombre_corto)
        exacto = hay_duplicado_exacto(candidatos)
        if exacto:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Ya existe una institución equivalente: «{exacto.institucion.nombre}» "
                    f"({exacto.institucion.ciudad}). Usa la existente o confirma para crear de todas formas."
                ),
            )

    dump = data.model_dump()
    if dump.get("categoria") and not dump.get("pais_representativo"):
        dump["pais_representativo"] = pais_por_categoria(dump["categoria"])
    inst = Institucion(**dump, nombre_normalizado=clave_canonica(data.nombre))
    db.add(inst)
    db.commit()
    db.refresh(inst)

    # Si la institución trae un correo de contacto, le avisamos que quedó registrada.
    # Se manda en segundo plano: si el correo falla, el alta ya quedó guardada.
    _enviar_bienvenida(background, inst)

    return inst


@router.put("/{id}", response_model=InstitucionOut)
def update(id: int, data: InstitucionUpdate, background: BackgroundTasks, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    inst = db.query(Institucion).filter(Institucion.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institución no encontrada")
    contacto_previo = inst.contacto  # para detectar si el correo de contacto cambia
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(inst, field, value)
    if data.nombre is not None:
        # El nombre cambió: mantener la clave canónica en sincronía.
        inst.nombre_normalizado = clave_canonica(inst.nombre)
    db.commit()
    db.refresh(inst)

    # Si el correo de contacto cambió a uno nuevo (p. ej. se le añadió a una
    # institución precargada), le mandamos la bienvenida "como si fuera el alta".
    if inst.contacto and "@" in inst.contacto and inst.contacto != contacto_previo:
        _enviar_bienvenida(background, inst)

    return inst


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    inst = db.query(Institucion).filter(Institucion.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institución no encontrada")
    if db.query(ClubEquipo).filter(ClubEquipo.institucion_id == id).first():
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar la institución porque tiene equipos registrados",
        )
    if db.query(Usuario).filter(Usuario.institucion_id == id).first():
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar la institución porque tiene usuarios asociados",
        )
    db.delete(inst)
    db.commit()
