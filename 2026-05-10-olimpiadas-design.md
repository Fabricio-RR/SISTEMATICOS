# Sistema de Olimpiadas Universitarias

Fecha: 2026-05-10
Estado: Aprobado (definicion inicial)

## 1) Resumen

Se disena un sistema web para olimpiadas universitarias con multiples ediciones, un solo organizador, pagina publica editorial sin cards, resultados en tiempo real, aprobaciones de admin para cambios sensibles, y un panel operativo completo. El stack base es Next.js (frontend), FastAPI (backend), MySQL (datos), Redis (cache/colas) y Cloudinary (media).

## 2) Objetivos

- Gestionar instituciones, equipos, jugadores, deportes, categorias, torneos, fixtures, partidos y resultados.
- Operar en tiempo real con respaldo manual.
- Ofrecer pagina publica profesional, legible y sin interfaz tipo cards.
- Mantener seguridad, trazabilidad y aprobaciones formales.
- Permitir reglas configurables por deporte y torneo.
- Soportar ediciones (temporadas) con historico y cierre controlado.

## 3) No objetivos (MVP)

- Multitenancy (varios organizadores). Solo una olimpiada oficial.
- Multilenguaje. Solo espanol.
- Integraciones externas complejas (federaciones, wearables, etc.).
- Inscripcion directa por lideres de equipo (se reserva para fase futura).

## 4) Usuarios y roles

Roles base:

- Admin: control total, aprobaciones, ediciones, reglas y auditoria.
- Institucion: gestiona equipos y jugadores propios, solicita inscripciones.
- Arbitro: actualiza resultados solo en partidos asignados.
- Mesa/Staff: apoyo operativo en eventos, resultados y horarios.
- Publico: solo lectura, sin login.

Reglas:

- Roles base con permisos editables.
- Se pueden crear roles nuevos con permisos personalizados.
- 2FA obligatorio (TOTP + respaldo por correo) para Admin y Arbitro.

## 5) Alcance funcional

### Panel interno

- Aprobaciones: instituciones, equipos, jugadores, inscripciones, resultados, eventos, premios, solicitudes externas.
- Catalogos: deportes, categorias (plantilla + ajustes por edicion).
- Torneos: liga, eliminacion simple, eliminacion doble, grupos + eliminatoria, sistema suizo.
- Fixture: generacion automatica con restricciones avanzadas y edicion manual.
- Resultados: eventos simples (gol, falta, tarjeta, tiempo) + marcador.
- Sedes: escenarios, horarios y agenda.
- Premios: tabla de medallas por institucion.
- Auditoria: acciones criticas con antes/despues.

### Pagina publica (editorial)

- Resultados en vivo.
- Tablas de posiciones.
- Directorio de equipos y roster publico.
- Eventos oficiales.
- Premios.
- Noticias oficiales.
- Filtros: edicion, deporte, categoria, institucion, equipo, sede.

## 6) Arquitectura general

- Frontend: Next.js con rutas publicas y privadas en una sola app.
- Backend: FastAPI modular (API v1, dominio, servicios, realtime, jobs).
- Base de datos: MySQL como fuente de verdad transaccional.
- Cache y colas: Redis para cache, rate limit y jobs.
- Media: Cloudinary para fotos de jugadores/equipos.
- Tiempo real: WebSockets para panel interno; polling controlado para pagina publica.

## 7) Separacion de responsabilidades

### Frontend

- Publico: consumo de endpoints cacheables, SSR/SSG para SEO.
- Panel: UI operacional con permisos y estados (aprobado/pendiente/rechazado).
- Realtime: sockets solo para panel interno.

### Backend

- API REST versionada: /api/v1/...
- Dominio: reglas deportivas, validaciones y limites.
- Servicios: fixtures, standings, aprobaciones, auditoria.
- Realtime: canal interno para panel.
- Jobs: proyecciones publicas, cache y notificaciones.

### Datos

- MySQL: operaciones criticas y transacciones.
- Redis: cache de lectura publica + colas.

## 8) Modelo de datos (resumen)

Entidades clave:

- Edicion, Institucion, Usuario, Rol, Permiso
- Deporte, CategoriaTemplate, CategoriaEdicion
- Equipo, Jugador, Competidor
- Torneo, Fase, Grupo, Inscripcion
- Partido, EventoPartido, AsignacionArbitro
- Sede, EventoOficial, Premio, Noticia
- SolicitudExterna, Aprobacion, Auditoria
- ProyeccionesPublicas (read models)

