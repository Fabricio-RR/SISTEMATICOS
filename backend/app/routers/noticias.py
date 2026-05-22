from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.noticias import Noticia
from app.schemas.noticias import NoticiaCreate, NoticiaOut
from app.core.deps import require_admin
from app.models.usuarios import Usuario

router = APIRouter()


@router.get("/", response_model=list[NoticiaOut])
def get_published(db: Session = Depends(get_db)):
    return db.query(Noticia).filter(Noticia.esta_publicado == True).order_by(Noticia.fecha_publicacion.desc()).all()


@router.get("/all", response_model=list[NoticiaOut])
def get_all_admin(db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    return db.query(Noticia).order_by(Noticia.id.desc()).all()


@router.post("/", response_model=NoticiaOut, status_code=status.HTTP_201_CREATED)
def create(data: NoticiaCreate, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    noticia = Noticia(**data.model_dump())
    db.add(noticia)
    db.commit()
    db.refresh(noticia)
    return noticia


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(id: int, db: Session = Depends(get_db), _: Usuario = Depends(require_admin)):
    noticia = db.query(Noticia).filter(Noticia.id == id).first()
    if not noticia:
        raise HTTPException(status_code=404, detail="Noticia no encontrada")
    db.delete(noticia)
    db.commit()