import type {
  LoginResponse,
  RecoveryQuestionsResponse,
  RecoveryResetPayload,
  SolicitudAccesoPayload,
  MessageResponse,
  Usuario,
  Institucion,
  InstitucionCreate,
  Deporte,
  DeporteCreate,
  DeporteUpdate,
  ClubEquipo,
  ClubEquipoCreate,
  ClubEquipoUpdate,
  Torneo,
  TorneoCreate,
  Sede,
  SedeCreate,
  Noticia,
  Inscripcion,
  InscripcionCreate,
  Grupo,
  GrupoCreate,
  Fixture,
  Partido,
  PartidoUpdate,
  ResultadoUpdate,
  AtletaJugador,
  AtletaCreate,
  AtletaUpdate,
  PosicionTabla,
  Goleador,
  Notificacion,
  AuditoriaEntry,
  ResumenGeneral,
  ParticipantesInstitucion,
  EquiposPorDeporte,
} from "@/types/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const AUTH_REFRESH_PATH = "/api/auth/refresh";
const AUTH_LOGOUT_PATH = "/api/auth/logout";
const AUTH_SKIP_REFRESH = new Set([
  "/api/auth/login",
  AUTH_REFRESH_PATH,
  AUTH_LOGOUT_PATH,
  "/api/auth/solicitar",
  "/api/auth/recovery/questions",
  "/api/auth/recovery/reset",
]);

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function setSession(data: LoginResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("rol", data.rol);
  localStorage.setItem("nombre", data.nombre);
}

function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("rol");
  localStorage.removeItem("nombre");
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const detail = (payload as { detail?: unknown; message?: unknown }).detail
    ?? (payload as { message?: unknown }).message;
  if (!detail) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const mensajes = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item && typeof (item as { msg?: unknown }).msg === "string") {
          return (item as { msg?: string }).msg ?? null;
        }
        return null;
      })
      .filter((msg): msg is string => Boolean(msg));
    return mensajes.length > 0 ? mensajes.join(" | ") : null;
  }
  if (typeof detail === "object" && "msg" in detail && typeof (detail as { msg?: unknown }).msg === "string") {
    return (detail as { msg?: string }).msg ?? null;
  }
  return null;
}

async function refreshSession(): Promise<LoginResponse | null> {
  try {
    const res = await fetch(`${BASE}${AUTH_REFRESH_PATH}`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as LoginResponse;
    setSession(data);
    return data;
  } catch {
    return null;
  }
}

async function requestWithRetry<T>(
  path: string,
  options: RequestInit,
  allowRefresh: boolean
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 401 && allowRefresh && !AUTH_SKIP_REFRESH.has(path)) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return requestWithRetry<T>(path, options, false);
      }
      clearSession();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Sesión expirada. Inicia sesión nuevamente.");
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = extractErrorMessage(body) ?? "Error en la solicitud";
      throw new Error(message);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("El servidor no responde. Verifica que el backend esté corriendo.");
    }
    throw err;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return requestWithRetry(path, options, true);
}

