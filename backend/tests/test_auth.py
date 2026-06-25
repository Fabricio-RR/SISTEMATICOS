"""
Tests de autenticación:
- Registro de usuario
- Login correcto e incorrecto
- Recuperación de contraseña (preguntas de seguridad)
- Solicitud de acceso institucional
"""
import pytest


USUARIO_TEST = {
    "nombres": "Juan",
    "apellidos": "Pérez",
    "correo": "juan.test@olimpiadas.pe",
    "contrasena": "Test1234!",
    "rol": "institucion",
    "institucion_id": None,
    "pregunta_seguridad_1": "¿Nombre de tu mascota?",
    "respuesta_seguridad_1": "firulais",
    "pregunta_seguridad_2": "¿Ciudad de nacimiento?",
    "respuesta_seguridad_2": "lima",
    "pregunta_seguridad_3": "¿Nombre de tu colegio?",
    "respuesta_seguridad_3": "mercedario",
}


def test_register(client):
    res = client.post("/api/auth/register", json=USUARIO_TEST)
    assert res.status_code == 201
    data = res.json()
    assert data["correo"] == USUARIO_TEST["correo"]
    assert data["rol"] == "institucion"


def test_register_correo_duplicado(client):
    """No se puede registrar el mismo correo dos veces."""
    res = client.post("/api/auth/register", json=USUARIO_TEST)
    assert res.status_code == 400
    assert "correo" in res.json()["detail"].lower()


def test_login_exitoso(client):
    res = client.post("/api/auth/login", json={
        "correo": USUARIO_TEST["correo"],
        "contrasena": USUARIO_TEST["contrasena"],
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["rol"] == "institucion"


def test_login_contrasena_incorrecta(client):
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


def test_recovery_preguntas(client):
    """El paso 1 de recovery devuelve las 3 preguntas del usuario."""
    res = client.post("/api/auth/recovery/questions", json={"correo": USUARIO_TEST["correo"]})
    assert res.status_code == 200
    data = res.json()
    assert data["pregunta_1"] == USUARIO_TEST["pregunta_seguridad_1"]
    assert data["pregunta_2"] == USUARIO_TEST["pregunta_seguridad_2"]
    assert data["pregunta_3"] == USUARIO_TEST["pregunta_seguridad_3"]


def test_recovery_reset_exitoso(client):
    """Paso 2: respuestas correctas → contraseña actualizada."""
    res = client.post("/api/auth/recovery/reset", json={
        "correo": USUARIO_TEST["correo"],
        "respuesta_1": USUARIO_TEST["respuesta_seguridad_1"],
        "respuesta_2": USUARIO_TEST["respuesta_seguridad_2"],
        "respuesta_3": USUARIO_TEST["respuesta_seguridad_3"],
        "nueva_contrasena": "NuevaPass2026!",
    })
    assert res.status_code == 200
    assert "actualizada" in res.json()["message"].lower()


def test_recovery_reset_respuestas_incorrectas(client):
    """Respuestas incorrectas deben rechazarse."""
    res = client.post("/api/auth/recovery/reset", json={
        "correo": USUARIO_TEST["correo"],
        "respuesta_1": "respuesta_mala",
        "respuesta_2": "respuesta_mala",
        "respuesta_3": "respuesta_mala",
        "nueva_contrasena": "OtraPass123!",
    })
    assert res.status_code == 400


def test_solicitar_acceso(client):
    """Un usuario nuevo puede solicitar acceso institucional."""
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


def test_login_bloqueado_hasta_aprobacion(client):
    """Un usuario con esta_activo=False no puede hacer login."""
    res = client.post("/api/auth/login", json={
        "correo": "maria.test@colegio.pe",
        "contrasena": "Maria1234!",
    })
    assert res.status_code == 403
