"""
Tests de autenticación:
- Registro de usuario (solo admin, con validación estricta de rol/institución)
- Login correcto e incorrecto
- Recuperación de contraseña (preguntas de seguridad)
- Solicitud de acceso institucional

Nota: la BD se reinicia entre cada test (fixture reset_db), por lo que cada
prueba siembra su propio estado en lugar de depender de pruebas anteriores.
"""
from app.core.security import hash_password
from tests.conftest import TestingSession
from app.models.usuarios import Usuario
from app.models.instituciones import Institucion


USUARIO_TEST = {
    "correo": "juan.test@olimpiadas.pe",
    "contrasena": "Test1234!",
    "preguntas": {
        "pregunta_seguridad_1": "¿Nombre de tu mascota?",
        "respuesta_seguridad_1": "firulais",
        "pregunta_seguridad_2": "¿Ciudad de nacimiento?",
        "respuesta_seguridad_2": "lima",
        "pregunta_seguridad_3": "¿Nombre de tu colegio?",
        "respuesta_seguridad_3": "mercedario",
    },
}


def _admin_token(client) -> str:
    """Siembra un admin y devuelve su token de acceso."""
    db = TestingSession()
    if not db.query(Usuario).filter(Usuario.correo == "admin_auth@test.pe").first():
        db.add(Usuario(
            nombres="Admin", apellidos="Auth",
            correo="admin_auth@test.pe",
            contrasena_hash=hash_password("Admin1234!"),
            rol="admin", esta_activo=True,
            pregunta_seguridad_1="q1", respuesta_seguridad_1=hash_password("r1"),
            pregunta_seguridad_2="q2", respuesta_seguridad_2=hash_password("r2"),
            pregunta_seguridad_3="q3", respuesta_seguridad_3=hash_password("r3"),
        ))
        db.commit()
    db.close()
    res = client.post("/api/auth/login", json={"correo": "admin_auth@test.pe", "contrasena": "Admin1234!"})
    return res.json()["access_token"]


def _seed_usuario_institucion(correo: str = None, contrasena: str = None, activo: bool = True) -> None:
    """Siembra directamente un usuario institucional con sus preguntas de seguridad."""
    correo = correo or USUARIO_TEST["correo"]
    contrasena = contrasena or USUARIO_TEST["contrasena"]
    p = USUARIO_TEST["preguntas"]
    db = TestingSession()
    if not db.query(Usuario).filter(Usuario.correo == correo).first():
        db.add(Usuario(
            nombres="Juan", apellidos="Pérez",
            correo=correo,
            contrasena_hash=hash_password(contrasena),
            rol="institucion", esta_activo=activo,
            pregunta_seguridad_1=p["pregunta_seguridad_1"],
            respuesta_seguridad_1=hash_password(p["respuesta_seguridad_1"]),
            pregunta_seguridad_2=p["pregunta_seguridad_2"],
            respuesta_seguridad_2=hash_password(p["respuesta_seguridad_2"]),
            pregunta_seguridad_3=p["pregunta_seguridad_3"],
            respuesta_seguridad_3=hash_password(p["respuesta_seguridad_3"]),
        ))
        db.commit()
    db.close()


# ── Registro (ahora restringido a administradores) ──────────────────────────

def test_register_requiere_admin(client):
    """El registro directo ya no es público: sin token de admin responde 401."""
    res = client.post("/api/auth/register", json={
        "nombres": "Juan", "apellidos": "Pérez",
        "correo": "nuevo@olimpiadas.pe", "contrasena": "Test1234!",
        "rol": "arbitro",
        **USUARIO_TEST["preguntas"],
    })
    assert res.status_code == 401


