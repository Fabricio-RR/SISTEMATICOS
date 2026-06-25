"""
Tests del flujo de inscripciones:
- Inscribir equipo en torneo
- Aprobar inscripción (admin)
- Rechazar inscripción (admin)
- No permitir inscripción duplicada
"""
from app.core.security import hash_password
from tests.conftest import TestingSession
from app.models.usuarios import Usuario
from app.models.instituciones import Institucion
from app.models.deportes import Deporte
from app.models.torneos import Torneo
from app.models.club_equipo import ClubEquipo
from app.models.atleta_jugador import AtletaJugador


def _setup_datos(client):
    """Crea admin, institución, deporte, torneo y equipo. Devuelve ids y tokens."""
    db = TestingSession()

    # Admin
    admin = db.query(Usuario).filter(Usuario.correo == "admin_insc@test.pe").first()
    if not admin:
        admin = Usuario(
            nombres="Admin", apellidos="Insc",
            correo="admin_insc@test.pe",
            contrasena_hash=hash_password("Admin1234!"),
            rol="admin", esta_activo=True,
            pregunta_seguridad_1="q1", respuesta_seguridad_1=hash_password("r1"),
            pregunta_seguridad_2="q2", respuesta_seguridad_2=hash_password("r2"),
            pregunta_seguridad_3="q3", respuesta_seguridad_3=hash_password("r3"),
        )
        db.add(admin)
        db.flush()

    # Institución
    inst = db.query(Institucion).filter(Institucion.nombre_corto == "UTP-INSC").first()
    if not inst:
        inst = Institucion(nombre="UTP Inscripciones", nombre_corto="UTP-INSC", ciudad="Lima")
        db.add(inst)
        db.flush()

    # Usuario institucional vinculado
    user_inst = db.query(Usuario).filter(Usuario.correo == "inst_insc@test.pe").first()
    if not user_inst:
        user_inst = Usuario(
            nombres="Rep", apellidos="Inst",
            correo="inst_insc@test.pe",
            contrasena_hash=hash_password("Inst1234!"),
            rol="institucion", esta_activo=True,
            institucion_id=inst.id,
            pregunta_seguridad_1="q1", respuesta_seguridad_1=hash_password("r1"),
            pregunta_seguridad_2="q2", respuesta_seguridad_2=hash_password("r2"),
            pregunta_seguridad_3="q3", respuesta_seguridad_3=hash_password("r3"),
        )
        db.add(user_inst)
        db.flush()

    # Deporte
    dep = db.query(Deporte).filter(Deporte.nombre == "Fútbol Insc Test").first()
    if not dep:
        dep = Deporte(
            nombre="Fútbol Insc Test", tipo_competidor="equipo",
            min_jugadores=1, max_jugadores=20,
        )
        db.add(dep)
        db.flush()

    # Torneo
    torn = db.query(Torneo).filter(Torneo.nombre == "Copa Inscripción 2026").first()
    if not torn:
        torn = Torneo(nombre="Copa Inscripción 2026", temporada="2026", deporte_id=dep.id)
        db.add(torn)
        db.flush()

    # Equipo
    equipo = db.query(ClubEquipo).filter(ClubEquipo.nombre_equipo == "Los Probadores").first()
    if not equipo:
        equipo = ClubEquipo(
            nombre_equipo="Los Probadores",
            institucion_id=inst.id,
            deporte_id=dep.id,
        )
        db.add(equipo)
        db.flush()

        # Jugadores mínimos para que la validación pase
        for i in range(3):
            db.add(AtletaJugador(
                nombre_completo=f"Jugador Test {i+1}",
                documento_identidad=f"7000000{i+1}",
                club_equipo_id=equipo.id,
                estado="activo",
            ))

    db.commit()
    ids = {
        "institucion_id": inst.id,
        "deporte_id": dep.id,
        "torneo_id": torn.id,
        "equipo_id": equipo.id,
    }
    db.close()
    return ids


