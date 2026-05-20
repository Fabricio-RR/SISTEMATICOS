from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuarios import Usuario
from app.models.instituciones import Institucion
from app.schemas.auth import (
    LoginRequest, TokenResponse,
    RecoveryStep1Request, RecoveryStep1Response, RecoveryStep2Request,
    SolicitudAccesoRequest,
)
from app.schemas.usuarios import UsuarioCreate, UsuarioOut
from app.core.security import verify_password, hash_password, create_access_token
from app.core.deps import get_current_user

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.correo == data.correo).first()
    if not user or not verify_password(data.contrasena, user.contrasena_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )
    if not user.esta_activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está pendiente de aprobación por el administrador",
        )

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        rol=user.rol,
        nombre=f"{user.nombres} {user.apellidos}",
    )


@router.post("/register", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def register(data: UsuarioCreate, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.correo == data.correo).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    user = Usuario(
        nombres=data.nombres,
        apellidos=data.apellidos,
        correo=data.correo,
        contrasena_hash=hash_password(data.contrasena),
        rol=data.rol,
        institucion_id=data.institucion_id,
        pregunta_seguridad_1=data.pregunta_seguridad_1,
        respuesta_seguridad_1=hash_password(data.respuesta_seguridad_1.lower().strip()),
        pregunta_seguridad_2=data.pregunta_seguridad_2,
        respuesta_seguridad_2=hash_password(data.respuesta_seguridad_2.lower().strip()),
        pregunta_seguridad_3=data.pregunta_seguridad_3,
        respuesta_seguridad_3=hash_password(data.respuesta_seguridad_3.lower().strip()),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UsuarioOut)
def me(current_user: Usuario = Depends(get_current_user)):
    return current_user


# ── Solicitud de acceso institucional (registro público con aprobación) ──────

@router.post("/solicitar", status_code=status.HTTP_201_CREATED)
def solicitar_acceso(data: SolicitudAccesoRequest, db: Session = Depends(get_db)):
    """
    Formulario público. Crea la institución + usuario con esta_activo=False.
    El admin debe aprobar la cuenta desde el panel.
    """
    if db.query(Usuario).filter(Usuario.correo == data.correo).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    # Crear la institución
    institucion = Institucion(
        nombre=data.nombre_institucion,
        nombre_corto=data.nombre_institucion[:6].upper(),
        ciudad=data.ciudad,
        estado="pendiente",
    )
    db.add(institucion)
    db.flush()  # obtener el id sin hacer commit aún

    # Crear el usuario inactivo (pendiente de aprobación)
    user = Usuario(
        nombres=data.nombres,
        apellidos=data.apellidos,
        correo=data.correo,
        contrasena_hash=hash_password(data.contrasena),
        rol="institucion",
        esta_activo=False,          # bloqueado hasta que el admin apruebe
        institucion_id=institucion.id,
        pregunta_seguridad_1=data.pregunta_seguridad_1,
        respuesta_seguridad_1=hash_password(data.respuesta_seguridad_1.lower().strip()),
        pregunta_seguridad_2=data.pregunta_seguridad_2,
        respuesta_seguridad_2=hash_password(data.respuesta_seguridad_2.lower().strip()),
        pregunta_seguridad_3=data.pregunta_seguridad_3,
        respuesta_seguridad_3=hash_password(data.respuesta_seguridad_3.lower().strip()),
    )
    db.add(user)
    db.commit()
    return {"message": "Solicitud enviada. El administrador revisará tu registro."}


# ── Recuperación de contraseña mediante preguntas de seguridad ──────────────

@router.post("/recovery/questions", response_model=RecoveryStep1Response)
def get_security_questions(data: RecoveryStep1Request, db: Session = Depends(get_db)):
    """Paso 1: el usuario ingresa su correo y recibe sus 3 preguntas de seguridad."""
    user = db.query(Usuario).filter(Usuario.correo == data.correo).first()
    if not user or not user.pregunta_seguridad_1:
        raise HTTPException(
            status_code=404,
            detail="No se encontró una cuenta con preguntas de seguridad configuradas",
        )
    return RecoveryStep1Response(
        correo=user.correo,
        pregunta_1=user.pregunta_seguridad_1,
        pregunta_2=user.pregunta_seguridad_2,
        pregunta_3=user.pregunta_seguridad_3,
    )


@router.post("/recovery/reset", status_code=status.HTTP_200_OK)
def reset_password(data: RecoveryStep2Request, db: Session = Depends(get_db)):
    """Paso 2: valida las 3 respuestas y si son correctas actualiza la contraseña."""
    user = db.query(Usuario).filter(Usuario.correo == data.correo).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    respuestas_correctas = (
        verify_password(data.respuesta_1.lower().strip(), user.respuesta_seguridad_1)
        and verify_password(data.respuesta_2.lower().strip(), user.respuesta_seguridad_2)
        and verify_password(data.respuesta_3.lower().strip(), user.respuesta_seguridad_3)
    )

    if not respuestas_correctas:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Una o más respuestas son incorrectas",
        )

    if len(data.nueva_contrasena) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")

    user.contrasena_hash = hash_password(data.nueva_contrasena)
    db.commit()
    return {"message": "Contraseña actualizada exitosamente"}