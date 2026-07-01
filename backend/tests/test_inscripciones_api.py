# Pruebas del endpoint de inscripciones: autenticación y validación de seeding.
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


def test_listar_inscripciones_requiere_autenticacion(client):
    assert client.get("/api/inscripciones/").status_code == 401


def test_listar_inscripciones_autenticado_ok(client, db_session):
    token = _admin_token(client, db_session)
    res = client.get("/api/inscripciones/", headers=_auth(token))
    assert res.status_code == 200
    assert res.json() == []


def test_crear_inscripcion_seeding_invalido_rechazado(client, db_session):
    token = _admin_token(client, db_session)
    # numero_seeding=0 falla la validación pydantic (ge=1) antes de tocar la BD.
    res = client.request("POST", "/api/inscripciones/", headers=_auth(token), json={
        "torneo_id": 1, "club_equipo_id": 1, "numero_seeding": 0,
    })
    assert res.status_code == 422