def test_inscribir_equipo(client):
    ids = _setup_datos(client)

    # Login como institución
    login = client.post("/api/auth/login", json={"correo": "inst_insc@test.pe", "contrasena": "Inst1234!"})
    token = login.json()["access_token"]

    res = client.post("/api/inscripciones/", json={
        "torneo_id": ids["torneo_id"],
        "club_equipo_id": ids["equipo_id"],
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
    data = res.json()
    assert data["estado"] == "pendiente"
    assert data["torneo_id"] == ids["torneo_id"]


def test_inscripcion_duplicada(client):
    """No puede inscribirse el mismo equipo dos veces en el mismo torneo."""
    ids = _setup_datos(client)
    login = client.post("/api/auth/login", json={"correo": "inst_insc@test.pe", "contrasena": "Inst1234!"})
    token = login.json()["access_token"]

    client.post("/api/inscripciones/", json={
        "torneo_id": ids["torneo_id"],
        "club_equipo_id": ids["equipo_id"],
    }, headers={"Authorization": f"Bearer {token}"})

    res = client.post("/api/inscripciones/", json={
        "torneo_id": ids["torneo_id"],
        "club_equipo_id": ids["equipo_id"],
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 400
    assert "inscrito" in res.json()["detail"].lower()


def _crear_inscripcion_pendiente(client, token_inst: str, torneo_id: int, equipo_id: int) -> int:
    """Inscribe o recupera la inscripción existente y devuelve su id."""
    from tests.conftest import TestingSession
    from app.models.inscripciones import Inscripcion

    res = client.post("/api/inscripciones/", json={
        "torneo_id": torneo_id,
        "club_equipo_id": equipo_id,
    }, headers={"Authorization": f"Bearer {token_inst}"})
    if res.status_code == 201:
        return res.json()["id"]
    # Ya existe — buscar en DB
    db = TestingSession()
    insc = db.query(Inscripcion).filter(
        Inscripcion.torneo_id == torneo_id,
        Inscripcion.club_equipo_id == equipo_id,
    ).first()
    insc_id = insc.id
    db.close()
    return insc_id


def test_aprobar_inscripcion(client):
    ids = _setup_datos(client)
    login_inst = client.post("/api/auth/login", json={"correo": "inst_insc@test.pe", "contrasena": "Inst1234!"})
    token_inst = login_inst.json()["access_token"]
    insc_id = _crear_inscripcion_pendiente(client, token_inst, ids["torneo_id"], ids["equipo_id"])

    login_admin = client.post("/api/auth/login", json={"correo": "admin_insc@test.pe", "contrasena": "Admin1234!"})
    token_admin = login_admin.json()["access_token"]
    res = client.patch(f"/api/inscripciones/{insc_id}/aprobar",
                       headers={"Authorization": f"Bearer {token_admin}"})
    assert res.status_code == 200
    assert res.json()["estado"] == "aprobado"


def test_rechazar_inscripcion(client):
    """Rechazar inscripción pendiente — usa torneo distinto para evitar duplicado."""
    ids = _setup_datos(client)
    db = TestingSession()
    from app.models.torneos import Torneo
    torn2 = Torneo(nombre="Copa Rechazo 2026", temporada="2026", deporte_id=ids["deporte_id"])
    db.add(torn2)
    db.commit()
    torneo2_id = torn2.id
    db.close()

    login_inst = client.post("/api/auth/login", json={"correo": "inst_insc@test.pe", "contrasena": "Inst1234!"})
    token_inst = login_inst.json()["access_token"]
    insc_res = client.post("/api/inscripciones/", json={
        "torneo_id": torneo2_id,
        "club_equipo_id": ids["equipo_id"],
    }, headers={"Authorization": f"Bearer {token_inst}"})
    assert insc_res.status_code == 201
    insc_id = insc_res.json()["id"]

    login_admin = client.post("/api/auth/login", json={"correo": "admin_insc@test.pe", "contrasena": "Admin1234!"})
    token_admin = login_admin.json()["access_token"]
    res = client.patch(f"/api/inscripciones/{insc_id}/rechazar",
                       headers={"Authorization": f"Bearer {token_admin}"})
    assert res.status_code == 200
    assert res.json()["estado"] == "rechazado"


def test_aprobar_sin_admin(client):
    """Un usuario institucional no puede aprobar inscripciones."""
    ids = _setup_datos(client)
    db = TestingSession()
    from app.models.torneos import Torneo
    torn3 = Torneo(nombre="Copa Sin Admin 2026", temporada="2026", deporte_id=ids["deporte_id"])
    db.add(torn3)
    db.commit()
    torneo3_id = torn3.id
    db.close()

    login_inst = client.post("/api/auth/login", json={"correo": "inst_insc@test.pe", "contrasena": "Inst1234!"})
    token_inst = login_inst.json()["access_token"]
    insc_res = client.post("/api/inscripciones/", json={
        "torneo_id": torneo3_id,
        "club_equipo_id": ids["equipo_id"],
    }, headers={"Authorization": f"Bearer {token_inst}"})
    insc_id = insc_res.json()["id"]

    res = client.patch(f"/api/inscripciones/{insc_id}/aprobar",
                       headers={"Authorization": f"Bearer {token_inst}"})
    assert res.status_code == 403
