"""
Ejecutar una vez después de las migraciones para crear el usuario admin inicial.
Uso (dentro del contenedor o con venv activo): python seed.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models.usuarios import Usuario
from app.models.deportes import Deporte
from app.core.security import hash_password

db = SessionLocal()

ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@olimpiadas.pe")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD")
if not ADMIN_PASSWORD:
    print("ADVERTENCIA: SEED_ADMIN_PASSWORD no configurado. Cambia la contraseña tras el primer login.")
    ADMIN_PASSWORD = "Admin1234!"

ADMIN_Q1 = os.getenv("SEED_ADMIN_Q1", "¿Cuál es el nombre de tu primera mascota?")
ADMIN_R1 = os.getenv("SEED_ADMIN_R1", "admin")
ADMIN_Q2 = os.getenv("SEED_ADMIN_Q2", "¿En qué ciudad naciste?")
ADMIN_R2 = os.getenv("SEED_ADMIN_R2", "lima")
ADMIN_Q3 = os.getenv("SEED_ADMIN_Q3", "¿Cuál es el nombre de tu colegio?")
ADMIN_R3 = os.getenv("SEED_ADMIN_R3", "olimpiadas")

try:
    if db.query(Usuario).filter(Usuario.correo == ADMIN_EMAIL).first():
        print("El admin ya existe, omitiendo seed.")
        sys.exit(0)

    admin = Usuario(
        nombres="Admin",
        apellidos="Sistema",
        correo=ADMIN_EMAIL,
        contrasena_hash=hash_password(ADMIN_PASSWORD),
        rol="admin",
        esta_activo=True,
        pregunta_seguridad_1=ADMIN_Q1,
        respuesta_seguridad_1=hash_password(ADMIN_R1.lower().strip()),
        pregunta_seguridad_2=ADMIN_Q2,
        respuesta_seguridad_2=hash_password(ADMIN_R2.lower().strip()),
        pregunta_seguridad_3=ADMIN_Q3,
        respuesta_seguridad_3=hash_password(ADMIN_R3.lower().strip()),
    )
    db.add(admin)

    deportes_iniciales = [
        Deporte(nombre="Fútbol Varones", tipo_competidor="equipo"),
        Deporte(nombre="Fútbol Damas", tipo_competidor="equipo"),
        Deporte(nombre="Básquet Varones", tipo_competidor="equipo"),
        Deporte(nombre="Básquet Damas", tipo_competidor="equipo"),
        Deporte(nombre="Vóley Mixto", tipo_competidor="equipo"),
        Deporte(nombre="Atletismo 100m", tipo_competidor="individual"),
    ]
    for d in deportes_iniciales:
        db.add(d)

    db.commit()
    print("Seed completado:")
    print(f"  Admin: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
    print(f"  Deportes creados: {len(deportes_iniciales)}")

except Exception as e:
    db.rollback()
    print(f"Error en seed: {e}")
    sys.exit(1)
finally:
    db.close()