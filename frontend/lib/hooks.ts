"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Capa de datos del frontend (TanStack Query).
 *
 * Centraliza el fetching de lectura: caché compartida entre pantallas,
 * reintentos y estados de carga/error consistentes. Reemplaza el patrón
 * manual `useEffect -> cargar() -> useState(loading/error)` repetido en
 * cada página.
 *
 * Las `queryKey` se generan con la fábrica `qk` para invalidar caché de
 * forma consistente desde las mutaciones (p. ej. tras crear/editar/eliminar).
 */

type PartidosParams = Parameters<typeof api.getPartidos>[0];

/** Opciones de uso común que el llamador puede pasar a cualquier hook. */
type QueryOpts = { refetchInterval?: number; enabled?: boolean };

export const qk = {
  instituciones: () => ["instituciones"] as const,
  noticias: () => ["noticias"] as const,
  deportes: (incluirInactivos = false) => ["deportes", { incluirInactivos }] as const,
  equipos: () => ["equipos"] as const,
  torneos: () => ["torneos"] as const,
  fixture: (torneoId?: number) => ["fixture", { torneoId }] as const,
  sedes: () => ["sedes"] as const,
  inscripciones: (torneoId?: number) => ["inscripciones", { torneoId }] as const,
  partidos: (params?: PartidosParams) => ["partidos", params ?? {}] as const,
  atletas: (clubEquipoId?: number, torneoId?: number, fase?: string) =>
    ["atletas", { clubEquipoId, torneoId, fase }] as const,
  tabla: (torneoId: number) => ["tabla", torneoId] as const,
  goleadores: (torneoId: number, limit = 10) => ["goleadores", torneoId, limit] as const,
  auditoria: (limit = 20) => ["auditoria", { limit }] as const,
  reporteResumen: () => ["reporte", "resumen"] as const,
  reporteParticipantes: () => ["reporte", "participantes"] as const,
  reporteEquiposDeporte: () => ["reporte", "equipos-deporte"] as const,
};

export function useInstituciones(opts: QueryOpts = {}) {
  return useQuery({ queryKey: qk.instituciones(), queryFn: () => api.getInstituciones(), ...opts });
}

// Noticias publicadas del portal.
export function useNoticias(opts: QueryOpts = {}) {
  return useQuery({ queryKey: qk.noticias(), queryFn: () => api.getNoticias(), ...opts });
}

export function useDeportes(incluirInactivos = false, opts: QueryOpts = {}) {
  return useQuery({
    queryKey: qk.deportes(incluirInactivos),
    queryFn: () => api.getDeportes(incluirInactivos),
    ...opts,
  });
}

export function useEquipos(opts: QueryOpts = {}) {
  return useQuery({ queryKey: qk.equipos(), queryFn: () => api.getEquipos(), ...opts });
}

export function useTorneos(opts: QueryOpts = {}) {
  return useQuery({ queryKey: qk.torneos(), queryFn: () => api.getTorneos(), ...opts });
}

export function useFixture(torneoId?: number, opts: QueryOpts = {}) {
  return useQuery({ queryKey: qk.fixture(torneoId), queryFn: () => api.getFixture(torneoId), ...opts });
}

export function useSedes(opts: QueryOpts = {}) {
  return useQuery({ queryKey: qk.sedes(), queryFn: () => api.getSedes(), ...opts });
}

export function useInscripciones(torneoId?: number, opts: QueryOpts = {}) {
  return useQuery({
    queryKey: qk.inscripciones(torneoId),
    queryFn: () => api.getInscripciones(torneoId),
    ...opts,
  });
}

export function usePartidos(params?: PartidosParams, opts: QueryOpts = {}) {
  return useQuery({ queryKey: qk.partidos(params), queryFn: () => api.getPartidos(params), ...opts });
}

export function useAtletas(
  clubEquipoId?: number,
  torneoId?: number,
  fase?: string,
  opts: QueryOpts = {}
) {
  return useQuery({
    queryKey: qk.atletas(clubEquipoId, torneoId, fase),
    queryFn: () => api.getAtletas(clubEquipoId, torneoId, fase),
    ...opts,
  });
}

export function useTabla(torneoId?: number, opts: QueryOpts = {}) {
  return useQuery({
    queryKey: qk.tabla(torneoId ?? 0),
    queryFn: () => api.getTabla(torneoId as number),
    ...opts,
    enabled: torneoId != null && (opts.enabled ?? true),
  });
}

export function useGoleadores(torneoId?: number, limit = 10, opts: QueryOpts = {}) {
  return useQuery({
    queryKey: qk.goleadores(torneoId ?? 0, limit),
    queryFn: () => api.getGoleadores(torneoId as number, limit),
    ...opts,
    enabled: torneoId != null && (opts.enabled ?? true),
  });
}

export function useAuditoria(limit = 20, opts: QueryOpts = {}) {
  return useQuery({ queryKey: qk.auditoria(limit), queryFn: () => api.getAuditoria(limit), ...opts });
}

// Datos para los reportes del panel de administración (totales y conteos).
export function useReporteResumen(opts: QueryOpts = {}) {
  return useQuery({ queryKey: qk.reporteResumen(), queryFn: () => api.getReporteResumen(), ...opts });
}

export function useParticipantesPorInstitucion(opts: QueryOpts = {}) {
  return useQuery({
    queryKey: qk.reporteParticipantes(),
    queryFn: () => api.getParticipantesPorInstitucion(),
    ...opts,
  });
}

export function useEquiposPorDeporte(opts: QueryOpts = {}) {
  return useQuery({
    queryKey: qk.reporteEquiposDeporte(),
    queryFn: () => api.getEquiposPorDeporte(),
    ...opts,
  });
}
