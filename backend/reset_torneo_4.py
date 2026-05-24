import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models.torneos import Torneo
from app.models.fixture import Fixture
from app.models.partidos import Partido
from app.models.inscripciones import Inscripcion

db = SessionLocal()
try:
    torneo_id = 4
    
    # 1. Reset state
    torneo = db.query(Torneo).filter(Torneo.id == torneo_id).first()
    if torneo:
        torneo.estado = "en_sorteo"
        print(f"Torneo state set to: {torneo.estado}")
        
    # 2. Re-create fixtures using round robin
    # Let's clean up existing first
    fixture_ids = [f.id for f in db.query(Fixture.id).filter(Fixture.torneo_id == torneo_id).all()]
    if fixture_ids:
        db.query(Partido).filter(Partido.fixture_id.in_(fixture_ids)).delete(synchronize_session=False)
        db.query(Fixture).filter(Fixture.id.in_(fixture_ids)).delete(synchronize_session=False)
    
    inscripciones = db.query(Inscripcion).filter(
        Inscripcion.torneo_id == torneo_id,
        Inscripcion.estado == "aprobado",
    ).all()
    
    from app.routers.fixture import _round_robin
    jornadas = _round_robin([i.id for i in inscripciones])
    
    for num_jornada, pares in enumerate(jornadas, start=1):
        fix = Fixture(
            torneo_id=torneo_id,
            jornada=num_jornada,
            nombre_fase=f"Jornada {num_jornada}",
        )
        db.add(fix)
        db.flush()

        for local_id, visitante_id in pares:
            partido = Partido(
                fixture_id=fix.id,
                inscripcion_local_id=local_id,
                inscripcion_visitante_id=visitante_id,
                ronda=f"Jornada {num_jornada}",
            )
            db.add(partido)

    db.commit()
    print("Torneo 4 successfully reset to 'en_sorteo' with 3 fixtures!")
finally:
    db.close()
