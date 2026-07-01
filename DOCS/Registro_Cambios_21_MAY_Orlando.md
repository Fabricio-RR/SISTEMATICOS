# Registro de Cambios — 21 Mayo 2026
**Proyecto:** Olimpiadas Perú · **Autor:** Orlando  
**Stack:** FastAPI + Next.js 14 + MySQL 8.0

---

## Resumen del Análisis

Se realizó una auditoría completa del proyecto. Se identificaron **41 problemas** distribuidos en seguridad, lógica de negocio, base de datos, frontend y calidad de código. Los más críticos involucran vulnerabilidades de seguridad que permiten escalación de roles y enumeración de usuarios, además de un frontend con datos completamente estáticos que no consume el backend real.

---

## Checklist de Tareas

### Seguridad (Crítico)
- [x] Evitar escalación de roles: `/register` ahora requiere admin (`require_admin`). Schema usa `Literal["institucion","arbitro","admin"]` (`auth.py`, `schemas/usuarios.py`)
- [x] Corregir user enumeration: recovery endpoints devuelven error genérico 400 "Verifica el correo ingresado" (`auth.py`)
- [x] CORS desde variable de entorno `ALLOWED_ORIGINS` en `.env` — no más localhost hardcodeado (`main.py`, `config.py`)
- [ ] Rotar el `SECRET_KEY` — generar con `python -c "import secrets; print(secrets.token_hex(32))"` y reemplazar en `.env`
- [x] Rate limiting: `slowapi` en login (10/min) y recovery (5/min) (`core/limiter.py`, `auth.py`, `requirements.txt`)
- [x] Autorización en creación de equipos: usuarios solo pueden crear equipos de su propia institución (`club_equipo.py`)
- [x] Seed admin lee credenciales de `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` en `.env` (`seed.py`)

### Backend — Lógica
- [x] Proteger resultado de partidos contra doble llamada: bloquea con 409 si partido ya está "finalizado" (`partidos.py`)
- [x] Restricción de rol en resultados: solo admin o árbitro pueden registrar resultados (`deps.py`, `partidos.py`)
- [x] Validar en inscripciones: torneo no finalizado + club pertenece a la institución del usuario (`inscripciones.py`)
- [x] Fixture: guard antes de borrar — requiere `force=true` explícito si ya existe fixture (`fixture.py`, `schemas/fixture.py`)
- [ ] Fixture: soportar formatos `grupos` y `eliminacion_simple` (feature mayor, pendiente)
- [x] Auditoría activa: `set_resultado`, `aprobar inscripcion`, `approve usuario` registran en tabla `auditoria` (`partidos.py`, `inscripciones.py`, `usuarios.py`)
- [x] `GET /api/usuarios/{id}` ya existía — punto del audit incorrecto
- [x] `DELETE /api/equipos/{id}` implementado + `api.deleteEquipo()` en frontend (`club_equipo.py`, `api.ts`)
- [ ] Endpoint para asignar árbitros a partidos (usar `PATCH /{id}` existente con `arbitro_id`)
- [x] Endpoint de estadísticas: `GET /api/estadisticas/tabla?torneo_id=X` y `GET /api/estadisticas/goleadores?torneo_id=X&limit=10` (`routers/estadisticas.py`, `schemas/estadisticas.py`, registrado en `main.py`)
- [x] Frontend: página `/institucion/resultados` reemplaza stub con tabla de posiciones + goleadores reales (`institucion/resultados/page.tsx`)
- [x] Frontend: tipos `PosicionTabla` y `Goleador` en `types/api.ts`, métodos `getTabla` y `getGoleadores` en `lib/api.ts`

### Base de Datos
- [x] Agregar `created_at` a modelos clave: `Usuario`, `Torneo`, `Inscripcion`, `ClubEquipo` + migración `0002` (`alembic/versions/0002_add_created_at.py`)
- [x] Cascade `delete-orphan` en `Torneo → grupos` y `Torneo → fixtures` a nivel ORM (`models/torneos.py`)
- [x] `down()` en migración `0001` ya existía — punto del audit incorrecto
- [ ] Índices en foreign keys (optimización, baja prioridad para el curso)
- [ ] Constraint `UNIQUE` compuesto en inscripciones (mismo equipo + mismo torneo)

### Frontend
- [x] Landing `page.tsx`: tabla de posiciones fetcha de `/api/equipos/`, con loading state y empty state real
- [x] Dashboard admin: stats de partidos en curso, programados y atletas vienen del backend — sin datos hardcodeados (`admin/page.tsx`)
- [x] Dashboard admin: actividad reciente eliminada (era falsa), reemplazada por empty state honesto
- [x] Dashboard admin: error visible si el backend no responde (antes `.catch(() => {})` silencioso)
- [x] Resultados: `setResultado` ahora envía `estado: "finalizado"` para disparar actualización de tabla (`resultados/page.tsx`)
- [x] Sorteos: `generarFixture` pasa `force=true` al regenerar un fixture existente (`sorteos/page.tsx`, `lib/api.ts`)
- [x] Auth + logout ya estaban implementados en `admin/layout.tsx` e `institucion/layout.tsx` — no era necesario agregar
- [x] Dashboard institución: atletas inscritos y próximos encuentros conectados al backend (`institucion/page.tsx`)
- [ ] Extraer componentes reutilizables: botones, cards, tablas (baja prioridad para el curso)

### Calidad de Código
- [ ] Definir enums para roles (`admin`, `institucion`, `arbitro`) y estados (`activo`, `pendiente`)
- [ ] Corregir N+1 queries en `partidos.py:62` — usar eager loading
- [ ] Agregar al menos tests de integración para auth y partidos
- [ ] Unificar manejo de errores HTTP (distinguir 404 de 403)
