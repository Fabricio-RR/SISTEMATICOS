# Pruebas del endpoint de deportes: validación de tipo y duplicados normalizados.
from app.core.security import hash_password
from app.models.usuarios import Usuario


def _admin_token(client, db_session) -> str:
    db_session.add(Usuario(
        nombres="Admin", apellidos="Test", correo="admin@test.pe",
        contrasena_hash=hash_password("Admin1234!"), rol="admin", esta_activo=True,
    ))
    db_session.commit()
    res = client.request("POST", "/api/auth/login", json={"correo": "admin@test.pe", "contrasena": "Admin1234!"})
    assert res.status_code == 200
    return res.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_crear_deporte_ok(client, db_session):
    token = _admin_token(client, db_session)
    res = client.request("POST", "/api/deportes/", headers=_auth(token), json={
        "nombre": "Fútbol", "tipo_competidor": "equipo",
    })
    assert res.status_code == 201


def test_crear_deporte_tipo_invalido_rechazado(client, db_session):
    token = _admin_token(client, db_session)
    res = client.request("POST", "/api/deportes/", headers=_auth(token), json={
        "nombre": "Ajedrez", "tipo_competidor": "duo",
    })
    assert res.status_code == 422


def test_crear_deporte_duplicado_normalizado_bloquea(client, db_session):
    token = _admin_token(client, db_session)
    r1 = client.request("POST", "/api/deportes/", headers=_auth(token), json={"nombre": "Fútbol"})
    assert r1.status_code == 201
    # "FUTBOL" sin tilde y en mayúsculas → mismo deporte → 400.
    r2 = client.request("POST", "/api/deportes/", headers=_auth(token), json={"nombre": "FUTBOL"})
    assert r2.status_code == 400
