"""
Resetear la base de datos local:
  python reset_db.py --confirm
"""
import os
import sys
import subprocess

from dotenv import load_dotenv
from alembic import command
from alembic.config import Config


def main() -> None:
    if "--confirm" not in sys.argv:
        print("Esto eliminará todos los datos. Ejecuta nuevamente con --confirm.")
        sys.exit(1)

    load_dotenv()
    base_dir = os.path.dirname(os.path.abspath(__file__))
    alembic_cfg = Config(os.path.join(base_dir, "alembic.ini"))

    print("Revirtiendo migraciones...")
    command.downgrade(alembic_cfg, "base")

    print("Aplicando migraciones...")
    command.upgrade(alembic_cfg, "head")

    print("Ejecutando seed inicial...")
    subprocess.check_call([sys.executable, os.path.join(base_dir, "seed.py")])

    print("Reset completado.")


if __name__ == "__main__":
    main()
