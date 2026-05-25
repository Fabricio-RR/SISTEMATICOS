# Registro de Revisión — 22 de mayo 2026
**Autor:** Orlando  
**Fecha:** 22/05/2026  
**Rama:** orlando  

Revisión completa de lógica del proyecto (backend FastAPI + frontend Next.js).  
Se identificaron 11 problemas y se validaron los aspectos correctos del sistema.  
Se realizó además un mapeo de los 12 Requisitos Funcionales del profesor contra la implementación actual.

---

## ✅ Lo que está bien

### Backend — Arquitectura general
- [x] Estructura FastAPI correctamente modularizada (routers, models, schemas, core)
- [x] CORS configurado con `allow_credentials=True` y orígenes desde config
- [x] Rate limiting en endpoints críticos (`/login`, `/recovery`)
- [x] Middleware de rate limit con handler de errores registrado
- [x] Uso consistente de `Depends()` para inyección de dependencias
- [x] Separación clara de roles: `require_admin`, `require_admin_or_arbitro`, `get_current_user`

### Backend — Autenticación
- [x] Contraseñas y respuestas de seguridad hasheadas con `bcrypt`
- [x] JWT implementado correctamente (encode/decode)
- [x] Login bloquea usuarios inactivos con 403
- [x] Flujo de solicitud de acceso (registro público → aprobación admin) bien diseñado
- [x] Recuperación de contraseña con 3 preguntas de seguridad funcional

### Backend — Modelos
- [x] Relaciones SQLAlchemy bien declaradas con `back_populates`
- [x] `cascade="all, delete-orphan"` en `Torneo → Grupo` y `Torneo → Fixture`
- [x] FKs nullable correctamente marcadas (`nullable=True`)
- [x] `Inscripcion` con dos relaciones hacia `Partido` (local/visitante) bien diferenciadas por `foreign_keys`

### Backend — Fixture / Sorteo
- [x] Algoritmo `_round_robin` correcto (rotación estándar con pin fijo en posición 0)
- [x] Guard de regeneración con `force=true`
- [x] Eliminación en cascada de partidos antes de borrar fixtures

### Backend — Estadísticas
- [x] `_actualizar_tabla` actualiza puntos, ganados, perdidos, jugados al finalizar partido
- [x] La tabla de posiciones ordena por puntos → ganados → perdidos
- [x] Guard que impide finalizar el mismo partido dos veces (409 Conflict)
- [x] Auditoría registrada al finalizar partido

### Frontend — API layer
- [x] Timeout de 8 segundos con `AbortController`
- [x] Mensaje de error claro cuando el servidor no responde
- [x] Token Bearer incluido automáticamente en cada request
- [x] `204 No Content` manejado correctamente (retorna `undefined`)

---

## ❌ Problemas encontrados

### 🔴 Prioridad Alta

- [x] **`_actualizar_tabla` puede fallar con resultados `None`**  
  Archivo: `backend/app/routers/partidos.py` línea 130  
  **Corregido 22/05/2026** — Se agregó guard al inicio de `_actualizar_tabla`:
  ```python
  if partido.resultado_local is None or partido.resultado_visitante is None:
      return
  ```

- [x] **Doble conteo de puntos si un partido se re-finaliza**  
  Archivo: `backend/app/routers/partidos.py` línea 86 y 115  
  **Corregido 22/05/2026** — Se bloqueó la reversión de estado en `PATCH /{id}`:
  ```python
  if p.estado == "finalizado" and data.estado is not None and data.estado != "finalizado":
      raise HTTPException(status_code=409, detail="No se puede revertir el estado de un partido finalizado...")
  ```

- [x] **Atletas editables por cualquier usuario autenticado**  
  Archivo: `backend/app/routers/atleta_jugador.py` líneas 38 y 50  
  **Corregido 22/05/2026** — Se agregó validación de institución en `update` y `delete`:
  ```python
  if current_user.rol != "admin":
      if not atleta.club_equipo or atleta.club_equipo.institucion_id != current_user.institucion_id:
          raise HTTPException(status_code=403, detail="Solo puedes editar/eliminar atletas de tu institución")
  ```

