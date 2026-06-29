"use client";
import { MapPin } from "lucide-react";
import type { Partido } from "@/types/api";
import { usePartidoModal } from "./PartidoModalContext";

export function fechaHora(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      En vivo
    </span>
  );
}

function etiquetaFase(p: Partido) {
  if (p.es_walkover) return "W.O.";
  return p.ronda || (p.jornada ? `Jornada ${p.jornada}` : "Fase");
}

// Tarjeta de un partido. Se adapta al estado (programado / en vivo / finalizado)
// y al hacer clic abre el modal de detalle.
export default function PartidoCard({ partido }: { partido: Partido }) {
  const { abrir } = usePartidoModal();
  const enVivo = partido.estado === "en_curso";
  const finalizado = partido.estado === "finalizado";
  const mostrarMarcador = enVivo || finalizado;

  const l = partido.resultado_local;
  const v = partido.resultado_visitante;
  const localGana = finalizado && l != null && v != null && l > v;
  const visitGana = finalizado && l != null && v != null && v > l;

  const fila = (nombre: string, score: number | null, gana: boolean) => (
    <div className="flex items-center justify-between gap-3">
      <span className={`truncate text-sm ${gana ? "font-bold text-slate-900" : "text-slate-600"}`}>{nombre || "Por definir"}</span>
      {mostrarMarcador ? (
        <span className={`text-xl font-black tabular-nums ${gana ? "text-red-600" : enVivo ? "text-slate-900" : "text-slate-400"}`}>
          {score ?? 0}
        </span>
      ) : null}
    </div>
  );

  return (
    <button
      type="button"
      onClick={() => abrir(partido)}
      className={`w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        enVivo ? "border-red-200 ring-1 ring-red-100" : "border-slate-200"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-red-600">{partido.torneo_nombre || "Torneo"}</span>
        {enVivo ? <LiveBadge /> : <span className="whitespace-nowrap text-xs text-slate-400">{etiquetaFase(partido)}</span>}
      </div>

      <div className="space-y-3">
        {fila(partido.local_nombre, l, localGana)}
        {!mostrarMarcador && <div className="text-center text-xs font-bold text-slate-300">VS</div>}
        {fila(partido.visitante_nombre, v, visitGana)}
      </div>

      {(partido.fecha_hora || partido.sede_nombre) && (
        <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
          {partido.fecha_hora && <span>{fechaHora(partido.fecha_hora)}</span>}
          {partido.sede_nombre && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {partido.sede_nombre}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
