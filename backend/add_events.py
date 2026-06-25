import sys, os
sys.path.insert(0, '/app')
os.chdir('/app')

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models.eventos_partido import EventoPartido
from sqlalchemy import func

db = SessionLocal()

# Remove the orphan test event we just added (id=4 for partido 2 min 12)
# Keep only original 3 (ids 1-3), delete 4 if it exists
db.query(EventoPartido).filter(EventoPartido.id >= 4).delete()
db.commit()

def ev(pid, atleta_id, tipo, minuto, desc=None):
    return EventoPartido(partido_id=pid, atleta_jugador_id=atleta_id,
                         tipo_evento=tipo, minuto=minuto, descripcion=desc)

eventos = [
    # P2 (0-3) Los Vikingos vs Los Sammarquinos — 3 goles visitante
    ev(2, 42, "gol", 12),
    ev(2, 41, "gol", 37),
    ev(2, None, "falta", 45, "Falta fuerte"),
    ev(2, 43, "gol", 68),
    ev(2, 30, "tarjeta_amarilla", 72, "Protesta"),

    # P3 (1-1) Los Académicos vs Los Norteños
    ev(3, 56, "gol", 25),
    ev(3, None, "falta", 38),
    ev(3, 68, "gol", 55),
    ev(3, 57, "tarjeta_amarilla", 80, "Entrada fuerte"),

    # P4 (1-0) Los Leones vs Los Vikingos
    ev(4, 16, "gol", 44),
    ev(4, 30, "falta", 60),
    ev(4, 31, "tarjeta_amarilla", 75, "Reclamo"),
    ev(4, 17, "falta", 82),

    # P5 (2-2) Los Sammarquinos vs Los Académicos
    ev(5, 41, "gol", 10),
    ev(5, 55, "gol", 28),
    ev(5, 56, "falta", 35),
    ev(5, 43, "gol", 60),
    ev(5, 57, "tarjeta_amarilla", 70),
    ev(5, 55, "gol", 85),

    # P6 (0-2) Los Norteños vs Los Aguilas — 2 goles visitante
    ev(6, 3,  "gol", 20),
    ev(6, 68, "tarjeta_amarilla", 33, "Entrada fuerte"),
    ev(6, 5,  "gol", 75),

    # P10 (68-55) Aguilas Basket vs Leones Basket
    ev(10, 79, "enceste", 5),
    ev(10, 80, "enceste", 15),
    ev(10, 87, "enceste", 22),
    ev(10, 81, "enceste", 30),
    ev(10, 86, "falta", 35, "Falta personal"),
    ev(10, 79, "enceste", 38),

    # P11 (72-61) Sammarquinos Basket vs Norteños Basket
    ev(11, 92, "enceste", 8),
    ev(11, 100, "enceste", 18),
    ev(11, 93, "enceste", 25),
    ev(11, 99, "falta", 30),
    ev(11, 94, "enceste", 40),

    # P14 (3-1) Aguilas Voley vs Vikingos Voley
    ev(14, 105, "punto", None, "Set 1 - punto decisivo"),
    ev(14, 113, "punto", None, "Set 2"),
    ev(14, 106, "punto", None, "Set 3"),
    ev(14, 107, "punto", None, "Set 4 - campeonato"),
]

db.add_all(eventos)
db.commit()

total = db.query(func.count(EventoPartido.id)).scalar()
print(f"OK - Total eventos en DB: {total}")
for pid in [2, 3, 4, 5, 6, 10, 11, 14]:
    cnt = db.query(func.count(EventoPartido.id)).filter(EventoPartido.partido_id == pid).scalar()
    print(f"  Partido {pid}: {cnt} eventos")
db.close()