Relaciones clave:

- Edicion agrupa deportes, categorias, torneos, eventos y premios.
- Competidor unifica equipos e individuales en torneos.
- Partido conecta competidores y genera eventos simples.

## 9) Proyecciones publicas (read models)

- Resultados en vivo por partido.
- Tablas de posiciones por torneo/grupo.
- Tabla de medallas por institucion.
- Directorio y perfil publico de equipos.

Actualizacion:

- Jobs que recalculan standings y cache cuando cambia un partido.

## 10) Tiempo real

- Panel interno: WebSockets para arbitros/mesa/admin.
- Pagina publica: polling cada 15-30s con cache TTL corto.
- Respaldo: admin puede corregir manualmente resultados.

## 11) Seguridad y permisos

- JWT + refresh tokens, cookies HttpOnly.
- 2FA obligatorio para Admin y Arbitro.
- Roles y permisos editables.
- Rate limiting en endpoints sensibles.
- Auditoria para cambios criticos.

## 12) Flujo de aprobaciones

- Todas las altas y cambios sensibles pasan por cola de aprobacion.
- Estado final: aprobado o rechazado.

## 13) Reglas y formatos deportivos

- Formatos: liga, eliminacion simple/doble, grupos + eliminatoria, suizo.
- Reglas configurables por deporte/torneo (puntos, desempates).
- Plantillas base y ajustes por edicion.

## 14) Fixture y restricciones

Restricciones minimas:

- Sin cruces superpuestos para el mismo equipo.
- Bloques horarios por sede.
- Descanso minimo entre partidos.
- Limite de partidos por dia.
- Preferencias avanzadas (horarios restringidos).

## 15) Pagina publica editorial

- Barra superior fija con filtros y selector de edicion.
- Resultados en vivo con filas completas y divisores.
- Tablas de posiciones amplias con encabezado fijo.
- Directorio de equipos en formato lista.
- Eventos oficiales en linea de tiempo.
- Premios en tabla de medallas.
- Noticias como feed editorial.

## 16) API design (REST v1)

- Versionado en ruta: /api/v1/...
- Convenciones de errores consistentes (codigo, mensaje, detalle).
- Paginacion en listas (page, page_size).
- Endpoints publicos separados: /api/v1/public/...

## 17) Privacidad de datos

Publico:

- Nombre, foto, posicion y edad.
  Privado:
- Documento, contacto, fecha exacta de nacimiento.

## 18) Notificaciones

- Email para aprobaciones y cambios criticos (horarios/resultados).
- Proveedor de email: Resend.
- No se incluyen notificaciones masivas en MVP.

## 19) Observabilidad y auditoria

- Logs estructurados por request.
- Auditoria para acciones criticas (antes/despues, actor).
- Metricas basicas: error rate, latency, cache hit.

## 20) Media

- Cloudinary para fotos de jugadores y equipos.
- Validacion de tamanos y formatos.

## 21) Despliegue

- Desarrollo local en PC.
- Despliegue futuro: nube gestionada.
- Infra con Docker para backend, redis y mysql.

## 22) Plan por fases (aprobado)

Fase 0: Fundacion tecnica y entorno.
Fase 1: Identidad, seguridad y gobernanza.
Fase 2: Catalogos y entidades deportivas.
Fase 3: Torneos y calendario.
Fase 4: Resultados en tiempo real.
Fase 5: Pagina publica editorial.
Fase 6: Operacion y endurecimiento.

## 23) Estrategia de pruebas

- Unit tests en dominio (reglas, restricciones, standings).
- Integration tests en API critica (auth, aprobaciones, resultados).
- E2E minimo en flujos clave (inscripcion, fixture, live score).

## 24) Riesgos y mitigaciones

- Complejidad de fixtures: dividir generador por fases y validar con simulaciones.
- Carga en pagina publica: cache y polling controlado.
- Errores en live scoring: override admin y auditoria.

## 25) Decisiones pendientes

- Proveedor de nube gestionada (pendiente).

## 26) Catalogo inicial de deportes (aprobado)

- Futbol, futsal, basquet, voley, handball.
- Atletismo, natacion, ajedrez, tenis de mesa.

Criterio: mezcla de deportes por equipos e individuales, viables en entorno universitario.
