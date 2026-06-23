# Pruebas de los endpoints de instituciones: detección de duplicados al crear.
from app.core.security import hash_password
from app.models.instituciones import Institucion
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


def test_similares_detecta_variantes(client, db_session):
    db_session.add(Institucion(
        nombre="Universidad Tecnológica del Perú", nombre_corto="UTP", ciudad="Lima",
        nombre_normalizado="TECNOLOGICA PERU",
    ))
    db_session.commit()

    res = client.get("/api/instituciones/similares?nombre=UNIVERSIDAD%20TECNOLOGICA%20DEL%20PERU")
    assert res.status_code == 200
    data = res.json()
    assert data and data[0]["exacto"] is True


def test_crear_duplicado_exacto_bloquea(client, db_session):
    token = _admin_token(client, db_session)
    db_session.add(Institucion(
        nombre="Universidad Tecnológica del Perú", nombre_corto="UTP", ciudad="Lima",
        nombre_normalizado="TECNOLOGICA PERU",
    ))
    db_session.commit()

    res = client.request(
        "POST", "/api/instituciones/",
        headers=_auth(token),
        json={"nombre": "UNIVERSIDAD TECNOLOGICA DEL PERU", "nombre_corto": "UTP2", "ciudad": "Lima"},
    )
    assert res.status_code == 409


def test_crear_duplicado_con_override(client, db_session):
    token = _admin_token(client, db_session)
    db_session.add(Institucion(
        nombre="Universidad Tecnológica del Perú", nombre_corto="UTP", ciudad="Lima",
        nombre_normalizado="TECNOLOGICA PERU",
    ))
    db_session.commit()

    res = client.request(
        "POST", "/api/instituciones/?permitir_duplicado=true",
        headers=_auth(token),
        json={"nombre": "UNIVERSIDAD TECNOLOGICA DEL PERU", "nombre_corto": "UTP2", "ciudad": "Lima"},
    )
    assert res.status_code == 201
    creada = db_session.query(Institucion).filter(Institucion.nombre_corto == "UTP2").first()
    assert creada is not None and creada.nombre_normalizado == "TECNOLOGICA PERU"


def test_solicitar_institucion_existente_bloquea(client, db_session):
    db_session.add(Institucion(
        nombre="Universidad Tecnológica del Perú", nombre_corto="UTP", ciudad="Lima",
        nombre_normalizado="TECNOLOGICA PERU", estado="activo",
    ))
    db_session.commit()

    res = client.request("POST", "/api/auth/solicitar", json={
        "nombres": "Ana", "apellidos": "Pérez", "correo": "ana@inst.pe", "contrasena": "claveSegura1",
        "nombre_institucion": "UNIVERSIDAD TECNOLOGICA DEL PERU", "ciudad": "Lima",
        "pregunta_seguridad_1": "p1", "respuesta_seguridad_1": "r1",
        "pregunta_seguridad_2": "p2", "respuesta_seguridad_2": "r2",
        "pregunta_seguridad_3": "p3", "respuesta_seguridad_3": "r3",
    })
    assert res.status_code == 400
