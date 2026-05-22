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
  ClubEquipo,
  ClubEquipoCreate,
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
} from "@/types/api";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${BASE}${path}`, { ...options, headers, signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Error desconocido" }));
      throw new Error((err as { detail?: string }).detail ?? "Error en la solicitud");
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

export const api = {
  // ── Auth ────────────────────────────────────────────────────────────────────

  login: (correo: string, contrasena: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ correo, contrasena }),
    }),

  me: () => request<Usuario>("/api/auth/me"),

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

  getDeportes: () => request<Deporte[]>("/api/deportes/"),
  createDeporte: (data: DeporteCreate) =>
    request<Deporte>("/api/deportes/", { method: "POST", body: JSON.stringify(data) }),
  deleteDeporte: (id: number) => request<void>(`/api/deportes/${id}`, { method: "DELETE" }),

  // ── Equipos ───────────────────────────────────────────────────────────────────

  getEquipos: () => request<ClubEquipo[]>("/api/equipos/"),
  createEquipo: (data: ClubEquipoCreate) =>
    request<ClubEquipo>("/api/equipos/", { method: "POST", body: JSON.stringify(data) }),
  aprobarEquipo: (id: number) =>
    request<ClubEquipo>(`/api/equipos/${id}`, { method: "PUT", body: JSON.stringify({ estado: "aprobado" }) }),
  deleteEquipo: (id: number) => request<void>(`/api/equipos/${id}`, { method: "DELETE" }),

  // ── Torneos ───────────────────────────────────────────────────────────────────

  getTorneos: () => request<Torneo[]>("/api/torneos/"),
  createTorneo: (data: TorneoCreate) =>
    request<Torneo>("/api/torneos/", { method: "POST", body: JSON.stringify(data) }),
  deleteTorneo: (id: number) => request<void>(`/api/torneos/${id}`, { method: "DELETE" }),

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
  deleteFixture: (torneo_id: number) => request<void>(`/api/fixture/${torneo_id}`, { method: "DELETE" }),

  // ── Partidos ──────────────────────────────────────────────────────────────────

  getPartidos: (params?: { torneo_id?: number; estado?: string }) => {
    const q = new URLSearchParams();
    if (params?.torneo_id != null) q.set("torneo_id", String(params.torneo_id));
    if (params?.estado) q.set("estado", params.estado);
    const qs = q.toString();
    return request<Partido[]>(`/api/partidos/${qs ? `?${qs}` : ""}`);
  },
  updatePartido: (id: number, data: PartidoUpdate) =>
    request<Partido>(`/api/partidos/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  setResultado: (id: number, data: ResultadoUpdate) =>
    request<Partido>(`/api/partidos/${id}/resultado`, { method: "PATCH", body: JSON.stringify(data) }),

  // ── Atletas ───────────────────────────────────────────────────────────────────

  getAtletas: (club_equipo_id?: number) =>
    request<AtletaJugador[]>(`/api/atletas/${club_equipo_id != null ? `?club_equipo_id=${club_equipo_id}` : ""}`),
  createAtleta: (data: AtletaCreate) =>
    request<AtletaJugador>("/api/atletas/", { method: "POST", body: JSON.stringify(data) }),
  updateAtleta: (id: number, data: AtletaUpdate) =>
    request<AtletaJugador>(`/api/atletas/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteAtleta: (id: number) => request<void>(`/api/atletas/${id}`, { method: "DELETE" }),

  // ── Estadísticas ──────────────────────────────────────────────────────────────

  getTabla: (torneo_id: number) =>
    request<PosicionTabla[]>(`/api/estadisticas/tabla?torneo_id=${torneo_id}`),
  getGoleadores: (torneo_id: number, limit = 10) =>
    request<Goleador[]>(`/api/estadisticas/goleadores?torneo_id=${torneo_id}&limit=${limit}`),
};
