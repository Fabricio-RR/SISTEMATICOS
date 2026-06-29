"""
Tests del módulo de torneos (CRUD).
"""
from app.core.security import hash_password
from tests.conftest import TestingSession
from app.models.usuarios import Usuario
from app.models.deportes import Deporte


def _admin_token(client) -> str:
    db = TestingSession()
    admin = db.query(Usuario).filter(Usuario.correo == "admin_torn@test.pe").first()
    if not admin:
        admin = Usuario(
            nombres="Admin", apellidos="Torn",
            correo="admin_torn@test.pe",
            contrasena_hash=hash_password("Admin1234!"),
            rol="admin", esta_activo=True,
            pregunta_seguridad_1="q1", respuesta_seguridad_1=hash_password("r1"),
            pregunta_seguridad_2="q2", respuesta_seguridad_2=hash_password("r2"),
            pregunta_seguridad_3="q3", respuesta_seguridad_3=hash_password("r3"),
        )
        db.add(admin)
        db.commit()
    db.close()
    res = client.post("/api/auth/login", json={"correo": "admin_torn@test.pe", "contrasena": "Admin1234!"})
    return res.json()["access_token"]


def _crear_deporte(client, token: str, nombre: str = "Fútbol Test") -> int:
    res = client.post("/api/deportes/", json={
        "nombre": nombre,
        "tipo_competidor": "equipo",
        "min_jugadores": 11,
        "max_jugadores": 18,
    }, headers={"Authorization": f"Bearer {token}"})
    return res.json()["id"]


def test_listar_torneos_publico(client):
    """GET /api/torneos/ no requiere autenticación."""
    res = client.get("/api/torneos/")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_crear_torneo(client):
    token = _admin_token(client)
    deporte_id = _crear_deporte(client, token, "Fútbol Varones Test")
    res = client.post("/api/torneos/", json={
        "nombre": "Copa Lima 2026",
        "temporada": "2026",
        "deporte_id": deporte_id,
        "fecha_inicio": "2026-07-01",
        "fecha_fin": "2026-07-31",
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
    data = res.json()
    assert data["nombre"] == "Copa Lima 2026"
    assert data["deporte_id"] == deporte_id


def test_crear_torneo_sin_token(client):
    res = client.post("/api/torneos/", json={
        "nombre": "Torneo X", "temporada": "2026", "deporte_id": 1,
    })
    assert res.status_code == 401


def test_obtener_torneo_por_id(client):
    token = _admin_token(client)
    deporte_id = _crear_deporte(client, token, "Básquet Test")
    create_res = client.post("/api/torneos/", json={
        "nombre": "Torneo Básquet 2026",
        "temporada": "2026",
        "deporte_id": deporte_id,
    }, headers={"Authorization": f"Bearer {token}"})
    torneo_id = create_res.json()["id"]

    res = client.get(f"/api/torneos/{torneo_id}")
    assert res.status_code == 200
    assert res.json()["id"] == torneo_id


def test_suspender_reactivar_torneo(client):
    """La API gestiona el ciclo de vida del torneo por transiciones de estado
    (suspender / reactivar), no por edición libre de campos."""
    token = _admin_token(client)
    deporte_id = _crear_deporte(client, token, "Vóley Test")
    create_res = client.post("/api/torneos/", json={
        "nombre": "Torneo Provisional",
        "temporada": "2026",
        "deporte_id": deporte_id,
    }, headers={"Authorization": f"Bearer {token}"})
    torneo_id = create_res.json()["id"]
    estado_inicial = create_res.json()["estado"]

    susp = client.patch(f"/api/torneos/{torneo_id}/suspender",
                        headers={"Authorization": f"Bearer {token}"})
    assert susp.status_code == 200
    assert susp.json()["estado"] == "suspendido"

    react = client.patch(f"/api/torneos/{torneo_id}/reactivar",
                         headers={"Authorization": f"Bearer {token}"})
    assert react.status_code == 200
    assert react.json()["estado"] == estado_inicial


def test_eliminar_torneo(client):
    token = _admin_token(client)
    deporte_id = _crear_deporte(client, token, "Ping Pong Test")
    create_res = client.post("/api/torneos/", json={
        "nombre": "Torneo Para Borrar",
        "temporada": "2026",
        "deporte_id": deporte_id,
    }, headers={"Authorization": f"Bearer {token}"})
    torneo_id = create_res.json()["id"]

    del_res = client.delete(f"/api/torneos/{torneo_id}",
                             headers={"Authorization": f"Bearer {token}"})
    assert del_res.status_code == 204

    get_res = client.get(f"/api/torneos/{torneo_id}")
    assert get_res.status_code == 404
