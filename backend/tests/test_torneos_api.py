# Pruebas del endpoint de torneos: validación de formato y detección de duplicados.
from app.core.security import hash_password
from app.models.deportes import Deporte
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


def _deporte(db_session) -> int:
    dep = Deporte(nombre="Fútbol", tipo_competidor="equipo", esta_activo=True)
    db_session.add(dep)
    db_session.commit()
    return dep.id


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_crear_torneo_ok(client, db_session):
    token = _admin_token(client, db_session)
    dep = _deporte(db_session)
    res = client.request("POST", "/api/torneos/", headers=_auth(token), json={
        "deporte_id": dep, "nombre": "Copa Apertura", "formato": "liga", "temporada": "2026",
    })
    assert res.status_code == 201


def test_crear_torneo_formato_invalido_rechazado(client, db_session):
    token = _admin_token(client, db_session)
    dep = _deporte(db_session)
    res = client.request("POST", "/api/torneos/", headers=_auth(token), json={
        "deporte_id": dep, "nombre": "Copa X", "formato": "round_robin", "temporada": "2026",
    })
    assert res.status_code == 422


def test_crear_torneo_duplicado_normalizado_bloquea(client, db_session):
    token = _admin_token(client, db_session)
    dep = _deporte(db_session)
    base = {"deporte_id": dep, "formato": "liga", "temporada": "2026"}
    r1 = client.request("POST", "/api/torneos/", headers=_auth(token), json={**base, "nombre": "Copa Apertura"})
    assert r1.status_code == 201
    # Mismo deporte y temporada, nombre escrito distinto → 409.
    r2 = client.request("POST", "/api/torneos/", headers=_auth(token), json={**base, "nombre": "  COPA   APERTURA "})
    assert r2.status_code == 409