### 🟡 Prioridad Media

- [x] **Tabla de posiciones en Resultados mezcla todos los torneos**  
  Archivo: `frontend/app/admin/resultados/page.tsx` línea 66  
  **Corregido 22/05/2026** — Reemplazado `api.getEquipos()` por `api.getTabla(torneoId)`. La tabla lateral ahora muestra posiciones filtradas por el torneo seleccionado. Si no hay torneo seleccionado, muestra "Selecciona un torneo".

- [x] **Puntos en `ClubEquipo` son globales, no por torneo**  
  Archivo: `backend/app/models/club_equipo.py` líneas 18–21  
  **Corregido 22/05/2026** — Las estadísticas se movieron a `Inscripcion` (una fila por equipo por torneo). Se creó migración `0003_stats_en_inscripciones.py` con columnas `puntos`, `partidos_jugados`, `partidos_ganados`, `partidos_empatados`, `partidos_perdidos`. Se actualizaron `_actualizar_tabla` y `estadisticas.py` para leer/escribir en `Inscripcion`. Bonus: se corrigió el conteo de empates (antes no se incrementaba `partidos_empatados`).

- [x] **`ResultadoUpdate` con `estado != "finalizado"` no actualiza la tabla pero sí guarda scores**  
  Archivo: `backend/app/routers/partidos.py` línea 102  
  **Corregido 22/05/2026** — Se eliminó el campo `estado` de `ResultadoUpdate` (backend y frontend). El endpoint `set_resultado` ahora siempre fija `estado = "finalizado"` y siempre llama a `_actualizar_tabla`. No hay ambigüedad posible.

### 🟠 Prioridad Baja

- [x] **Contador de partidos por jornada en Sorteos es estimado, no real**  
  Archivo: `frontend/app/admin/sorteos/page.tsx` línea 56  
  **Corregido 22/05/2026** — Se carga `api.getPartidos({ torneo_id })` junto con fixtures e inscripciones. Se construye un mapa `fixture_id → cantidad` real y cada jornada muestra el número exacto de partidos generados por el backend.

- [x] **`nombre_corto` de institución puede duplicarse**  
  Archivo: `backend/app/routers/auth.py` línea 87  
  **Corregido 22/05/2026** — Se genera `nombre_corto` único con bucle: si ya existe en la DB, se añade sufijo numérico (`UNIVER` → `UNIVE1` → `UNIVE2` ...) hasta encontrar uno libre.

- [x] **`GET /usuarios` devuelve todos sin paginación**  
  Archivo: `backend/app/routers/usuarios.py` línea 14  
  **Corregido 22/05/2026** — Se añadieron parámetros `skip: int = 0, limit: int = 100`. El frontend no requiere cambios gracias a los valores por defecto.

- [x] **`aprobarEquipo` usa `PUT` completo para enviar solo un campo**  
  Archivo: `frontend/lib/api.ts` línea 128 / `backend/app/routers/club_equipo.py`  
  **Corregido 22/05/2026** — Se añadió endpoint dedicado `PATCH /{id}/aprobar` en el backend. El frontend ahora llama `PATCH /api/equipos/{id}/aprobar` sin cuerpo.

- [x] **`partidos_empatados` se calcula de forma derivada (puede ocultar bugs)**  
  Archivo: `backend/app/routers/estadisticas.py` línea 37  
  **Resuelto como parte del fix #5** — `partidos_empatados` es ahora columna real en `Inscripcion`, se incrementa explícitamente en `_actualizar_tabla`, y se lee directamente en `estadisticas.py`.

---

## Resumen por prioridad

