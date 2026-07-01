"use client";
import { useMemo } from "react";
import {
  Radio, Users, Calendar, Trophy,
  Building2, Shuffle, BarChart3,
  Clock, ArrowRight, UserPlus, UserMinus, UserCheck, Swords, FileText,
} from "lucide-react";
import Link from "next/link";
import { usePartidos, useAtletas, useDeportes, useAuditoria } from "@/lib/hooks";
import type { AuditoriaEntry, Partido } from "@/types/api";

function isImportant(entry: AuditoriaEntry): boolean {
  if (entry.tabla_afectada === "partidos" && entry.accion === "UPDATE") return true;
  if (entry.tabla_afectada === "inscripciones") return true;
  if (entry.tabla_afectada === "usuarios" && entry.accion === "UPDATE") return true;
  return false;
}

type Tone = "green" | "amber" | "red" | "gray";

interface ActivityItem {
  tone: Tone;
  icon: React.ReactNode;
  label: string;
  title?: string;
  detail?: string;
  score?: {
    local: string;
    visitante: string;
    golesLocal: number | null;
    golesVisitante: number | null;
    torneo?: string;
  };
}

const toneStyles: Record<Tone, { node: string; chip: string }> = {
  green: { node: "bg-green-50 border-green-200", chip: "bg-green-50 text-green-700" },
  amber: { node: "bg-amber-50 border-amber-200", chip: "bg-amber-50 text-amber-700" },
  red: { node: "bg-red-50 border-red-200", chip: "bg-red-50 text-red-600" },
  gray: { node: "bg-slate-50 border-slate-200", chip: "bg-slate-100 text-slate-500" },
};

// Convierte un registro crudo de auditoría en algo legible para una persona.
function parseActivity(entry: AuditoriaEntry, partidos: Map<number, Partido>): ActivityItem {
  // Resultado de un partido → mini-marcador con los nombres reales de los equipos.
  if (entry.tabla_afectada === "partidos" && entry.valor_nuevo) {
    try {
      const v = JSON.parse(entry.valor_nuevo);
      const p = partidos.get(v.partido_id);
      return {
        tone: "amber",
        icon: <Swords className="w-4 h-4 text-amber-600" />,
        label: "Resultado",
        score: {
          local: p?.local_nombre ?? "Local",
          visitante: p?.visitante_nombre ?? "Visitante",
          golesLocal: v.resultado_local ?? null,
          golesVisitante: v.resultado_visitante ?? null,
          torneo: p?.torneo_nombre,
        },
      };
    } catch {
      /* cae al genérico */
    }
  }

  const actor = entry.usuario_nombre ? `Por ${entry.usuario_nombre}` : undefined;
  const raw = entry.valor_nuevo ?? "";

  if (entry.tabla_afectada === "inscripciones") {
    if (/retirada/i.test(raw)) {
      const m = raw.match(/(\d+)\s+partido/);
      const n = m ? Number(m[1]) : 0;
      return {
        tone: "red",
        icon: <UserMinus className="w-4 h-4 text-red-500" />,
        label: "Inscripción",
        title: "Inscripción retirada",
        detail: n > 0 ? `${n} ${n === 1 ? "partido resuelto" : "partidos resueltos"} por W.O.` : "Sin partidos pendientes",
      };
    }
    return {
      tone: "green",
      icon: <UserPlus className="w-4 h-4 text-green-600" />,
      label: "Inscripción",
      title: "Inscripción aprobada",
      detail: actor,
    };
  }

  if (entry.tabla_afectada === "usuarios") {
    return {
      tone: "green",
      icon: <UserCheck className="w-4 h-4 text-green-600" />,
      label: "Usuario",
      title: "Cuenta aprobada",
      detail: actor,
    };
  }

  // Genérico para cualquier otra tabla.
  return {
    tone: "gray",
    icon: <FileText className="w-4 h-4 text-slate-400" />,
    label: entry.tabla_afectada,
    title: entry.accion === "INSERT" ? "Registro creado" : "Registro actualizado",
    detail: actor,
  };
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr + "Z").getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

