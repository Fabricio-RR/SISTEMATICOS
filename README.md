<<<<<<< HEAD
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
=======
# Olimpiadas Perú — Sistema de Gestión Deportiva

Sistema web para la gestión de competencias, inscripciones, fixtures y resultados de las Olimpiadas Perú.
>>>>>>> fabricio

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
<<<<<<< HEAD
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | Python 3.11 + FastAPI + SQLAlchemy 2.0 |
| Base de datos | MySQL 8.0 |
| Autenticación | JWT + bcrypt |
| Infraestructura | Docker + Docker Compose |
| Tests | pytest + FastAPI TestClient |
=======
| Frontend | JavaScript — Next.js 14 + Tailwind CSS |
| Backend | Python — FastAPI |
| Base de datos | MySQL 8.0 |
| ORM | SQLAlchemy + Alembic |
| Autenticación | JWT + bcrypt |
| Infraestructura | Docker + Docker Compose |

---

## Estructura del proyecto

```
SISTEMATICOS/
├── backend/                  # API REST (FastAPI)
│   ├── app/
│   │   ├── models/           # Modelos SQLAlchemy (14 tablas)
│   │   ├── schemas/          # Schemas Pydantic (validación)
│   │   ├── routers/          # Endpoints REST
│   │   └── core/             # JWT, hashing, dependencias
│   ├── alembic/              # Migraciones de base de datos
│   ├── seed.py               # Datos iniciales (admin + deportes)
│   └── requirements.txt
├── frontend/                 # Interfaz web (Next.js)
│   └── app/
│       ├── page.tsx          # Landing - Portal del Aficionado
│       ├── login/            # Inicio de sesión
│       ├── recovery/         # Recuperación de contraseña
│       └── admin/            # Panel administrativo
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Opción A — Con Docker (recomendado, funciona en Windows, Mac y Linux)

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo

### Pasos

**1. Clonar el repositorio**
```bash
git clone https://github.com/Fabricio-RR/SISTEMATICOS.git
cd SISTEMATICOS
```

**2. Crear el archivo de variables de entorno**
```bash
# Copiar el ejemplo
cp .env.example .env
```
> No es necesario cambiar nada para desarrollo local. El `.env` ya tiene valores predeterminados.

**3. Levantar todo con un solo comando**
```bash
docker compose up --build
```

Esto hace automáticamente:
- Levanta MySQL y espera a que esté listo
- Ejecuta las migraciones (crea las tablas)
- Crea el usuario admin inicial
- Inicia el servidor FastAPI

> **Datos de demo (opcional):** para poblar torneos, equipos y partidos de
> prueba, con los contenedores arriba ejecuta:
> ```bash
> docker compose exec backend python seed_demo.py
> ```

**4. Levantar el frontend (en otra terminal)**
```bash
cd frontend
npm install
npm run dev
```

**5. Listo — abrir en el navegador**

| URL | Descripción |
|---|---|
| `http://localhost:3000` | Portal del Aficionado (público) |
| `http://localhost:3000/login` | Inicio de sesión |
| `http://localhost:3000/admin` | Panel administrativo |
| `http://localhost:8000/docs` | Documentación API (Swagger) |
| `http://localhost:8080` | PHPMyAdmin (gestión visual de la BD) |

**Credenciales de acceso iniciales:**
```
Correo:     admin@olimpiadas.pe
Contraseña: Admin1234!
```

---

### Comandos Docker útiles

```bash
# Levantar en segundo plano
docker compose up -d --build

# Ver logs del backend
docker logs olimpiadas_backend -f

# Ver logs de la base de datos
docker logs olimpiadas_db -f

# Detener todo
docker compose down

# Detener y borrar la base de datos (para empezar de cero)
docker compose down -v
```

---

## Opción B — Sin Docker (instalación manual)

Para equipos sin Docker Desktop. Requiere instalar cada componente por separado.

