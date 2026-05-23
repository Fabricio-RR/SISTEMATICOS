from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.instituciones import Institucion
from app.schemas.instituciones import InstitucionCreate, InstitucionUpdate, InstitucionOut
from app.core.deps import require_admin
from app.models.usuarios import Usuario
from app.core.categorias import pais_por_categoria

router = APIRouter()


@router.get("/", response_model=list[InstitucionOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Institucion).all()


@router.get("/{id}", response_model=InstitucionOut)
def get_by_id(id: int, db: Session = Depends(get_db)):
    inst = db.query(Institucion).filter(Institucion.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institución no encontrada")
    return inst


@router.post("/", response_model=InstitucionOut, status_code=status.HTTP_201_CREATED)
def create(data: InstitucionCreate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    dump = data.model_dump()
    if dump.get("categoria") and not dump.get("pais_representativo"):
        dump["pais_representativo"] = pais_por_categoria(dump["categoria"])
    inst = Institucion(**dump)
    db.add(inst)
    db.commit()
    db.refresh(inst)
    return inst


@router.put("/{id}", response_model=InstitucionOut)
def update(id: int, data: InstitucionUpdate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    inst = db.query(Institucion).filter(Institucion.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institución no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(inst, field, value)
    db.commit()
    db.refresh(inst)
    return inst


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    inst = db.query(Institucion).filter(Institucion.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institución no encontrada")
    db.delete(inst)
    db.commit()