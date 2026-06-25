const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getToken() {
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
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Error desconocido" }));
      throw new Error(err.detail ?? "Error en la solicitud");
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") throw new Error("El servidor no responde. Verifica que el backend esté corriendo.");
    throw err;
  }
}

export const api = {
  // ── Auth ────────────────────────────────────────────────────────────────────
  login: (correo: string, contrasena: string) =>
    request<{ access_token: string; rol: string; nombre: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ correo, contrasena }),
    }),

  me: () => request<any>("/api/auth/me"),

  solicitar: (data: any) =>
    request("/api/auth/solicitar", { method: "POST", body: JSON.stringify(data) }),

  recoveryQuestions: (correo: string) =>
    request<{ correo: string; pregunta_1: string; pregunta_2: string; pregunta_3: string }>(
      "/api/auth/recovery/questions",
      { method: "POST", body: JSON.stringify({ correo }) }
    ),

  recoveryReset: (data: any) =>
    request("/api/auth/recovery/reset", { method: "POST", body: JSON.stringify(data) }),

  // ── Usuarios (admin) ────────────────────────────────────────────────────────
  getUsuarios: () => request<any[]>("/api/usuarios/"),
  getPendientes: () => request<any[]>("/api/usuarios/pendientes"),
  approveUsuario: (id: number) =>
    request(`/api/usuarios/${id}/approve`, { method: "PATCH" }),
  deactivateUsuario: (id: number) =>
    request(`/api/usuarios/${id}/deactivate`, { method: "PATCH" }),
  deleteUsuario: (id: number) =>
    request(`/api/usuarios/${id}`, { method: "DELETE" }),

  // ── Instituciones ───────────────────────────────────────────────────────────
  getInstituciones: () => request<any[]>("/api/instituciones/"),
  createInstitucion: (data: any) =>
    request("/api/instituciones/", { method: "POST", body: JSON.stringify(data) }),
  updateInstitucion: (id: number, data: any) =>
    request(`/api/instituciones/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteInstitucion: (id: number) =>
    request(`/api/instituciones/${id}`, { method: "DELETE" }),

  // ── Catálogos ───────────────────────────────────────────────────────────────
  getDeportes: () => request<any[]>("/api/deportes/"),
  getEquipos: () => request<any[]>("/api/equipos/"),
  createEquipo: (data: any) =>
    request("/api/equipos/", { method: "POST", body: JSON.stringify(data) }),
  getTorneos: () => request<any[]>("/api/torneos/"),
  getNoticias: () => request<any[]>("/api/noticias/"),
  getSedes: () => request<any[]>("/api/sedes/"),
  createSede: (data: any) =>
    request("/api/sedes/", { method: "POST", body: JSON.stringify(data) }),
  updateSede: (id: number, data: any) =>
    request(`/api/sedes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSede: (id: number) =>
    request(`/api/sedes/${id}`, { method: "DELETE" }),

  // ── Atletas / Jugadores ─────────────────────────────────────────────────────
  getAtletasByEquipo: (clubEquipoId: number) =>
    request<any[]>(`/api/atletas/equipo/${clubEquipoId}`),
  createAtleta: (data: any) =>
    request("/api/atletas/", { method: "POST", body: JSON.stringify(data) }),
  updateAtleta: (id: number, data: any) =>
    request(`/api/atletas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAtleta: (id: number) =>
    request(`/api/atletas/${id}`, { method: "DELETE" }),

  // ── Inscripciones ───────────────────────────────────────────────────────────
  getInscripcionesByTorneo: (torneoId: number) =>
    request<any[]>(`/api/inscripciones/torneo/${torneoId}`),
  getMisInscripciones: () => request<any[]>("/api/inscripciones/mis-inscripciones"),
  inscribir: (data: any) =>
    request("/api/inscripciones/", { method: "POST", body: JSON.stringify(data) }),
  aprobarInscripcion: (id: number) =>
    request(`/api/inscripciones/${id}/aprobar`, { method: "PATCH" }),
  rechazarInscripcion: (id: number) =>
    request(`/api/inscripciones/${id}/rechazar`, { method: "PATCH" }),
  eliminarInscripcion: (id: number) =>
    request(`/api/inscripciones/${id}`, { method: "DELETE" }),

  // ── Fixture / Sorteo ────────────────────────────────────────────────────────
  getFixture: (torneoId: number) =>
    request<any[]>(`/api/fixture/torneo/${torneoId}`),
  generarSorteo: (torneoId: number) =>
    request(`/api/fixture/sorteo/${torneoId}`, { method: "POST" }),
  generarEliminatoria: (torneoId: number) =>
    request(`/api/fixture/eliminatoria/${torneoId}`, { method: "POST" }),
  eliminarFixture: (torneoId: number) =>
    request(`/api/fixture/torneo/${torneoId}`, { method: "DELETE" }),

  // ── Partidos ────────────────────────────────────────────────────────────────
  getPartidosByTorneo: (torneoId: number) =>
    request<any[]>(`/api/partidos/torneo/${torneoId}`),
  getMisPartidos: () => request<any[]>("/api/partidos/mis-partidos"),
  getProximosPartidos: (limit = 5) => request<any[]>(`/api/partidos/proximos?limit=${limit}`),
  getEnCurso: () => request<any[]>("/api/partidos/en_curso"),
  getPartido: (id: number) => request<any>(`/api/partidos/${id}`),
  programarPartido: (id: number, data: any) =>
    request(`/api/partidos/${id}/programar`, { method: "PATCH", body: JSON.stringify(data) }),
  registrarResultado: (id: number, data: any) =>
    request(`/api/partidos/${id}/resultado`, { method: "PATCH", body: JSON.stringify(data) }),
  agregarEvento: (id: number, data: any) =>
    request(`/api/partidos/${id}/eventos`, { method: "POST", body: JSON.stringify(data) }),
  getEventos: (id: number) => request<any[]>(`/api/partidos/${id}/eventos`),

  // ── Estadísticas ────────────────────────────────────────────────────────────
  getPosiciones: (torneoId: number) =>
    request<any[]>(`/api/estadisticas/torneo/${torneoId}/posiciones`),
  getGoleadores: (torneoId: number) =>
    request<any[]>(`/api/estadisticas/torneo/${torneoId}/goleadores`),
  getDisciplina: (torneoId: number) =>
    request<any[]>(`/api/estadisticas/torneo/${torneoId}/disciplina`),
  getFaltas: (torneoId: number) =>
    request<any[]>(`/api/estadisticas/torneo/${torneoId}/faltas`),
  getResumenInstituciones: () =>
    request<any[]>("/api/estadisticas/resumen-instituciones"),
  getResumen: () => request<any>("/api/estadisticas/resumen"),

  // ── Deportes (admin CRUD) ────────────────────────────────────────────────────
  getDeportesAdmin: () => request<any[]>("/api/deportes/todos"),
  createDeporte: (data: any) =>
    request("/api/deportes/", { method: "POST", body: JSON.stringify(data) }),
  updateDeporte: (id: number, data: any) =>
    request(`/api/deportes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDeporte: (id: number) =>
    request(`/api/deportes/${id}`, { method: "DELETE" }),

  // ── Torneos (admin CRUD) ─────────────────────────────────────────────────────
  createTorneo: (data: any) =>
    request("/api/torneos/", { method: "POST", body: JSON.stringify(data) }),
  updateTorneo: (id: number, data: any) =>
    request(`/api/torneos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTorneo: (id: number) =>
    request(`/api/torneos/${id}`, { method: "DELETE" }),

  // ── Atletas bulk ─────────────────────────────────────────────────────────────
  crearAtletasBulk: (data: { club_equipo_id: number; jugadores: any[] }) =>
    request<any[]>("/api/atletas/bulk", { method: "POST", body: JSON.stringify(data) }),

  // ── Raw request (para usos avanzados) ────────────────────────────────────────
  request: <T = any>(path: string, options?: RequestInit) => request<T>(path, options),
};