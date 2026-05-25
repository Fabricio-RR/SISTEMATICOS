"use client";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  Radio, Users, Calendar, Trophy,
  Building2, Shuffle, BarChart3,
  Clock, ArrowRight, Edit3, UserPlus, FileText,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AuditoriaEntry } from "@/types/api";

interface Stats {
  deportes: number;
  enCurso: number;
  programados: number;
  atletas: number;
}

// Funciones puras 
function isImportant(entry: AuditoriaEntry): boolean {
  if (entry.tabla_afectada === "partidos" && entry.accion === "UPDATE") return true;
  if (entry.tabla_afectada === "inscripciones") return true;
  if (entry.tabla_afectada === "usuarios" && entry.accion === "UPDATE") return true;
  return false;
}

function formatActivity(entry: AuditoriaEntry): { icon: React.ReactNode; label: string; subtitle: string } {
  const icons: Record<string, React.ReactNode> = {
    INSERT: <UserPlus className="w-4 h-4 text-green-500" />,
    UPDATE: <Edit3 className="w-4 h-4 text-amber-500" />,
  };

  const tablas: Record<string, string> = {
    partidos: "Partido",
    inscripciones: "Inscripción",
    usuarios: "Usuario",
  };

  const accionLabel: Record<string, string> = {
    INSERT: "creó",
    UPDATE: "actualizó",
  };

  const tableLabel = tablas[entry.tabla_afectada] || entry.tabla_afectada;
  const action = accionLabel[entry.accion] || entry.accion;

  let subtitle = `${action} en ${tableLabel}`;
  if (entry.usuario_nombre) {
    subtitle = `${entry.usuario_nombre} ${subtitle}`;
  }

  let extraInfo = "";
  if (entry.valor_nuevo) {
    try {
      const parsed = JSON.parse(entry.valor_nuevo);
      if (typeof parsed === "object" && parsed !== null) {
        const parts: string[] = [];
        if (parsed.partido_id !== undefined) parts.push(`Partido ${parsed.partido_id}`);
        if (parsed.inscripcion_id !== undefined) parts.push(`ID ${parsed.inscripcion_id}`);
        if (parsed.usuario_id !== undefined) parts.push(`ID ${parsed.usuario_id}`);
        if (parsed.torneo_id !== undefined) parts.push(`Torneo ${parsed.torneo_id}`);
        if (parsed.estado !== undefined) parts.push(parsed.estado);
        if (parsed.resultado_local !== undefined && parsed.resultado_visitante !== undefined) {
          parts.push(`${parsed.resultado_local} - ${parsed.resultado_visitante}`);
        }
        if (parts.length > 0) extraInfo = parts.join(" · ");
      }
    } catch {
      extraInfo = entry.valor_nuevo.length > 40 ? entry.valor_nuevo.slice(0, 40) + "..." : entry.valor_nuevo;
    }
  }

  return {
    icon: icons[entry.accion] || <FileText className="w-4 h-4 text-gray-400" />,
    label: tableLabel,
    subtitle: extraInfo || subtitle,
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

// COMPONENTE PRINCIPAL
export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    deportes: 0, enCurso: 0, programados: 0, atletas: 0,
  });
  const [actividad, setActividad] = useState<AuditoriaEntry[]>([]);
  const [error, setError] = useState("");
  
  // Para la carga inicial (determina si mostramos Skeletons)
  const [cargandoInicial, setCargandoInicial] = useState(true);
  // Para mostrar el spinner sutil en el header
  const [actualizando, setActualizando] = useState(false);

  const errorRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Lógica de Obtención de Datos y Polling Seguro 
  const fetchData = useCallback(async () => {
    setActualizando(true);
    try {
      const [enCurso, programados, atletas, deportes, auditoriaLogs] = await Promise.all([
        api.getPartidos({ torneo_estado: "en_curso" }),
        api.getPartidos({ estado: "programado" }),
        api.getAtletas(),
        api.getDeportes(),
        api.getAuditoria(10),
      ]);
      
      setStats({
        deportes: deportes.length,
        enCurso: enCurso.length,
        programados: programados.length,
        atletas: atletas.length,
      });
      setActividad(auditoriaLogs);
      setError("");
      errorRef.current = false;
    } catch {
      if (!errorRef.current) {
        setError("No se pudo conectar con el servidor. Verifica que el backend esté activo.");
        errorRef.current = true;
      }
    } finally {
      setCargandoInicial(false);
      setActualizando(false);
      
      // Programamos la siguiente ejecución SOLO cuando esta haya terminado
      timeoutRef.current = setTimeout(fetchData, 30_000);
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [fetchData]);

  // --- Optimización: Filtrado de Actividad Memoizado ---
  const actividadesImportantes = useMemo(() => {
    return actividad.filter(isImportant).slice(0, 8);
  }, [actividad]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 animate-in fade-in">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Panel de control</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Resumen general</h1>
            {!cargandoInicial && actualizando && (
              <div className="w-4 h-4 mt-1 border-2 border-red-500 border-t-transparent rounded-full animate-spin" title="Actualizando en vivo..." />
            )}
          </div>
        </div>
        <Link
          href="/admin/encuentros"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Nuevo evento
        </Link>
      </div>

      {/* Stats — Grilla Responsiva */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-500">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              EN VIVO
            </span>
          </div>
          {cargandoInicial ? (
            <div className="h-9 w-16 bg-gray-100 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">{stats.enCurso}</p>
          )}
          <p className="text-sm font-medium text-gray-500 mt-1">Partidos en curso</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          {cargandoInicial ? (
            <div className="h-9 w-16 bg-gray-100 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">{stats.programados}</p>
          )}
          <p className="text-sm font-medium text-gray-500 mt-1">Encuentros pendientes</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="mb-4">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          {cargandoInicial ? (
            <div className="h-9 w-16 bg-gray-100 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">{stats.atletas}</p>
          )}
          <p className="text-sm font-medium text-gray-500 mt-1">Atletas registrados</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="mb-4">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-green-600" />
            </div>
          </div>
          {cargandoInicial ? (
            <div className="h-9 w-16 bg-gray-100 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">{stats.deportes}</p>
          )}
          <p className="text-sm font-medium text-gray-500 mt-1">Deportes activos</p>
        </div>
      </div>

      {/* Accesos rápidos — Grilla Responsiva */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
            className="group bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center mb-4">
              <Icon className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">{titulo}</h3>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{desc}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 group-hover:gap-2 transition-all">
              {cta}
              <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        ))}
      </div>

      {/* Actividad reciente */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30">
          <h2 className="text-sm font-semibold text-gray-900">Actividad reciente</h2>
        </div>

        {cargandoInicial ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-3.5 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                </div>
                <div className="h-2.5 bg-gray-100 rounded w-12 shrink-0" />
              </div>
            ))}
          </div>
        ) : actividadesImportantes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Clock className="w-8 h-8 text-gray-200 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-gray-400">Sin actividad reciente</p>
            <p className="text-xs text-gray-300 mt-1">Los cambios relevantes en el sistema aparecerán aquí</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {actividadesImportantes.map((entry) => {
              const { icon, label, subtitle } = formatActivity(entry);
              return (
                <div key={entry.id} className="flex items-center gap-3 px-6 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700 truncate">{label}</p>
                    <p className="text-xs text-gray-400 truncate">{subtitle}</p>
                  </div>
                  <span className="text-xs text-gray-400 font-medium shrink-0 bg-gray-50 px-2 py-1 rounded-md">
                    {relativeTime(entry.creado_en)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}