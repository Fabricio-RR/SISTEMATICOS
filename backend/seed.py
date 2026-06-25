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

try:
    if db.query(Usuario).filter(Usuario.correo == "admin@olimpiadas.pe").first():
        print("El admin ya existe, omitiendo seed.")
        sys.exit(0)

    admin = Usuario(
        nombres="Admin",
        apellidos="Sistema",
        correo="admin@olimpiadas.pe",
        contrasena_hash=hash_password("Admin1234!"),
        rol="admin",
        esta_activo=True,
        pregunta_seguridad_1="¿Cuál es el nombre de tu primera mascota?",
        respuesta_seguridad_1=hash_password("admin"),
        pregunta_seguridad_2="¿En qué ciudad naciste?",
        respuesta_seguridad_2=hash_password("lima"),
        pregunta_seguridad_3="¿Cuál es el nombre de tu colegio?",
        respuesta_seguridad_3=hash_password("olimpiadas"),
    )
    db.add(admin)

    # Deportes obligatorios con límites de jugadores
    # Fútbol: 11 titulares + 7 suplentes
    # Básquet: 5 titulares + 7 suplentes
    # Vóley: 6 titulares + 6 suplentes (más libero)
    # Ping Pong: 2 jugadores, mixto (pareja)
    # Atletismo individual: 1 participante + hasta 2 alternos
    deportes_iniciales = [
        Deporte(nombre="Fútbol Varones",  tipo_competidor="equipo",     min_jugadores=11, max_jugadores=18, esta_activo=True),
        Deporte(nombre="Básquet Varones", tipo_competidor="equipo",     min_jugadores=5,  max_jugadores=12, esta_activo=True),
        Deporte(nombre="Vóley Damas",     tipo_competidor="equipo",     min_jugadores=6,  max_jugadores=12, esta_activo=True),
        Deporte(nombre="Ping Pong Mixto", tipo_competidor="equipo",     min_jugadores=2,  max_jugadores=4,  esta_activo=True),
        Deporte(nombre="Fútbol Damas",    tipo_competidor="equipo",     min_jugadores=11, max_jugadores=18, esta_activo=True),
        Deporte(nombre="Básquet Damas",   tipo_competidor="equipo",     min_jugadores=5,  max_jugadores=12, esta_activo=True),
        Deporte(nombre="Atletismo 100m",  tipo_competidor="individual", min_jugadores=1,  max_jugadores=3,  esta_activo=True),
    ]
    for d in deportes_iniciales:
        db.add(d)

    db.commit()
    print("Seed completado:")
    print("  Admin: admin@olimpiadas.pe / Admin1234!")
    print("  Preguntas de seguridad: respuestas = admin / lima / olimpiadas")
    print(f"  Deportes creados: {len(deportes_iniciales)}")

except Exception as e:
    db.rollback()
    print(f"Error en seed: {e}")
    sys.exit(1)
finally:
    db.close()