| Prioridad | # | Problema |
|---|---|---|
| ✅ Resuelto | 1 | `_actualizar_tabla` falla con resultados `None` |
| ✅ Resuelto | 2 | Doble conteo de puntos si se re-finaliza un partido |
| ✅ Resuelto | 3 | Atletas editables por cualquier usuario autenticado |
| ✅ Resuelto | 4 | Tabla de posiciones en Resultados mezcla todos los torneos |
| ✅ Resuelto | 5 | Puntos en `ClubEquipo` son globales, no por torneo |
| ✅ Resuelto | 6 | `estado != "finalizado"` en ResultadoUpdate no actualiza tabla |
| ✅ Resuelto | 7 | Contador de partidos por jornada es estimado, no real |
| ✅ Resuelto | 8 | `nombre_corto` puede duplicarse entre instituciones |
| ✅ Resuelto | 9 | `GET /usuarios` sin paginación |
| ✅ Resuelto | 10 | `aprobarEquipo` usa `PUT` en lugar de `PATCH` |
| ✅ Resuelto | 11 | `partidos_empatados` derivado puede ocultar inconsistencias |

---

## Análisis de Requisitos Funcionales (RF) del profesor

Contexto: el proyecto está enmarcado en **Olimpiadas PERU**, plataforma para que instituciones educativas gestionen sus olimpiadas internas. Los 4 deportes obligatorios son Fútbol Varones, Básquet Varones, Vóley Damas y Ping Pong Mixto.

### ✅ RF implementados completamente

- [x] **RF04** — Registro de equipos por deporte y participantes con nombre/DNI  
  Cubierto por `ClubEquipo` (institucion_id, deporte_id, nombre_equipo) y `AtletaJugador` (nombre_completo, documento_identidad).

- [x] **RF05** — Sorteo aleatorio para generar series por deporte  
  Cubierto por el algoritmo `_round_robin` en `backend/app/routers/fixture.py`. Genera todas las jornadas de forma aleatoria con pin fijo.

- [x] **RF07** — Registro de resultados por administrador (marcador, goles, puntos)  
  Cubierto por `PATCH /partidos/{id}/resultado` (acceso admin/árbitro). Actualiza tabla automáticamente.

### ⚠️ RF parcialmente implementados

- [x] **RF01** — Registro de instituciones con nombre, **contacto** y **categoría** (año escolar/grado)  
  **Implementado 22/05/2026** — Campos `contacto`, `categoria` y `pais_representativo` agregados al modelo `Institucion` (migración `0004`). El formulario `/solicitar` y el panel admin reciben y muestran los nuevos campos. La tabla de instituciones muestra categoría, país y contacto.

- [x] **RF03** — Gestionar los 4 deportes obligatorios + deportes adicionales  
  **Implementado 22/05/2026** — Campo `es_obligatorio` agregado al modelo `Deporte` (migración `0006`). La migración siembra automáticamente los 4 deportes obligatorios: Fútbol Varones, Básquet Varones, Vóley Damas y Ping Pong Mixto (todos tipo `equipo`). El backend bloquea la eliminación de deportes obligatorios con 409. El frontend muestra badge "Obligatorio" (ámbar con ícono `ShieldCheck`) vs "Adicional" (gris) y oculta el botón de eliminar para los deportes obligatorios.

- [x] **RF06** — Programar partidos con fecha, hora y ubicación; mostrar fixture completo por deporte  
  **Implementado 22/05/2026** — `PartidoOut` ahora incluye `sede_nombre` (poblado desde `p.sede.nombre_sede`). `GET /partidos/` acepta filtro `deporte_id` (join Fixture → Torneo → Deporte). Frontend: la página de Encuentros carga deportes y expone dos filtros encadenados (deporte → torneo); el dropdown de torneos se filtra automáticamente por el deporte seleccionado. Columna "Sede" con ícono `MapPin` agregada a la tabla. Modal de edición renombrado a "Programar partido" y muestra sede con ciudad. La página de Sorteos cambia el texto "Ver detalle en Encuentros" por un `<Link>` con `?torneo_id=X`. La página de Encuentros lee `torneo_id` del query param inicial via `useSearchParams`.

