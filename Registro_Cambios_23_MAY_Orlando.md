# Registro de Cambios — 23 MAY 2026
**Rama:** `orlando` | **Autor:** Orlando

---

## Bugs encontrados y corregidos en la lógica de resultados / tabla general

### Bug 1 — Criterio de desempate no determinista
**Archivo:** `backend/app/routers/estadisticas.py`

El `ORDER BY` en `tabla_posiciones` no tenía una clave final única.
Cuando dos equipos tenían los mismos puntos, victorias y derrotas, SQL devolvía el orden de forma no determinista — la tabla cambiaba entre recargas.

**Corrección:** El nuevo orden usa diferencia de goles (GF-GC), goles a favor, victorias y finalmente `id` (clave estable única) como desempate final.

---

### Bug 2 — Diferencia de goles no rastreada (causa raíz del desempate incorrecto)
**Archivos afectados:**
- `backend/alembic/versions/0013_goles_favor_contra.py` ← nueva migración
- `backend/app/models/inscripciones.py`
- `backend/app/services/competition.py`
- `backend/app/schemas/estadisticas.py`
- `backend/app/routers/estadisticas.py`
- `frontend/types/api.ts`
- `frontend/app/institucion/resultados/page.tsx`
- `frontend/app/admin/resultados/page.tsx`

El modelo `Inscripcion` no tenía campos `goles_a_favor` / `goles_en_contra`.
`_apply_table_delta` no los actualizaba. Sin diferencia de goles, el desempate estándar en deportes de equipo era imposible.

**Corrección:**
- Migración Alembic `0013` agrega `goles_a_favor` y `goles_en_contra` (INTEGER, default 0) a la tabla `inscripciones`.
- `_apply_table_delta` ahora actualiza ambos campos en cada resultado.
- `tabla_posiciones` usa `GF - GC desc → GF desc → G desc → id asc` como criterio de desempate.
- Frontend muestra columna `DIF` en la tabla de posiciones.

---

### Bug 3 — `PATCH /partidos/{id}` podía marcar partido como "finalizado" sin resultado
**Archivos afectados:**
- `backend/app/routers/partidos.py`

El schema `PartidoUpdate` incluía el campo `estado`, lo que permitía enviar `{"estado": "finalizado"}` mediante el endpoint genérico de edición (sede, árbitro, fecha), eludiendo completamente `apply_result_change`. Esto dejaba estadísticas sin contar y podía permitir cerrar el torneo con datos incorrectos.

**Corrección:** Se agrega validación explícita en `PATCH /partidos/{id}` que rechaza cualquier intento de establecer `estado = "finalizado"` (HTTP 409). El estado "finalizado" solo puede ser asignado por `PATCH /partidos/{id}/resultado`.

---

## Archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `backend/alembic/versions/0013_goles_favor_contra.py` | Nuevo |
| `backend/app/models/inscripciones.py` | Modificado |
| `backend/app/services/competition.py` | Modificado |
| `backend/app/schemas/estadisticas.py` | Modificado |
| `backend/app/routers/estadisticas.py` | Modificado |
| `backend/app/routers/partidos.py` | Modificado |
| `frontend/types/api.ts` | Modificado |
| `frontend/app/institucion/resultados/page.tsx` | Modificado |
| `frontend/app/admin/resultados/page.tsx` | Modificado |