function Scoreboard({ score }: { score: NonNullable<ActivityItem["score"]> }) {
  const { local, visitante, golesLocal, golesVisitante, torneo } = score;
  const finalizado = golesLocal !== null && golesVisitante !== null;
  const localGana = finalizado && (golesLocal as number) > (golesVisitante as number);
  const visitanteGana = finalizado && (golesVisitante as number) > (golesLocal as number);

  const equipo = (gana: boolean) =>
    gana ? "font-semibold text-slate-900" : "font-medium text-slate-500";

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-3">
        <span className={`min-w-0 flex-1 truncate text-sm ${equipo(localGana)}`}>{local}</span>
        <span className="flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1 text-sm font-bold tabular-nums text-white">
          <span>{golesLocal ?? "–"}</span>
          <span className="text-slate-500">:</span>
          <span>{golesVisitante ?? "–"}</span>
        </span>
        <span className={`min-w-0 flex-1 truncate text-right text-sm ${equipo(visitanteGana)}`}>{visitante}</span>
      </div>
      {torneo && <p className="mt-1 truncate text-xs text-slate-400">{torneo}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  // Refresco "EN VIVO": cada query se actualiza sola cada 30s y de forma independiente.
  const poll = { refetchInterval: 30_000 };
  const enCursoQ = usePartidos({ torneo_estado: "en_curso" }, poll);
  const programadosQ = usePartidos({ estado: "programado" }, poll);
  const atletasQ = useAtletas(undefined, undefined, undefined, poll);
  const deportesQ = useDeportes(false, poll);
  const auditoriaQ = useAuditoria(10, poll);
  // Todos los partidos: nos sirve para traducir IDs de auditoría a nombres de equipos.
  const partidosQ = usePartidos(undefined, poll);

  const partidoMap = useMemo(
    () => new Map((partidosQ.data ?? []).map((p) => [p.id, p])),
    [partidosQ.data]
  );

  const stats = {
    deportes: deportesQ.data?.length ?? 0,
    enCurso: enCursoQ.data?.length ?? 0,
    programados: programadosQ.data?.length ?? 0,
    atletas: atletasQ.data?.length ?? 0,
  };
  const actividad: AuditoriaEntry[] = auditoriaQ.data ?? [];
  const cargando = auditoriaQ.isLoading;
  // Si alguna métrica falla, las demás siguen mostrándose; solo avisamos del fallo parcial.
  const hayError =
    enCursoQ.isError || programadosQ.isError || atletasQ.isError || deportesQ.isError || auditoriaQ.isError;

  const actividadImportante = actividad.filter(isImportant);

  return (
    <div className="space-y-6">
      {hayError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          No se pudo conectar con el servidor. Verifica que el backend esté activo.
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Panel de control</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">Resumen general</h1>
        </div>
        <Link
          href="/admin/encuentros"
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Nuevo evento
        </Link>
      </div>

      {/* Stats — una sola fila con las 4 métricas clave */}
      <div className="grid grid-cols-4 gap-5">
        {/* EN VIVO */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600">
              <Radio className="h-4 w-4 text-white" />
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              EN VIVO
            </span>
          </div>
          <p className="text-3xl font-bold tabular-nums text-slate-900">{stats.enCurso}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">Partidos en curso</p>
        </div>

        {[
          { icon: Calendar, valor: stats.programados, label: "Encuentros pendientes", iconBg: "bg-amber-100", iconColor: "text-amber-600" },
          { icon: Users, valor: stats.atletas, label: "Atletas registrados", iconBg: "bg-blue-100", iconColor: "text-blue-600" },
          { icon: Trophy, valor: stats.deportes, label: "Deportes activos", iconBg: "bg-green-100", iconColor: "text-green-600" },
        ].map(({ icon: Icon, valor, label, iconBg, iconColor }) => (
          <div key={label} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
                <Icon className={`h-4 w-4 ${iconColor}`} />
              </div>
            </div>
            <p className="text-3xl font-bold tabular-nums text-slate-900">{valor}</p>
            <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-3 gap-5">
        {[
          {
            icon: Building2,
            titulo: "Gestión de Instituciones",
            desc: "Inscribe colegios, universidades y clubes. Gestiona los rosters.",
            link: "/admin/instituciones",
            cta: "Abrir consola",
          },
          {
            icon: Shuffle,
            titulo: "Organizador de Fixtures",
            desc: "Emparejamientos, sorteos automatizados y gestión de horarios.",
            link: "/admin/sorteos",
            cta: "Iniciar organizador",
          },
          {
            icon: BarChart3,
            titulo: "Resultados y Estadísticas",
            desc: "Ingreso de puntajes en tiempo real y tablas de posiciones.",
            link: "/admin/resultados",
            cta: "Ver estadísticas",
          },
        ].map(({ icon: Icon, titulo, desc, link, cta }) => (
          <Link
            key={link}
            href={link}
            className="group rounded-xl border border-slate-100 bg-white p-5 transition-all hover:border-slate-200 hover:shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
              <Icon className="h-4 w-4 text-red-600" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">{titulo}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{desc}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 transition-all group-hover:gap-2.5">
              {cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>

      {/* Actividad reciente — solo lo importante */}
      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-50 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Actividad reciente</h2>
          {cargando && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
          )}
        </div>

        {actividadImportante.length === 0 && !cargando ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Clock className="mb-3 h-8 w-8 text-slate-200" strokeWidth={1.5} />
            <p className="text-sm font-medium text-slate-400">Sin actividad reciente</p>
            <p className="mt-1 text-xs text-slate-300">Los cambios en el sistema aparecerán aquí</p>
          </div>
        ) : (
          <div className="relative px-6 py-2">
            {/* Línea vertical del timeline */}
            <div className="absolute left-[2.625rem] top-7 bottom-7 w-px bg-slate-100" />

            {actividadImportante.slice(0, 8).map((entry) => {
              const item = parseActivity(entry, partidoMap);
              const styles = toneStyles[item.tone];
              return (
                <div key={entry.id} className="relative flex items-start gap-4 py-3">
                  {/* Nodo */}
                  <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ring-4 ring-white ${styles.node}`}>
                    {item.icon}
                  </div>

                  {/* Contenido */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles.chip}`}>
                        {item.label}
                      </span>
                      <span className="text-xs font-medium text-slate-300">{relativeTime(entry.creado_en)}</span>
                    </div>

                    {item.score ? (
                      <Scoreboard score={item.score} />
                    ) : (
                      <>
                        <p className="mt-1 text-sm font-medium text-slate-700">{item.title}</p>
                        {item.detail && <p className="text-xs text-slate-400">{item.detail}</p>}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