- [x] **RF08** — Tabla de posiciones, puntos acumulados y estadísticas individuales por deporte  
  **Implementado 22/05/2026** — Campo `puntos_anotados: int` agregado a `AtletaJugador` (migración `0007`). `AtletaUpdate` ahora acepta `goles_anotados`, `puntos_anotados`, `tarjetas_amarillas`, `tarjetas_rojas`. El endpoint `GET /estadisticas/goleadores` detecta el deporte del torneo: si es fútbol usa `goles_anotados` (etiqueta "Goles"), si no usa `puntos_anotados` (etiqueta "Puntos"). `Goleador` schema incluye campo `etiqueta: str`. Frontend: panel lateral "Goleadores"/"Anotadores" cambia título y etiqueta dinámicamente según `g.etiqueta`. Creada página `/admin/atletas` con listado agrupado por equipo (acordeón), edición inline de stats (columna correcta según deporte: Goles para fútbol, Puntos para otros + tarjetas sólo en fútbol), botón guardar por fila, crear/eliminar atletas. Página agregada al nav del layout admin con ícono `PersonStanding`.

- [x] **RF10** — Gestionar estado del torneo restringiendo acciones según estado  
  **Implementado 22/05/2026** — Migración `0005` migra datos existentes (`activo` → `inscripcion_abierta`). Flujo lineal implementado:  
  `inscripcion_abierta` → `inscripcion_cerrada` → `en_sorteo` → `en_curso` → `finalizado`  
  Restricciones aplicadas: inscripciones solo en `inscripcion_abierta`, fixture solo en `en_sorteo`, resultados solo en `en_curso`. Endpoints nuevos: `PATCH /torneos/{id}/avanzar` y `PATCH /torneos/{id}/suspender`. Delete bloqueado en `en_curso`/`finalizado`. Frontend muestra el flujo visual, botón de avance por estado y botón de suspender.

### ❌ RF no implementados

- [x] **RF02** — Asignación automática de país representativo por categoría  
  **Implementado 22/05/2026** — Creado `backend/app/core/categorias.py` con el mapeo completo:  
  Primer año → Brasil · Segundo año → Argentina · Tercer año → Alemania · Cuarto año → España · Quinto año → Francia.  
  El `pais_representativo` se asigna automáticamente en `solicitar_acceso` y en `POST /instituciones`. El frontend muestra el país en tiempo real al seleccionar la categoría.

- [x] **RF09** — Avance por fases (cuartos de final, semifinales, final) basado en resultados  
  **Implementado 23/05/2026** — Dos nuevos endpoints en `fixture.py`:  
  `POST /fixture/fase-eliminatoria` — toma los top N equipos (2, 4 u 8) de la tabla de posiciones del torneo (ordenados por puntos → ganados → perdidos) y genera un `Fixture` con `nombre_fase = "Final"/"Semifinales"/"Cuartos de Final"` + N/2 partidos con seeding estándar (1 vs N, 2 vs N-1). Valida que el torneo esté `en_curso` y haya suficientes equipos aprobados.  
  `POST /fixture/siguiente-fase` — recibe el `fixture_id` de la fase actual, valida que todos sus partidos estén finalizados, extrae los ganadores (empate técnico → local avanza), genera el siguiente `Fixture` ("Cuartos de Final" → "Semifinales" → "Final") con los ganadores apareados 1 vs N. Bloquea el avance desde la Final.  
  Nuevos schemas `FaseEliminatoriaRequest` y `SiguienteFaseRequest` en `fixture.py`. Helpers `_nombre_fase_elim` y `_siguiente_nombre_fase`.  
  Frontend: `lib/api.ts` tiene `generarFaseEliminatoria` y `generarSiguienteFase`. La página de Sorteos clasifica fixtures en "Fase de Liga" (Jornada N) y "Fase Eliminatoria" (Cuartos/Semifinales/Final). Panel izquierdo: selector de clasificados (2/4/8) + botón "Generar fase eliminatoria" (aparece cuando hay liga sin fase elim); botón "Generar siguiente fase" (aparece cuando la fase actual está completa y no es Final); mensaje de torneo completo cuando la Final termina. Panel derecho: fixtures de liga en sección propia, fixtures eliminatorios en sección púrpura con contador de finalizados/total por fase.

