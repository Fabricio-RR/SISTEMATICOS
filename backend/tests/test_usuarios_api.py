# Pruebas del endpoint de usuarios: validación de registro y guardas de seguridad.
from app.core.security import hash_password
from app.models.usuarios import Usuario


def _crear_admin(db_session) -> Usuario:
    admin = Usuario(
        nombres="Admin", apellidos="Test", correo="admin@test.pe",
        contrasena_hash=hash_password("Admin1234!"), rol="admin", esta_activo=True,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


def _login(client) -> str:
    res = client.request("POST", "/api/auth/login", json={"correo": "admin@test.pe", "contrasena": "Admin1234!"})
    assert res.status_code == 200
    return res.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


_PREGUNTAS = {
    "pregunta_seguridad_1": "p1", "respuesta_seguridad_1": "r1",
    "pregunta_seguridad_2": "p2", "respuesta_seguridad_2": "r2",
    "pregunta_seguridad_3": "p3", "respuesta_seguridad_3": "r3",
}


def test_admin_no_puede_desactivarse_a_si_mismo(client, db_session):
    admin = _crear_admin(db_session)
    token = _login(client)
    res = client.request("PATCH", f"/api/usuarios/{admin.id}/deactivate", headers=_auth(token))
    assert res.status_code == 409


def test_register_institucion_sin_institucion_id_rechazado(client, db_session):
    _crear_admin(db_session)
    token = _login(client)
    res = client.request("POST", "/api/auth/register", headers=_auth(token), json={
        "nombres": "Ana", "apellidos": "Pérez", "correo": "ana@x.pe",
        "contrasena": "claveSegura1", "rol": "institucion", **_PREGUNTAS,
    })
    assert res.status_code == 422


def test_register_admin_con_institucion_id_rechazado(client, db_session):
    _crear_admin(db_session)
    token = _login(client)
    res = client.request("POST", "/api/auth/register", headers=_auth(token), json={
        "nombres": "Bob", "apellidos": "Gómez", "correo": "bob@x.pe",
        "contrasena": "claveSegura1", "rol": "admin", "institucion_id": 1, **_PREGUNTAS,
    })
    assert res.status_code == 422


def test_register_contrasena_corta_rechazada(client, db_session):
    _crear_admin(db_session)
    token = _login(client)
    res = client.request("POST", "/api/auth/register", headers=_auth(token), json={
        "nombres": "Cyn", "apellidos": "Díaz", "correo": "cyn@x.pe",
        "contrasena": "corta", "rol": "arbitro", **_PREGUNTAS,
    })
    assert res.status_code == 422
