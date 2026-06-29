import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models.torneos import Torneo
from app.models.fixture import Fixture
from app.models.inscripciones import Inscripcion

db = SessionLocal()
try:
    torneos = db.query(Torneo).all()
    print("=== TORNEOS ===")
    for t in torneos:
        aprobadas = db.query(Inscripcion).filter(
            Inscripcion.torneo_id == t.id,
            Inscripcion.estado == "aprobado"
        ).count()
        fixtures = db.query(Fixture).filter(Fixture.torneo_id == t.id).count()
        print(f"ID: {t.id} | Nombre: {t.nombre} | Formato: {t.formato} | Estado: {t.estado} | Insc. Aprobadas: {aprobadas} | Fixtures: {fixtures}")
finally:
    db.close()