- [x] **RF11** — Reprogramación de partidos con registro del motivo y notificación a instituciones  
  **Implementado 22/05/2026** — Migración `0008` agrega `motivo_reprogramacion` (String 500) y `reprogramado_en` (DateTime) a `partidos`, y crea tabla `notificaciones` (id, institucion_id, partido_id, titulo, contenido, leida, creada_en). Modelo `Notificacion` + schema `NotificacionOut` creados. Router `/api/notificaciones/` con `GET /` (mis notificaciones), `PATCH /{id}/leer`, `PATCH /leer-todas`, `DELETE /{id}`. `PartidoUpdate` acepta `motivo_reprogramacion`. En `PATCH /partidos/{id}`: si `fecha_hora` cambia Y hay motivo, se marca `reprogramado_en=now()` y se crean notificaciones para ambas instituciones participantes. Frontend: `Partido` tiene `motivo_reprogramacion` y `reprogramado_en`; columna "Reprog." con badge ámbar en tabla de Encuentros; campo textarea de motivo aparece dinámicamente en el modal cuando la fecha cambia (con aviso de notificación automática); layout institucional: campana con badge de no leídas, dropdown con lista de notificaciones, marcar leída individualmente o todas, eliminar.

- [x] **RF12** — Retiro o inasistencia de equipos con ajuste automático del fixture  
  **Implementado 22/05/2026** — Migración `0009` agrega `es_walkover` (Boolean) a `partidos`. `Inscripcion.estado` acepta nuevo valor `"retirado"`. Nuevo endpoint `PATCH /inscripciones/{id}/retirar`: valida que la inscripción esté aprobada, la marca como `retirado`, encuentra todos los partidos pendientes (no finalizados) y aplica W.O. en cada uno (equipo retirado pierde 0-3, rival gana 3-0 con 3 puntos; stats de PJ/PG/PP actualizadas en ambas inscripciones). Se crean notificaciones para la institución rival avisando la victoria por W.O. Se registra auditoría. Frontend: `EstadoInscripcion` incluye `"retirado"`; `Partido` tiene `es_walkover: boolean`; página Inscripciones tiene tab y contador "Retirado", badge gris para equipos retirados, y botón naranja `LogOut` (con confirmación) para retirar inscripciones aprobadas. Página Encuentros muestra columna "W.O." con badge "W.O." en partidos resueltos por retiro.

### Resumen de brecha

| Estado | Cantidad | RFs |
|---|---|---|
| ✅ Implementado | 12 | RF01, RF02, RF03, RF04, RF05, RF06, RF07, RF08, RF09, RF10, RF11, RF12 |
| ❌ Pendiente | 0 | — |

### Orden de implementación sugerido

1. **RF01 + RF02** — Agregar `categoria` y `pais_representativo` a `Institucion` (una migración, lógica simple de mapeo)
2. **RF10** — Corregir estados del torneo y agregar restricciones de acceso por estado (cambia el flujo completo del sistema)
3. **RF03** — Seed de los 4 deportes obligatorios + flag `es_obligatorio`
4. **RF09** — Avance por fases eliminatorias (el más complejo, requiere RF10 finalizado)
5. **RF11** — Reprogramación con motivo registrado
6. **RF12** — Retiro/inasistencia con ajuste de fixture