export const api = {
  // ── Auth ────────────────────────────────────────────────────────────────────

  login: async (correo: string, contrasena: string) => {
    const data = await request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ correo, contrasena }),
    });
    setSession(data);
    return data;
  },

  me: () => request<Usuario>("/api/auth/me"),

  logout: async () => {
    try {
      await request<void>(AUTH_LOGOUT_PATH, { method: "POST" });
    } finally {
      clearSession();
    }
  },

  solicitar: (data: SolicitudAccesoPayload) =>
    request<MessageResponse>("/api/auth/solicitar", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  recoveryQuestions: (correo: string) =>
    request<RecoveryQuestionsResponse>("/api/auth/recovery/questions", {
      method: "POST",
      body: JSON.stringify({ correo }),
    }),

  recoveryReset: (data: RecoveryResetPayload) =>
    request<MessageResponse>("/api/auth/recovery/reset", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ── Usuarios ────────────────────────────────────────────────────────────────

  getUsuarios: () => request<Usuario[]>("/api/usuarios/"),
  getPendientes: () => request<Usuario[]>("/api/usuarios/pendientes"),
  approveUsuario: (id: number) => request<Usuario>(`/api/usuarios/${id}/approve`, { method: "PATCH" }),
  deactivateUsuario: (id: number) => request<Usuario>(`/api/usuarios/${id}/deactivate`, { method: "PATCH" }),

  // ── Instituciones ───────────────────────────────────────────────────────────

  getInstituciones: () => request<Institucion[]>("/api/instituciones/"),
  createInstitucion: (data: InstitucionCreate) =>
    request<Institucion>("/api/instituciones/", { method: "POST", body: JSON.stringify(data) }),
  deleteInstitucion: (id: number) => request<void>(`/api/instituciones/${id}`, { method: "DELETE" }),

  // ── Deportes ─────────────────────────────────────────────────────────────────

  getDeportes: (incluirInactivos = false) =>
    request<Deporte[]>(`/api/deportes/${incluirInactivos ? "?incluir_inactivos=true" : ""}`),
  createDeporte: (data: DeporteCreate) =>
    request<Deporte>("/api/deportes/", { method: "POST", body: JSON.stringify(data) }),
  updateDeporte: (id: number, data: DeporteUpdate) =>
    request<Deporte>(`/api/deportes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteDeporte: (id: number) => request<void>(`/api/deportes/${id}`, { method: "DELETE" }),

  // ── Equipos ───────────────────────────────────────────────────────────────────

  getEquipos: () => request<ClubEquipo[]>("/api/equipos/"),
  createEquipo: (data: ClubEquipoCreate) =>
    request<ClubEquipo>("/api/equipos/", { method: "POST", body: JSON.stringify(data) }),
  updateEquipo: (id: number, data: ClubEquipoUpdate) =>
    request<ClubEquipo>(`/api/equipos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  aprobarEquipo: (id: number) =>
    request<ClubEquipo>(`/api/equipos/${id}/aprobar`, { method: "PATCH" }),
  deleteEquipo: (id: number) => request<void>(`/api/equipos/${id}`, { method: "DELETE" }),

  // ── Torneos ───────────────────────────────────────────────────────────────────

  getTorneos: () => request<Torneo[]>("/api/torneos/"),
  createTorneo: (data: TorneoCreate) =>
    request<Torneo>("/api/torneos/", { method: "POST", body: JSON.stringify(data) }),
  deleteTorneo: (id: number) => request<void>(`/api/torneos/${id}`, { method: "DELETE" }),
  avanzarTorneo: (id: number) => request<Torneo>(`/api/torneos/${id}/avanzar`, { method: "PATCH" }),
  suspenderTorneo: (id: number) => request<Torneo>(`/api/torneos/${id}/suspender`, { method: "PATCH" }),
  reactivarTorneo: (id: number) => request<Torneo>(`/api/torneos/${id}/reactivar`, { method: "PATCH" }),

  // ── Sedes ─────────────────────────────────────────────────────────────────────

  getSedes: () => request<Sede[]>("/api/sedes/"),
  createSede: (data: SedeCreate) =>
    request<Sede>("/api/sedes/", { method: "POST", body: JSON.stringify(data) }),
  deleteSede: (id: number) => request<void>(`/api/sedes/${id}`, { method: "DELETE" }),

  // ── Noticias ──────────────────────────────────────────────────────────────────

  getNoticias: () => request<Noticia[]>("/api/noticias/"),

  // ── Inscripciones ─────────────────────────────────────────────────────────────

  getInscripciones: (torneo_id?: number) =>
    request<Inscripcion[]>(`/api/inscripciones/${torneo_id != null ? `?torneo_id=${torneo_id}` : ""}`),
  createInscripcion: (data: InscripcionCreate) =>
    request<Inscripcion>("/api/inscripciones/", { method: "POST", body: JSON.stringify(data) }),
  aprobarInscripcion: (id: number) =>
    request<Inscripcion>(`/api/inscripciones/${id}/aprobar`, { method: "PATCH" }),
  rechazarInscripcion: (id: number) =>
    request<Inscripcion>(`/api/inscripciones/${id}/rechazar`, { method: "PATCH" }),
  retirarInscripcion: (id: number) =>
    request<Inscripcion>(`/api/inscripciones/${id}/retirar`, { method: "PATCH" }),
  deleteInscripcion: (id: number) => request<void>(`/api/inscripciones/${id}`, { method: "DELETE" }),

  // ── Grupos ────────────────────────────────────────────────────────────────────

  getGrupos: (torneo_id?: number) =>
    request<Grupo[]>(`/api/grupos/${torneo_id != null ? `?torneo_id=${torneo_id}` : ""}`),
  createGrupo: (data: GrupoCreate) =>
    request<Grupo>("/api/grupos/", { method: "POST", body: JSON.stringify(data) }),
  deleteGrupo: (id: number) => request<void>(`/api/grupos/${id}`, { method: "DELETE" }),

  // ── Fixture ───────────────────────────────────────────────────────────────────

  getFixture: (torneo_id?: number) =>
    request<Fixture[]>(`/api/fixture/${torneo_id != null ? `?torneo_id=${torneo_id}` : ""}`),
  generarFixture: (torneo_id: number, force = false) =>
    request<Fixture[]>("/api/fixture/generar", { method: "POST", body: JSON.stringify({ torneo_id, force }) }),
  generarFaseEliminatoria: (torneo_id: number, n_clasificados: number) =>
    request<Fixture>("/api/fixture/fase-eliminatoria", { method: "POST", body: JSON.stringify({ torneo_id, n_clasificados }) }),
  generarSiguienteFase: (torneo_id: number, fixture_id: number) =>
    request<Fixture>("/api/fixture/siguiente-fase", { method: "POST", body: JSON.stringify({ torneo_id, fixture_id }) }),
  deleteFixture: (torneo_id: number) => request<void>(`/api/fixture/${torneo_id}`, { method: "DELETE" }),

  // ── Partidos ──────────────────────────────────────────────────────────────────

  getPartidos: (params?: { torneo_id?: number; deporte_id?: number; estado?: string; torneo_estado?: string }) => {
    const q = new URLSearchParams();
    if (params?.torneo_id != null) q.set("torneo_id", String(params.torneo_id));
    if (params?.deporte_id != null) q.set("deporte_id", String(params.deporte_id));
    if (params?.estado) q.set("estado", params.estado);
    if (params?.torneo_estado) q.set("torneo_estado", params.torneo_estado);
    const qs = q.toString();
    return request<Partido[]>(`/api/partidos/${qs ? `?${qs}` : ""}`);
  },
  updatePartido: (id: number, data: PartidoUpdate) =>
    request<Partido>(`/api/partidos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  setResultado: (id: number, data: ResultadoUpdate) =>
    request<Partido>(`/api/partidos/${id}/resultado`, { method: "PATCH", body: JSON.stringify(data) }),

  // ── Atletas ───────────────────────────────────────────────────────────────────

  getAtletas: (club_equipo_id?: number, torneo_id?: number, nombre_fase?: string) => {
    const params = new URLSearchParams();
    if (club_equipo_id != null) params.set("club_equipo_id", String(club_equipo_id));
    if (torneo_id != null) params.set("torneo_id", String(torneo_id));
    if (nombre_fase != null) params.set("nombre_fase", nombre_fase);
    const query = params.toString();
    return request<AtletaJugador[]>(`/api/atletas/${query ? `?${query}` : ""}`);
  },
  createAtleta: (data: AtletaCreate) =>
    request<AtletaJugador>("/api/atletas/", { method: "POST", body: JSON.stringify(data) }),
  updateAtleta: (id: number, data: AtletaUpdate) =>
    request<AtletaJugador>(`/api/atletas/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteAtleta: (id: number) => request<void>(`/api/atletas/${id}`, { method: "DELETE" }),

  // ── Notificaciones ────────────────────────────────────────────────────────────

  getNotificaciones: () => request<Notificacion[]>("/api/notificaciones/"),
  marcarLeida: (id: number) => request<Notificacion>(`/api/notificaciones/${id}/leer`, { method: "PATCH" }),
  marcarTodasLeidas: () => request<void>("/api/notificaciones/leer-todas", { method: "PATCH" }),
  eliminarNotificacion: (id: number) => request<void>(`/api/notificaciones/${id}`, { method: "DELETE" }),

  // ── Estadísticas ──────────────────────────────────────────────────────────────

  getTabla: (torneo_id: number) =>
    request<PosicionTabla[]>(`/api/estadisticas/tabla?torneo_id=${torneo_id}`),
  getGoleadores: (torneo_id: number, limit = 10) =>
    request<Goleador[]>(`/api/estadisticas/goleadores?torneo_id=${torneo_id}&limit=${limit}`),

  // ── Reportes ──────────────────────────────────────────────────────────────────

  getReporteResumen: () => request<ResumenGeneral>("/api/reportes/resumen"),
  getParticipantesPorInstitucion: () =>
    request<ParticipantesInstitucion[]>("/api/reportes/participantes-por-institucion"),
  getEquiposPorDeporte: () => request<EquiposPorDeporte[]>("/api/reportes/equipos-por-deporte"),

  // ── Auditoría ─────────────────────────────────────────────────────────────────

  getAuditoria: (limit = 20) =>
    request<AuditoriaEntry[]>(`/api/auditoria/?limit=${limit}`),
};
