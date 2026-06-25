# Olimpiadas PERÚ 2026 — Sistema de Gestión Deportiva

Sistema web para gestionar competencias, inscripciones, fixtures y resultados de las Olimpiadas PERÚ.

---

## ¿Qué necesito instalar?

Solo dos programas:

| Programa | Para qué sirve | Descarga |
|---|---|---|
| **Docker Desktop** | Levanta la base de datos y el backend automáticamente | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **Node.js 18+** | Corre el frontend (la interfaz web) | [nodejs.org](https://nodejs.org/) |

> ✅ No necesitas instalar Python, MySQL ni nada más. Docker lo maneja todo.

---

## Levantar el sistema (paso a paso)

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/Fabricio-RR/SISTEMATICOS.git
cd SISTEMATICOS
```

---

### Paso 2 — Crear el archivo de configuración

Copia el archivo de ejemplo:

```bash
# En Mac / Linux / Git Bash:
cp .env.example .env

# En Windows (CMD):
copy .env.example .env
```

Abre el `.env` que acabas de crear y reemplaza su contenido con esto exactamente:

```env
MYSQL_ROOT_PASSWORD=root_olimpiadas_2026
MYSQL_DATABASE=olimpiadas_peru
MYSQL_USER=olimpiadas_user
MYSQL_PASSWORD=olimpiadas_pass_2026

DATABASE_URL=mysql+pymysql://olimpiadas_user:olimpiadas_pass_2026@db:3306/olimpiadas_peru

SECRET_KEY=cambia_esta_clave_secreta_en_produccion_2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

SMTP_USER=
SMTP_PASSWORD=
```

> El campo `SMTP_USER` y `SMTP_PASSWORD` se dejan vacíos si no vas a usar el envío de correos.

---

### Paso 3 — Levantar la base de datos y el backend

Abre una terminal en la carpeta raíz del proyecto (`SISTEMATICOS/`) y ejecuta:

```bash
docker compose up -d
```

Este comando hace **todo automáticamente** — no hay que crear tablas ni cargar datos a mano:

| Qué hace | Archivo responsable |
|---|---|
| Espera a que MySQL esté listo | `backend/entrypoint.sh` |
| Crea las 15 tablas de la base de datos | `backend/alembic/versions/` (migraciones) |
| Carga el usuario admin y datos de demo | `backend/seed.py` |
| Inicia el servidor de la API | `backend/entrypoint.sh` → `uvicorn` |

> Si la base de datos ya existe (segunda vez en adelante), el seed detecta que los datos ya están y no los duplica.

**Espera unos 30 segundos** la primera vez (descarga las imágenes de Docker). Puedes verificar que todo esté corriendo con:

```bash
docker ps
```

Deberías ver 3 contenedores activos: `olimpiadas_backend`, `olimpiadas_db`, `olimpiadas_phpmyadmin`.

---

### Paso 4 — Levantar el frontend

Abre **otra terminal** (sin cerrar la anterior) en la misma carpeta del proyecto:

```bash
cd frontend
npm install
npm run dev
```

La primera vez `npm install` puede tardar 1-2 minutos descargando paquetes.

---

### Paso 5 — Abrir el sistema en el navegador

| URL | Qué es |
|---|---|
| `http://localhost:3000` | Portal público del aficionado |
| `http://localhost:3000/login` | Inicio de sesión |
| `http://localhost:3000/admin` | Panel de administración |
| `http://localhost:8000/docs` | Documentación de la API (Swagger) |
| `http://localhost:8080` | Base de datos visual (phpMyAdmin) |

**Credenciales del administrador:**

```
Correo:     admin@olimpiadas.pe
Contraseña: Admin1234!
```

---

## Apagar el sistema

```bash
# Detener todo (los datos se conservan)
docker compose down

# La próxima vez, para volver a levantar:
docker compose up -d
# y en otra terminal:
cd frontend && npm run dev
```

> ⚠️ **Nunca uses** `docker compose down -v` — ese comando borra la base de datos y perderás todos los datos.

---

## Solución de problemas comunes

**"Cannot connect to the Docker daemon" o Docker no responde**
→ Abre Docker Desktop y espera a que el ícono de la ballena esté en verde.

**El backend tarda en responder al inicio**
→ Es normal la primera vez. MySQL necesita ~20 segundos en arrancar. Espera y recarga.

**"Port 3000 already in use"**
→ Cierra cualquier otra aplicación que use el puerto 3000 o ejecuta `npm run dev -- -p 3001`.

**"Port 8000 already in use"**
→ Ejecuta `docker compose down` y vuelve a hacer `docker compose up -d`.

**El frontend muestra errores de API**
→ Verifica que el backend esté corriendo: abre `http://localhost:8000/docs` en el navegador. Si no carga, revisa los logs con `docker logs olimpiadas_backend`.

**Ver logs del backend en tiempo real:**
```bash
docker logs olimpiadas_backend -f
```

---

## Correr los tests automatizados

```bash
docker exec olimpiadas_backend python -m pytest tests/ -v
```

Resultado esperado: **41 tests passed**.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | Python 3.11 + FastAPI + SQLAlchemy 2.0 |
| Base de datos | MySQL 8.0 |
| Autenticación | JWT + bcrypt |
| Infraestructura | Docker + Docker Compose |
| Tests | pytest + FastAPI TestClient |

---

## Equipo — SISTEMATICOS

Proyecto universitario UTP — Olimpiadas PERÚ 2026
