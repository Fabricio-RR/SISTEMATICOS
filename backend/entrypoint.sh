#!/bin/bash

echo "Esperando conexion con MySQL..."
python -c "
import time, pymysql, os
for i in range(30):
    try:
        conn = pymysql.connect(
            host='db', port=3306,
            user=os.getenv('MYSQL_USER'),
            password=os.getenv('MYSQL_PASSWORD'),
            database=os.getenv('MYSQL_DATABASE')
        )
        conn.close()
        print('MySQL listo.')
        break
    except Exception as e:
        print(f'Intento {i+1}/30 - esperando... ({e})')
        time.sleep(2)
else:
    print('No se pudo conectar a MySQL')
    exit(1)
"

echo "Ejecutando migraciones Alembic..."
alembic upgrade head

echo "Ejecutando seed inicial..."
python seed.py || echo "Seed omitido (posiblemente ya ejecutado)"

echo "Iniciando servidor FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload