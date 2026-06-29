"""
Tests del módulo de deportes.
"""
import pytest


def _get_admin_token(client) -> str:
    """Crea un admin y devuelve su token."""
    from app.core.security import hash_password
    from tests.conftest import TestingSession
    from app.models.usuarios import Usuario

    db = TestingSession()
    admin = db.query(Usuario).filter(Usuario.correo == "admin@test.pe").first()
    if not admin:
        admin = Usuario(
            nombres="Admin", apellidos="Test",
            correo="admin@test.pe",
            contrasena_hash=hash_password("Admin1234!"),
            rol="admin", esta_activo=True,
            pregunta_seguridad_1="q1", respuesta_seguridad_1=hash_password("r1"),
            pregunta_seguridad_2="q2", respuesta_seguridad_2=hash_password("r2"),
            pregunta_seguridad_3="q3", respuesta_seguridad_3=hash_password("r3"),
        )
        db.add(admin)
        db.commit()
    db.close()

    res = client.post("/api/auth/login", json={"correo": "admin@test.pe", "contrasena": "Admin1234!"})
    return res.json()["access_token"]


def test_get_deportes_vacio(client):
    """GET /api/deportes/ devuelve lista (puede estar vacía)."""
    res = client.get("/api/deportes/")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_crear_deporte(client):
    token = _get_admin_token(client)
    res = client.post("/api/deportes/", json={"nombre": "Fútbol Varones", "tipo_competidor": "equipo"},
                      headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
    assert res.json()["nombre"] == "Fútbol Varones"


def test_crear_deporte_sin_autenticacion(client):
    """Sin token debe rechazarse."""
    res = client.post("/api/deportes/", json={"nombre": "Básquet", "tipo_competidor": "equipo"})
    assert res.status_code == 401


def test_listar_deportes(client):
    token = _get_admin_token(client)
    client.post("/api/deportes/", json={"nombre": "Fútbol Varones", "tipo_competidor": "equipo"},
                headers={"Authorization": f"Bearer {token}"})
    res = client.get("/api/deportes/")
    assert res.status_code == 200
    deportes = res.json()
    assert any(d["nombre"] == "Fútbol Varones" for d in deportes)
