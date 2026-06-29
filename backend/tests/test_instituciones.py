"""
Tests del módulo de instituciones (CRUD).
"""
from app.core.security import hash_password
from tests.conftest import TestingSession
from app.models.usuarios import Usuario


def _admin_token(client) -> str:
    db = TestingSession()
    admin = db.query(Usuario).filter(Usuario.correo == "admin_inst@test.pe").first()
    if not admin:
        admin = Usuario(
            nombres="Admin", apellidos="Inst",
            correo="admin_inst@test.pe",
            contrasena_hash=hash_password("Admin1234!"),
            rol="admin", esta_activo=True,
            pregunta_seguridad_1="q1", respuesta_seguridad_1=hash_password("r1"),
            pregunta_seguridad_2="q2", respuesta_seguridad_2=hash_password("r2"),
            pregunta_seguridad_3="q3", respuesta_seguridad_3=hash_password("r3"),
        )
        db.add(admin)
        db.commit()
    db.close()
    res = client.post("/api/auth/login", json={"correo": "admin_inst@test.pe", "contrasena": "Admin1234!"})
    return res.json()["access_token"]


def test_listar_instituciones_publico(client):
    """GET /api/instituciones/ es público."""
    res = client.get("/api/instituciones/")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_crear_institucion(client):
    token = _admin_token(client)
    res = client.post("/api/instituciones/", json={
        "nombre": "Universidad Nacional Mayor de San Marcos",
        "nombre_corto": "UNMSM",
        "ciudad": "Lima",
        "nivel": "universidad",
        "categoria": "1° ciclo",
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
    data = res.json()
    assert data["nombre_corto"] == "UNMSM"
    assert data["id"] is not None


def test_crear_institucion_sin_token(client):
    """Sin autenticación debe rechazarse con 401."""
    res = client.post("/api/instituciones/", json={
        "nombre": "Colegio X", "nombre_corto": "CX", "ciudad": "Lima"
    })
    assert res.status_code == 401


def test_obtener_institucion_por_id(client):
    token = _admin_token(client)
    # Crear primero
    create_res = client.post("/api/instituciones/", json={
        "nombre": "UTP Campus Sur", "nombre_corto": "UTP-SUR", "ciudad": "Lima",
    }, headers={"Authorization": f"Bearer {token}"})
    inst_id = create_res.json()["id"]

    res = client.get(f"/api/instituciones/{inst_id}")
    assert res.status_code == 200
    assert res.json()["id"] == inst_id


def test_actualizar_institucion(client):
    token = _admin_token(client)
    create_res = client.post("/api/instituciones/", json={
        "nombre": "Institución Temporal", "nombre_corto": "IT", "ciudad": "Arequipa",
    }, headers={"Authorization": f"Bearer {token}"})
    inst_id = create_res.json()["id"]

    res = client.put(f"/api/instituciones/{inst_id}", json={"ciudad": "Cusco"},
                     headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["ciudad"] == "Cusco"


def test_eliminar_institucion(client):
    token = _admin_token(client)
    create_res = client.post("/api/instituciones/", json={
        "nombre": "Para Borrar", "nombre_corto": "PB", "ciudad": "Lima",
    }, headers={"Authorization": f"Bearer {token}"})
    inst_id = create_res.json()["id"]

    del_res = client.delete(f"/api/instituciones/{inst_id}",
                             headers={"Authorization": f"Bearer {token}"})
    assert del_res.status_code == 204

    get_res = client.get(f"/api/instituciones/{inst_id}")
    assert get_res.status_code == 404
