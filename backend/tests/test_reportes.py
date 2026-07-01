# Pruebas de los endpoints de reportes: autorización (admin) y conteos correctos.
from app.core.security import hash_password
from app.models.usuarios import Usuario
from app.models.instituciones import Institucion
from app.models.deportes import Deporte
from app.models.club_equipo import ClubEquipo
from app.models.atleta_jugador import AtletaJugador


def _admin_token(client, db_session) -> str:
    db_session.add(Usuario(
        nombres="Admin", apellidos="Test", correo="admin@test.pe",
        contrasena_hash=hash_password("Admin1234!"), rol="admin", esta_activo=True,
    ))
    db_session.commit()
    res = client.request("POST", "/api/auth/login", json={"correo": "admin@test.pe", "contrasena": "Admin1234!"})
    assert res.status_code == 200
    return res.json()["access_token"]


def _seed_participantes(db_session) -> None:
    inst = Institucion(nombre="Colegio A", nombre_corto="COLA", ciudad="Lima")
    dep = Deporte(nombre="Fútbol", tipo_competidor="equipo")
    db_session.add_all([inst, dep])
    db_session.flush()
    equipo = ClubEquipo(institucion_id=inst.id, deporte_id=dep.id, nombre_equipo="A FC", estado="aprobado")
    db_session.add(equipo)
    db_session.flush()
    db_session.add_all([
        AtletaJugador(club_equipo_id=equipo.id, nombre_completo="Jugador 1", documento_identidad="11111111"),
        AtletaJugador(club_equipo_id=equipo.id, nombre_completo="Jugador 2", documento_identidad="22222222"),
    ])
    db_session.commit()


def test_reportes_requieren_autenticacion(client):
    assert client.get("/api/reportes/resumen").status_code == 401
    assert client.get("/api/reportes/participantes-por-institucion").status_code == 401


def test_resumen_cuenta_entidades(client, db_session):
    _seed_participantes(db_session)
    token = _admin_token(client, db_session)
    res = client.get("/api/reportes/resumen", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["instituciones"] == 1
    assert data["equipos"] == 1
    assert data["atletas"] == 2
    assert data["deportes"] == 1


def test_participantes_por_institucion(client, db_session):
    _seed_participantes(db_session)
    token = _admin_token(client, db_session)
    res = client.get("/api/reportes/participantes-por-institucion", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    filas = res.json()
    assert len(filas) == 1
    assert filas[0]["institucion"] == "Colegio A"
    assert filas[0]["equipos"] == 1
    assert filas[0]["atletas"] == 2


def test_reportes_rechaza_no_admin(client, db_session):
    db_session.add(Usuario(
        nombres="Inst", apellidos="Test", correo="inst@test.pe",
        contrasena_hash=hash_password("Inst1234!"), rol="institucion", esta_activo=True,
    ))
    db_session.commit()
    res = client.request("POST", "/api/auth/login", json={"correo": "inst@test.pe", "contrasena": "Inst1234!"})
    token = res.json()["access_token"]
    assert client.get("/api/reportes/resumen", headers={"Authorization": f"Bearer {token}"}).status_code == 403
