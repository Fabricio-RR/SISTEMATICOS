import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models.fixture import Fixture
from app.models.partidos import Partido
from app.models.eventos_partido import EventoPartido
from app.models.notificaciones import Notificacion

db = SessionLocal()
try:
    torneo_id = 2
    fixture_ids = [f.id for f in db.query(Fixture.id).filter(Fixture.torneo_id == torneo_id).all()]
    print(f"Fixture IDs for Torneo 2: {fixture_ids}")
    if fixture_ids:
        partido_ids = [p.id for p in db.query(Partido.id).filter(Partido.fixture_id.in_(fixture_ids)).all()]
        print(f"Partido IDs: {partido_ids}")
        
        try:
            db.begin_nested()
            if partido_ids:
                db.query(EventoPartido).filter(EventoPartido.partido_id.in_(partido_ids)).delete(synchronize_session=False)
                db.query(Notificacion).filter(Notificacion.partido_id.in_(partido_ids)).delete(synchronize_session=False)
                db.query(Partido).filter(Partido.id.in_(partido_ids)).delete(synchronize_session=False)
            db.query(Fixture).filter(Fixture.id.in_(fixture_ids)).delete(synchronize_session=False)
            print("Rollback delete test for Torneo 2 passed!")
        except Exception as ex:
            print(f"Rollback delete test for Torneo 2 failed: {type(ex).__name__} - {ex}")
finally:
    db.close()
