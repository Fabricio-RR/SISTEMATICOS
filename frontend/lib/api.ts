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

  // ── Instituciones ───────────────────────────────────────────────────────────
  getInstituciones: () => request<any[]>("/api/instituciones/"),
  createInstitucion: (data: any) =>
    request("/api/instituciones/", { method: "POST", body: JSON.stringify(data) }),
  deleteInstitucion: (id: number) =>
    request(`/api/instituciones/${id}`, { method: "DELETE" }),

  // ── Catálogos ───────────────────────────────────────────────────────────────
  getDeportes: () => request<any[]>("/api/deportes/"),
  getEquipos: () => request<any[]>("/api/equipos/"),
  getTorneos: () => request<any[]>("/api/torneos/"),
  getNoticias: () => request<any[]>("/api/noticias/"),
};