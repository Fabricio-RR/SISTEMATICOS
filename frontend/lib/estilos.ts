import type { EstadoTorneo, EstadoInscripcion, EstadoPartido } from "@/types/api";

/**
 * Fuente única de verdad para los colores de estado del sistema.
 * En vez de definir paletas inline en cada página, se mapea cada estado a un
 * "tono" semántico y aquí viven las clases. Unifica admin/público (neutral = slate).
 */
export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand" | "special";

export const TONE: Record<Tone, { badge: string; dot: string; soft: string }> = {
  success: { badge: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-700" },
  warning: { badge: "bg-amber-50 text-amber-700 border-amber-100",       dot: "bg-amber-500",   soft: "bg-amber-50 text-amber-700" },
  danger:  { badge: "bg-red-50 text-red-700 border-red-100",             dot: "bg-red-500",     soft: "bg-red-50 text-red-700" },
  info:    { badge: "bg-blue-50 text-blue-700 border-blue-100",          dot: "bg-blue-500",    soft: "bg-blue-50 text-blue-700" },
  neutral: { badge: "bg-slate-100 text-slate-600 border-slate-200",      dot: "bg-slate-400",   soft: "bg-slate-100 text-slate-600" },
  brand:   { badge: "bg-brand-50 text-brand-700 border-brand-100",       dot: "bg-brand-500",   soft: "bg-brand-50 text-brand-700" },
  special: { badge: "bg-violet-50 text-violet-700 border-violet-100",    dot: "bg-violet-500",  soft: "bg-violet-50 text-violet-700" },
};

export const ESTADO_PARTIDO_TONE: Record<EstadoPartido, Tone> = {
  programado: "info",
  en_curso: "warning",
  finalizado: "success",
};

export const ESTADO_TORNEO_TONE: Record<EstadoTorneo, Tone> = {
  inscripcion_abierta: "info",
  inscripcion_cerrada: "warning",
  en_sorteo: "special",
  en_curso: "success",
  finalizado: "neutral",
  suspendido: "danger",
};

export const ESTADO_INSCRIPCION_TONE: Record<EstadoInscripcion, Tone> = {
  pendiente: "warning",
  aprobado: "success",
  rechazado: "danger",
  retirado: "neutral",
};

export const ESTADO_INSCRIPCION_LABEL: Record<EstadoInscripcion, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  retirado: "Retirado",
};