---

## Revisión 2 — 23/05/2026

Revisión profunda de lógica, seguridad y rendimiento sobre la base implementada.  
Se encontraron y corrigieron **11 bugs adicionales** (Ronda 1).  
Revalidación posterior contra el código actual: los **12 fixes** planificados para la Ronda 2 ya están implementados.  
Los últimos 3 pendientes del frontend se cerraron en la continuación de la sesión del **23/05/2026**.

---

### ✅ Bugs corregidos — Ronda 1 (implementados)

- [x] **`TorneoCreate` exponía campo `estado`** — cliente podía crear torneo en estado `"finalizado"` directamente  
  Archivo: `backend/app/schemas/torneos.py`  
  Fix: Se separó `TorneoCreate` (sin `estado`) de `TorneoOut` (con `estado`). El estado siempre inicia como `inscripcion_abierta`.

- [x] **`rechazar` inscripción sin validación de estado previo** — se podía rechazar una inscripción ya retirada o ya rechazada  
  Archivo: `backend/app/routers/inscripciones.py` línea 91  
  Fix: Guard con 409 si ya está rechazada, 400 si está retirada.

- [x] **`delete` inscripción sin validación de torneo** — se podía eliminar una inscripción de un torneo en curso  
  Archivo: `backend/app/routers/inscripciones.py` línea 178  
  Fix: Carga torneo con joinedload, bloquea con 409 si `estado in ("en_curso", "finalizado")`.

- [x] **`_aplicar_walkover` hacía N+1 queries** — 2 queries extra por cada partido pendiente al retirar un equipo  
  Archivo: `backend/app/routers/inscripciones.py` línea 149  
  Fix: Se eliminó el parámetro `db`, se carga `partidos_pendientes` con `joinedload(Partido.local).joinedload(Inscripcion.club_equipo)` y `joinedload(Partido.visitante)...`. La función usa `partido.local` y `partido.visitante` directamente.

- [x] **`_crear_notificaciones_reprogramacion` hacía 2 queries extra** — consultaba inscripciones ya cargadas  
  Archivo: `backend/app/routers/partidos.py` línea 118  
  Fix: Usa `p.local` y `p.visitante` (ya cargados por joinedload en `_load_partido`).

- [x] **`atleta_jugador` N+1 query en update/delete** — accedía a `atleta.club_equipo.institucion_id` sin joinedload  
  Archivo: `backend/app/routers/atleta_jugador.py`  
  Fix: Se agregó `joinedload(AtletaJugador.club_equipo)` en ambas funciones.

- [x] **`estadisticas:goleadores` query extra de deporte** — query separada cuando podía usar joinedload  
  Archivo: `backend/app/routers/estadisticas.py` línea 56  
  Fix: `db.query(Torneo).options(joinedload(Torneo.deporte)).filter(...)`, luego `deporte = torneo.deporte`.

- [x] **Variable `motivo` muerta en `partidos.py:update`**  
  Archivo: `backend/app/routers/partidos.py` línea 105  
  Fix: Eliminada la asignación `motivo = payload.pop(...)`. Se usa `payload.pop(...)` sin asignar.

- [x] **`siguiente-fase` daba victoria automática al local en empate** — lógica `>=` incorrecta en eliminatoria  
  Archivo: `backend/app/routers/fixture.py` línea 215  
  Fix: Cambiado a `>`. Si hay empate, se lanza 400 "El partido terminó empatado. En fase eliminatoria no puede haber empates."

- [x] **Frontend: `encuentros` guardaba reprogramación sin validar motivo**  
  Archivo: `frontend/app/admin/encuentros/page.tsx` línea 74  
  Fix: Se agrega check antes de llamar a la API: si la fecha cambió y no hay motivo, muestra `alert` y detiene el submit.

- [x] **`datetime.utcnow()` deprecated en `partidos.py`**  
  Archivo: `backend/app/routers/partidos.py` línea 111  
  Fix: Reemplazado por `datetime.now(timezone.utc)`.