### Requisitos previos
- [Python 3.11+](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org/)
- [MySQL 8.0](https://dev.mysql.com/downloads/installer/) instalado y corriendo

### Paso 1 — Preparar MySQL

Abre MySQL Workbench o la terminal de MySQL y ejecuta:

```sql
CREATE DATABASE olimpiadas_peru CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'olimpiadas_user'@'localhost' IDENTIFIED BY 'olimpiadas_pass_2026';
GRANT ALL PRIVILEGES ON olimpiadas_peru.* TO 'olimpiadas_user'@'localhost';
FLUSH PRIVILEGES;
```

### Paso 2 — Configurar el archivo `backend/.env`

Cuando el backend corre en el host, lee **`backend/.env`** (no el de la raíz):

```bash
cp backend/.env.example backend/.env
```

Ese archivo ya apunta a `localhost`. Solo ajusta usuario/clave/base para que
coincidan con lo que creaste en el Paso 1:

```env
DATABASE_URL=mysql+pymysql://olimpiadas_user:olimpiadas_pass_2026@localhost:3306/olimpiadas_peru
```

### Paso 3 — Instalar y correr el backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# En Windows:
venv\Scripts\activate
# En Mac/Linux:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Crear las tablas en la base de datos
alembic upgrade head

# Crear datos iniciales (admin + deportes)
python seed.py

# (Opcional) Datos de demo: torneos, equipos, jugadores y partidos
python seed_demo.py

# Iniciar el servidor
uvicorn app.main:app --reload --port 8000
```

### Reset de BD (manual)
Para reiniciar completamente la base de datos local:
```bash
cd backend
python reset_db.py --confirm
```

### Paso 4 — Instalar y correr el frontend

```bash
# Abrir una nueva terminal
cd frontend
npm install
npm run dev
```

### Paso 5 — Configurar la URL del API en el frontend

Crea el archivo `frontend/.env.local` con:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Pruebas y regresión

### Backend

```bash
cd backend

# instalar dependencias de desarrollo
venv/bin/pip install -r requirements-dev.txt

# correr la suite de regresión
venv/bin/python -m pytest tests
```

La matriz de escenarios cubiertos está en [DOCS/logic-regression-matrix.md](DOCS/logic-regression-matrix.md).

### Pruebas de rendimiento (carga)

Con el backend corriendo, simular tráfico con [Locust](https://locust.io/):

```bash
cd backend
venv/bin/locust -f tests/performance/locustfile.py --host http://localhost:8000
# Abrir http://localhost:8089 y definir nº de usuarios

# Modo headless con reporte CSV:
venv/bin/locust -f tests/performance/locustfile.py --host http://localhost:8000 \
  --headless -u 50 -r 10 -t 1m --csv reporte_rendimiento
```

---

## Problemas comunes

**`Access denied for user '...'@'...' (using password: YES)`**
El usuario/clave del `DATABASE_URL` no coincide con los del contenedor MySQL.
MySQL solo crea el usuario la **primera vez** que se genera el volumen: si cambiaste
`MYSQL_USER`/`MYSQL_PASSWORD` después, hay que recrearlo:
```bash
docker compose down -v      # borra el volumen (¡borra los datos!)
docker compose up --build   # recrea MySQL con las credenciales del .env
```
Verifica que `MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE` del `.env` de la raíz
coincidan con el usuario/clave/base del `DATABASE_URL`.

**`service "backend" is not running` / `python: not found` al usar `docker compose exec`**
Los contenedores no están arriba, o estás usando el servicio equivocado.
Levántalos con `docker compose up -d` y usa el servicio `backend`
(`docker compose exec backend python seed_demo.py`), no `db`.

**`Path doesn't exist: '...\alembic'` al correr `reset_db.py`**
Ejecuta los scripts desde la carpeta `backend/` con el venv activo.

**El backend se reinicia en bucle / la API no responde, pero `docker compose ps` se ve "normal"**
El contenedor tiene `restart: unless-stopped`: si el arranque falla, se reinicia
en silencio y el error no aparece en la consola de `up`. Revisa el detalle con:
```bash
docker logs olimpiadas_backend -f
```
Causas típicas: credenciales de BD equivocadas (ver el primer punto) o el volumen
del código sin permisos (en Linux con SELinux el mount ya usa `:z`).

---

## Base de datos — tablas

```
instituciones     → colegios, universidades y clubes
usuarios          → cuentas del sistema (admin, institucion, arbitro)
deportes          → catálogo de deportes
club_equipo       → equipos con estadísticas de tabla
atleta_jugador    → jugadores con estadísticas individuales
torneos           → competencias organizadas por deporte
grupos            → grupos dentro de un torneo (fase grupos)
inscripciones     → equipos inscritos en un torneo
sedes             → lugares de competencia
fixture           → jornadas y fases del torneo
partidos          → encuentros programados y resultados
eventos_partido   → goles, tarjetas, eventos por minuto
auditoria         → registro de cambios críticos
noticias          → contenido del portal público
```

---

## Autenticación

El sistema usa **JWT (JSON Web Tokens)**:

- Al hacer login se recibe un token
- El token se envía en cada petición: `Authorization: Bearer <token>`
- Las contraseñas y respuestas de seguridad se almacenan con **bcrypt** (nunca en texto plano)

### Recuperación de contraseña (sin email)

Flujo de 3 preguntas de seguridad:
1. El usuario ingresa su correo → recibe sus 3 preguntas
2. Responde las 3 preguntas correctamente → define nueva contraseña

---

## API — Endpoints principales

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/register` | Registrar usuario |
| GET | `/api/auth/me` | Perfil del usuario autenticado |
| POST | `/api/auth/recovery/questions` | Obtener preguntas de seguridad |
| POST | `/api/auth/recovery/reset` | Cambiar contraseña con respuestas |
| GET | `/api/instituciones/` | Listar instituciones |
| POST | `/api/instituciones/` | Crear institución (admin) |
| GET | `/api/deportes/` | Listar deportes |
| GET | `/api/equipos/` | Listar equipos |
| GET | `/api/torneos/` | Listar torneos |
| GET | `/api/sedes/` | Listar sedes |
| GET | `/api/noticias/` | Noticias publicadas |
| GET | `/api/estadisticas/goleadores?torneo_id=` | Tabla de goleadores |
| GET | `/api/reportes/resumen` | Totales generales (admin) |
| GET | `/api/reportes/participantes-por-institucion` | Reporte de participantes (admin) |

> Documentación interactiva completa: `http://localhost:8000/docs`

---

## Notificaciones por correo (SMTP)

El sistema envía correos en dos eventos (además de la notificación in-app):
- **Inscripción aprobada** → confirmación al correo de la institución.
- **Partido reprogramado** → aviso a las instituciones involucradas.

Se configura por variables de entorno (ver `backend/.env.example`). **Con `EMAIL_ENABLED=false`
(por defecto) los correos se registran en consola en vez de enviarse**, así cualquier integrante
—incluido QE— puede levantar el entorno sin credenciales. Para envío real, completar `SMTP_*`
(p. ej. Mailtrap o Gmail con contraseña de app).
>>>>>>> fabricio

---

## Equipo — SISTEMATICOS

<<<<<<< HEAD
Proyecto universitario UTP — Olimpiadas PERÚ 2026
## Arquitectura Orientada al Servicio- Sección 24230 
=======
Proyecto universitario — Olimpiadas Perú
>>>>>>> fabricio
