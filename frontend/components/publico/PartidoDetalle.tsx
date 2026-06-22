"use client";
import { useEffect, useMemo } from "react";
import { X, MapPin, CalendarDays } from "lucide-react";
import { useAtletas } from "@/lib/hooks";
import type { EventoPartidoOut, Partido } from "@/types/api";
import { usePartidoModal } from "./PartidoModalContext";
import { fechaHora, LiveBadge } from "./PartidoCard";

function IconoEvento({ tipo }: { tipo: string }) {
  if (tipo === "tarjeta_amarilla") return <span className="inline-block h-3.5 w-2.5 rounded-[2px] bg-amber-400" />;
  if (tipo === "tarjeta_roja") return <span className="inline-block h-3.5 w-2.5 rounded-[2px] bg-red-600" />;
  return <span className="text-sm">⚽</span>; // gol / puntos
}

function etiquetaEvento(tipo: string) {
  switch (tipo) {
    case "gol": return "Gol";
    case "puntos": return "Puntos";
    case "tarjeta_amarilla": return "Tarjeta amarilla";
    case "tarjeta_roja": return "Tarjeta roja";
    default: return tipo;
  }
}

function Contenido({ partido, cerrar }: { partido: Partido; cerrar: () => void }) {
  const localId = partido.local_club_equipo_id ?? undefined;
  const visitId = partido.visitante_club_equipo_id ?? undefined;

  const localQ = useAtletas(localId, undefined, undefined, { enabled: localId != null });
  const visitQ = useAtletas(visitId, undefined, undefined, { enabled: visitId != null });

  // Mapa atleta_id -> nombre, para resolver los eventos.
  const nombrePorAtleta = useMemo(() => {
    const m = new Map<number, string>();
    for (const a of localQ.data ?? []) m.set(a.id, a.nombre_completo);
    for (const a of visitQ.data ?? []) m.set(a.id, a.nombre_completo);
    return m;
  }, [localQ.data, visitQ.data]);

  const enVivo = partido.estado === "en_curso";
  const programado = partido.estado === "programado";
  const eventos = [...(partido.eventos ?? [])].sort((a, b) => (a.minuto ?? 0) - (b.minuto ?? 0));

  const score = (n: number | null) => (programado ? "" : n ?? 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-rise w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Cabecera */}
      <div className="relative bg-slate-900 px-6 py-5 text-white">
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <span className="text-red-400">{partido.torneo_nombre || "Torneo"}</span>
          <span>·</span>
          <span>{partido.es_walkover ? "W.O." : partido.ronda || (partido.jornada ? `Jornada ${partido.jornada}` : "Fase")}</span>
          {enVivo && <span className="ml-1"><LiveBadge /></span>}
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <span className="truncate text-right font-display text-lg font-bold">{partido.local_nombre || "Por definir"}</span>
          <span className="text-center font-display text-3xl font-black tabular-nums">
            {programado ? "vs" : `${score(partido.resultado_local)} – ${score(partido.resultado_visitante)}`}
          </span>
          <span className="truncate text-left font-display text-lg font-bold">{partido.visitante_nombre || "Por definir"}</span>
        </div>
      </div>

      {/* Datos */}
      <div className="space-y-1 border-b border-slate-100 px-6 py-4 text-sm text-slate-500">
        {partido.fecha_hora && (
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            {fechaHora(partido.fecha_hora)}
          </p>
        )}
        {partido.sede_nombre && (
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            {partido.sede_nombre}
          </p>
        )}
      </div>

      {/* Eventos */}
      <div className="max-h-[45vh] overflow-y-auto px-6 py-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Incidencias</p>
        {eventos.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {programado ? "El partido aún no comienza." : "Sin incidencias registradas."}
          </p>
        ) : (
          <ul className="space-y-3">
            {eventos.map((e: EventoPartidoOut) => (
              <li key={e.id} className="flex items-center gap-3">
                <span className="w-9 shrink-0 text-right text-sm font-bold tabular-nums text-slate-400">
                  {e.minuto != null ? `${e.minuto}'` : "—"}
                </span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center"><IconoEvento tipo={e.tipo_evento} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {e.atleta_jugador_id != null ? nombrePorAtleta.get(e.atleta_jugador_id) ?? "Jugador" : "—"}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {etiquetaEvento(e.tipo_evento)}
                    {e.descripcion ? ` · ${e.descripcion}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Modal con el detalle de un partido: marcador, sede, fecha y la línea de
// incidencias (goles y tarjetas con el nombre del jugador).
export default function PartidoDetalle() {
  const { partido, cerrar } = usePartidoModal();

  // Cerrar con Escape y bloquear el scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!partido) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [partido, cerrar]);

  if (!partido) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={cerrar}
    >
      <Contenido partido={partido} cerrar={cerrar} />
    </div>
  );
}