---

### Estado real — Ronda 2 (revalidado contra el código actual)

#### ✅ Ya implementado

- [x] **`ClubEquipoCreate` ya no expone campo `estado`**  
  Archivos: `backend/app/schemas/club_equipo.py` + `backend/app/routers/club_equipo.py`  
  Estado actual: el schema solo recibe `institucion_id`, `deporte_id`, `nombre_equipo`; el router asigna `"aprobado"` si el usuario es admin y `"pendiente"` si es institución.

- [x] **`ResultadoUpdate` ya valida límites numéricos**  
  Archivo: `backend/app/schemas/partidos.py`  
  Estado actual: `resultado_local` y `resultado_visitante` usan `Field(..., ge=0, le=99)`.

- [x] **`deportes.py:delete` ya verifica torneos activos**  
  Archivo: `backend/app/routers/deportes.py`  
  Estado actual: bloquea el soft-delete si existe un torneo con ese deporte y `estado not in ("finalizado", "suspendido")`.

- [x] **`torneos.py:create` ya valida `deporte_id`**  
  Archivo: `backend/app/routers/torneos.py`  
  Estado actual: responde `404` si el deporte no existe o está inactivo antes de crear el torneo.

- [x] **`inscripciones:create` ya maneja la race condition con `IntegrityError`**  
  Archivo: `backend/app/routers/inscripciones.py`  
  Estado actual: el `commit()` está envuelto en `try/except IntegrityError`, hace rollback y devuelve `400`.

- [x] **`database.py:get_db` ya hace rollback explícito**  
  Archivo: `backend/app/database.py`  
  Estado actual: el generador captura `Exception`, ejecuta `db.rollback()` y relanza el error antes del `finally`.

- [x] **`notificaciones.py` ya usa `.is_(False)`**  
  Archivo: `backend/app/routers/notificaciones.py`  
  Estado actual: el filtro de `leer-todas` ya no usa `== False`.

- [x] **Los layouts ya no usan `localStorage.clear()`**  
  Archivos: `frontend/app/admin/layout.tsx`, `frontend/app/institucion/layout.tsx`  
  Estado actual: ambos usan `removeItem("token")`, `removeItem("rol")` y `removeItem("nombre")`.

- [x] **Las notificaciones ya tienen polling**  
  Archivo: `frontend/app/institucion/layout.tsx`  
  Estado actual: existe `setInterval(cargarNotifs, 30_000)` con cleanup dentro de `useEffect`.

- [x] **`admin/inscripciones/page.tsx` ya maneja errores en las acciones pendientes**  
  Archivo: `frontend/app/admin/inscripciones/page.tsx`  
  Estado actual: `aprobar`, `rechazar` y `eliminar` ya capturan errores de API y los muestran en la UI mediante `setError(...)`.

- [x] **`sorteos/page.tsx:cargarDetalles` ya tiene try/catch**  
  Archivo: `frontend/app/admin/sorteos/page.tsx`  
  Estado actual: `Promise.all(...)` está envuelto en `try/catch`; si falla, se propaga un mensaje claro y la pantalla entra en `state = "error"` con feedback visible.

- [x] **`sorteos/page.tsx:eliminar` ya tiene try/catch**  
  Archivo: `frontend/app/admin/sorteos/page.tsx`  
  Estado actual: si `api.deleteFixture()` falla, la UI conserva su estado y muestra el error en vez de limpiar fixtures/partidos falsamente.

---

### Resumen de estado — Ronda 2

| Estado | # | Descripción |
|---|---|---|
| ✅ Implementado R1 | 11 | Bugs corregidos en sesión actual |
| ✅ Implementado R2 | 12 | Todos los fixes planificados para la Ronda 2 ya están cerrados |
| 🔲 Pendiente real R2 | 0 | — |