def test_register_admin(client):
    """Un admin sí puede registrar un usuario institucional (con su institución)."""
    token = _admin_token(client)
    db = TestingSession()
    inst = Institucion(nombre="Colegio Registro", nombre_corto="CR", ciudad="Lima")
    db.add(inst)
    db.commit()
    inst_id = inst.id
    db.close()

    res = client.post("/api/auth/register", json={
        "nombres": "Juan", "apellidos": "Pérez",
        "correo": USUARIO_TEST["correo"], "contrasena": USUARIO_TEST["contrasena"],
        "rol": "institucion", "institucion_id": inst_id,
        **USUARIO_TEST["preguntas"],
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
    data = res.json()
    assert data["correo"] == USUARIO_TEST["correo"]
    assert data["rol"] == "institucion"


def test_register_correo_duplicado(client):
    """No se puede registrar el mismo correo dos veces."""
    token = _admin_token(client)
    _seed_usuario_institucion()
    res = client.post("/api/auth/register", json={
        "nombres": "Otro", "apellidos": "Usuario",
        "correo": USUARIO_TEST["correo"], "contrasena": "Otra1234!",
        "rol": "arbitro",
        **USUARIO_TEST["preguntas"],
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400
    assert "correo" in res.json()["detail"].lower()


# ── Login ───────────────────────────────────────────────────────────────────

def test_login_exitoso(client):
    _seed_usuario_institucion()
    res = client.post("/api/auth/login", json={
        "correo": USUARIO_TEST["correo"],
        "contrasena": USUARIO_TEST["contrasena"],
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["rol"] == "institucion"


def test_login_contrasena_incorrecta(client):
    _seed_usuario_institucion()
    res = client.post("/api/auth/login", json={
        "correo": USUARIO_TEST["correo"],
        "contrasena": "WrongPass!",
    })
    assert res.status_code == 401


def test_login_correo_inexistente(client):
    res = client.post("/api/auth/login", json={
        "correo": "noexiste@olimpiadas.pe",
        "contrasena": "Test1234!",
    })
    assert res.status_code == 401


def test_login_bloqueado_hasta_aprobacion(client):
    """Un usuario con esta_activo=False no puede hacer login."""
    _seed_usuario_institucion(correo="pendiente@colegio.pe", activo=False)
    res = client.post("/api/auth/login", json={
        "correo": "pendiente@colegio.pe",
        "contrasena": USUARIO_TEST["contrasena"],
    })
    assert res.status_code == 403


# ── Recuperación de contraseña por preguntas de seguridad ───────────────────

def test_recovery_preguntas(client):
    """El paso 1 de recovery devuelve las 3 preguntas del usuario."""
    _seed_usuario_institucion()
    p = USUARIO_TEST["preguntas"]
    res = client.post("/api/auth/recovery/questions", json={"correo": USUARIO_TEST["correo"]})
    assert res.status_code == 200
    data = res.json()
    assert data["pregunta_1"] == p["pregunta_seguridad_1"]
    assert data["pregunta_2"] == p["pregunta_seguridad_2"]
    assert data["pregunta_3"] == p["pregunta_seguridad_3"]


def test_recovery_reset_exitoso(client):
    """Paso 2: respuestas correctas → contraseña actualizada."""
    _seed_usuario_institucion()
    p = USUARIO_TEST["preguntas"]
    res = client.post("/api/auth/recovery/reset", json={
        "correo": USUARIO_TEST["correo"],
        "respuesta_1": p["respuesta_seguridad_1"],
        "respuesta_2": p["respuesta_seguridad_2"],
        "respuesta_3": p["respuesta_seguridad_3"],
        "nueva_contrasena": "NuevaPass2026!",
    })
    assert res.status_code == 200
    assert "actualizada" in res.json()["message"].lower()


def test_recovery_reset_respuestas_incorrectas(client):
    """Respuestas incorrectas deben rechazarse."""
    _seed_usuario_institucion()
    res = client.post("/api/auth/recovery/reset", json={
        "correo": USUARIO_TEST["correo"],
        "respuesta_1": "respuesta_mala",
        "respuesta_2": "respuesta_mala",
        "respuesta_3": "respuesta_mala",
        "nueva_contrasena": "OtraPass123!",
    })
    assert res.status_code == 400


# ── Solicitud pública de acceso institucional ───────────────────────────────

def test_solicitar_acceso(client):
    """Un usuario nuevo puede solicitar acceso institucional (registro público)."""
    res = client.post("/api/auth/solicitar", json={
        "nombres": "María",
        "apellidos": "García",
        "correo": "maria.test@colegio.pe",
        "contrasena": "Maria1234!",
        "nombre_institucion": "Colegio San Marcos",
        "ciudad": "Lima",
        "pregunta_seguridad_1": "¿Mascota?",
        "respuesta_seguridad_1": "pelusa",
        "pregunta_seguridad_2": "¿Ciudad?",
        "respuesta_seguridad_2": "lima",
        "pregunta_seguridad_3": "¿Colegio?",
        "respuesta_seguridad_3": "san marcos",
    })
    assert res.status_code == 201
