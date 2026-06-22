# Olimpiadas Perú — Sistema de Gestión Deportiva

Sistema web para la gestión de competencias, inscripciones, fixtures y resultados de las Olimpiadas Perú.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
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
- Ejecuta las migraciones (crea las 14 tablas)
- Crea el usuario admin inicial
- Inicia el servidor FastAPI

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

### Paso 2 — Configurar el archivo `.env`

```bash
cp .env.example .env
```

Edita `.env` y cambia la línea `DATABASE_URL` para apuntar a `localhost` en vez de `db`:

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

## Base de datos — 14 tablas

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

---

## Equipo — SISTEMATICOS

Proyecto universitario — Olimpiadas Perú
