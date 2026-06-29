import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models.fixture import Fixture
from app.models.partidos import Partido
from app.models.inscripciones import Inscripcion
from app.models.eventos_partido import EventoPartido
from app.models.notificaciones import Notificacion

db = SessionLocal()
try:
    torneo_id = 4
    fixture_ids = [f.id for f in db.query(Fixture.id).filter(Fixture.torneo_id == torneo_id).all()]
    print(f"Fixture IDs for Torneo 4: {fixture_ids}")
    if fixture_ids:
        partido_ids = [p.id for p in db.query(Partido.id).filter(Partido.fixture_id.in_(fixture_ids)).all()]
        print(f"Partido IDs: {partido_ids}")
        
        # Test if queries work or if they throw constraint errors
        try:
            eventos = db.query(EventoPartido).filter(EventoPartido.partido_id.in_(partido_ids)).all()
            print(f"EventoPartido count: {len(eventos)}")
            notifs = db.query(Notificacion).filter(Notificacion.partido_id.in_(partido_ids)).all()
            print(f"Notificacion count: {len(notifs)}")
            partidos = db.query(Partido).filter(Partido.id.in_(partido_ids)).all()
            print(f"Partido count: {len(partidos)}")
            fixtures = db.query(Fixture).filter(Fixture.id.in_(fixture_ids)).all()
            print(f"Fixture count: {len(fixtures)}")
            
            # Let's run a test rollback delete
            db.begin_nested()
            if partido_ids:
                db.query(EventoPartido).filter(EventoPartido.partido_id.in_(partido_ids)).delete(synchronize_session=False)
                db.query(Notificacion).filter(Notificacion.partido_id.in_(partido_ids)).delete(synchronize_session=False)
                db.query(Partido).filter(Partido.id.in_(partido_ids)).delete(synchronize_session=False)
            db.query(Fixture).filter(Fixture.id.in_(fixture_ids)).delete(synchronize_session=False)
            
            db.query(Inscripcion).filter(Inscripcion.torneo_id == torneo_id).update({
                Inscripcion.puntos: 0,
                Inscripcion.partidos_jugados: 0,
                Inscripcion.partidos_ganados: 0,
                Inscripcion.partidos_empatados: 0,
                Inscripcion.partidos_perdidos: 0,
                Inscripcion.goles_a_favor: 0,
                Inscripcion.goles_en_contra: 0,
            }, synchronize_session=False)
            print("Rollback delete test passed!")
        except Exception as ex:
            print(f"Rollback delete test failed: {type(ex).__name__} - {ex}")
finally:
    db.close()
