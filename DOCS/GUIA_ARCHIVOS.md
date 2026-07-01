# Guía de archivos — para responder "¿y este archivo qué hace?"

Mapa de los archivos clave del trabajo. Cada uno trae **qué hace** y **qué decir**
si un compañero pregunta. Ordenado de lo más importante a lo de apoyo.

---

## 🔐 Seguridad y autenticación

**`backend/app/routers/auth.py`** — login, register, refresh, logout y recuperación.
- *Qué decir:* "El login tiene rate limit y emite un access token corto + un refresh
  token en cookie HttpOnly. El register está protegido para que solo un admin cree
  usuarios; antes era público y era un hueco de seguridad."

**`backend/app/core/security.py`** — hashing de contraseñas (bcrypt), JWT y refresh tokens.
- *Qué decir:* "Las contraseñas van con bcrypt y los refresh tokens se guardan
  *hasheados* (SHA-256). Si se filtra la BD, el token guardado no sirve para entrar."

**`backend/app/core/deps.py`** — dependencias de autorización (`get_current_user`,
`require_admin`, `require_admin_or_arbitro`).
- *Qué decir:* "Acá está el control de acceso. Cada endpoint declara qué rol necesita;
  no se repite la lógica en cada router."

**`backend/app/core/limiter.py`** — rate limiting (slowapi).
- *Qué decir:* "Limita intentos por IP, p. ej. 10 logins/minuto, para frenar fuerza bruta."

**`backend/app/config.py`** — settings desde `.env` (CORS, expiraciones, SMTP).
- *Qué decir:* "Toda la configuración sensible sale del entorno, nada hardcodeado."

---

## ✅ Validaciones (schemas)

**`backend/app/schemas/usuarios.py`** — reglas del usuario.
- *Qué decir:* "El rol es un `Literal` cerrado (institucion/arbitro/admin), la contraseña
  tiene mínimo 8, y un validador obliga a que un usuario de institución tenga
  `institucion_id` y que admin/árbitro no lo tengan. Antes eran strings libres."

**`backend/app/schemas/deportes.py`** (y el resto de `schemas/`) — mismo patrón:
`Field` con longitudes, validadores de tipo, y modelos `*Out` que controlan qué se expone.

---

## ⚙️ Lógica de negocio (`services/`) — el corazón

> La idea: el router solo recibe la petición; **la regla vive en un servicio** y se
> prueba aparte. Eso mantiene los routers limpios.

**`backend/app/services/enrollment.py`** — reglas de inscripción, equipos y atletas.
- *Qué decir:* "Centraliza el 'se puede o no se puede': el torneo debe estar abierto, el
  equipo aprobado y de tu institución, sin duplicados. Si cambia una regla, se cambia
  en un solo lugar."

**`backend/app/services/competition.py`** — puntajes, resultados y fases eliminatorias.
- *Qué decir:* "Recalcula estadísticas desde los eventos del partido y maneja las
  transiciones del torneo (cuartos, semis, final, walkover). Es la fuente de verdad de
  los puntos."

**`backend/app/services/instituciones.py`** — normalización y detección de duplicados.
- *Qué decir:* "Una misma institución se escribe de mil formas (UTP, U.T.P., Universidad
  Tecnológica…). Esto las reduce a una forma comparable para avisar/bloquear duplicados.
  El frontend nunca recalcula: siempre consulta este servicio."

**`backend/app/core/texto.py`** — `normalizar()` compartida.
- *Qué decir:* "Una sola función de normalización de texto para que instituciones,
  equipos y torneos no reimplementen cada uno la suya y se desincronicen."

**`backend/app/services/email.py`** — correos no bloqueantes.
- *Qué decir:* "Si no hay SMTP configurado, escribe el correo en consola (se puede
  desarrollar sin cuenta real). Y si el envío falla, la operación NO se cae: la
  inscripción se aprueba igual y el error solo queda en el log."

---

## 🔁 Routers / CRUDs representativos

**`backend/app/routers/inscripciones.py`** — flujo completo: crear, aprobar, rechazar,
retirar.
- *Qué decir:* "Cada acción valida con el servicio, registra auditoría y notifica a la
  institución (en pantalla + correo en segundo plano)."

**`backend/app/routers/estadisticas.py`** — tabla de posiciones, goleadores, disciplina.
- *Qué decir:* "Acá está el cuidado de rendimiento: agrego en una sola consulta y uso
  `joinedload` para no caer en N+1 (una consulta por jugador)."

**`backend/app/routers/instituciones.py`** — CRUD + endpoint `/similares`.
- *Qué decir:* "El `/similares` es el que usa el frontend para avisar de posibles
  duplicados antes de guardar."

---

## 🗃️ Datos

**`backend/app/models/inscripciones.py`** — modelo con estadística incremental
(puntos, PJ, PG, goles…).
- *Qué decir:* "Las stats viven en la inscripción y se actualizan al registrar
  resultados; la tabla de posiciones se arma leyendo eso, sin recalcular todo cada vez."

**`backend/alembic/versions/`** — 19 migraciones versionadas.
- *Qué decir:* "Cada cambio de esquema es una migración numerada y reversible; nada se
  toca a mano en la BD."

---

## 🖥️ Frontend

**`frontend/app/providers.tsx`** + **`frontend/lib/api.ts`** — capa de datos.
- *Qué decir:* "Uso TanStack Query: un solo `QueryClient` estable, caché y refetch
  centralizados. `api.ts` concentra todas las llamadas al backend."

**`frontend/components/ui/`** + **`frontend/lib/estilos.ts`** — sistema de diseño.
- *Qué decir:* "Botones, Cards, Tablas, Modales, Badges reutilizables con tokens de
  estilo. No se ponen clases sueltas en cada página; se reutilizan estos componentes."

**`frontend/app/(publico)/`** — portal público (clasificación, calendario, brackets,
resultados, noticias).
- *Qué decir:* "Es la parte que ve cualquiera sin login; usa un route group para
  compartir layout sin ensuciar la URL."

---

## 🧪 Tests

**`backend/tests/services/`** + **`backend/tests/test_auth_refresh.py`** — mi suite.
- *Qué decir:* "Pruebo la lógica de negocio (inscripción, competición, dedup) y el flujo
  de refresh token, no solo los endpoints por encima."

**`backend/tests/test_*.py` (del equipo, adaptados)** — los adapté a la API nueva.
- *Qué decir:* "No los descarté: los puse a correr contra el comportamiento nuevo
  (registro protegido, equipos aprobados, transiciones de estado). La suite pasa entera."

---

### Si te preguntan "¿por dónde empiezo a leer?"
> `services/enrollment.py` y `services/competition.py` → ahí está la lógica del negocio.
> `routers/auth.py` + `core/security.py` → ahí está la seguridad.
> El resto son CRUDs que se apoyan en esos servicios.
