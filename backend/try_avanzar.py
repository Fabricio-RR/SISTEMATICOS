import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models.torneos import Torneo
from app.services.competition import assert_transition_allowed

db = SessionLocal()
try:
    torneo = db.query(Torneo).filter(Torneo.id == 4).first()
    print(f"Torneo: {torneo.nombre}, estado: {torneo.estado}")
    try:
        assert_transition_allowed(torneo, "en_curso", db)
        print("assert_transition_allowed passed!")
    except Exception as ex:
        print(f"assert_transition_allowed failed: {type(ex).__name__} - {ex}")
finally:
    db.close()
