"use client";
import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { usePartidos } from "@/lib/hooks";
import type { Partido } from "@/types/api";
import { CardsSkeleton, Vacio } from "./Estados";

/** Orden oficial de las fases eliminatorias (ver backend competition.py). */
const FASES = ["Cuartos de Final", "Semifinales", "Final"] as const;

function MatchCard({ partido }: { partido: Partido }) {
  const finalizado = partido.estado === "finalizado";
  const l = partido.resultado_local;
  const v = partido.resultado_visitante;
  const localGana = finalizado && l != null && v != null && l > v;
  const visitGana = finalizado && l != null && v != null && v > l;

  const fila = (nombre: string, score: number | null, gana: boolean) => (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 ${gana ? "bg-slate-50" : ""}`}>
      <span className={`truncate text-sm ${gana ? "font-bold text-slate-900" : "text-slate-500"}`}>{nombre || "Por definir"}</span>
      <span className={`text-base font-black tabular-nums ${gana ? "text-red-600" : "text-slate-400"}`}>
        {finalizado ? score ?? "–" : "·"}
      </span>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {fila(partido.local_nombre, l, localGana)}
      <div className="border-t border-slate-100" />
      {fila(partido.visitante_nombre, v, visitGana)}
      {(partido.es_walkover || (!finalizado && partido.fecha_hora)) && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-1.5 text-[11px] font-medium text-slate-400">
          {partido.es_walkover
            ? "Walkover (W.O.)"
            : new Date(partido.fecha_hora as string).toLocaleDateString("es-PE", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
        </div>
      )}
    </div>
  );
}

// Llaves del torneo: agrupa los partidos por fase eliminatoria y los muestra
// en columnas (Cuartos → Semifinales → Final).
export default function BracketView({ torneoId }: { torneoId?: number }) {
  const { data, isLoading, isError } = usePartidos(torneoId != null ? { torneo_id: torneoId } : undefined, {
    enabled: torneoId != null,
  });

  const porFase = useMemo(() => {
    const map = new Map<string, Partido[]>();
    for (const p of data ?? []) {
      if (p.ronda && (FASES as readonly string[]).includes(p.ronda)) {
        const arr = map.get(p.ronda) ?? [];
        arr.push(p);
        map.set(p.ronda, arr);
      }
    }
    return map;
  }, [data]);

  if (torneoId == null) return <Vacio titulo="Selecciona un torneo" detalle="Elige un deporte y torneo para ver sus llaves." />;
  if (isLoading) return <CardsSkeleton items={3} />;
  if (isError) return <Vacio titulo="No se pudieron cargar las llaves" detalle="Intenta nuevamente en unos momentos." />;

  const fasesPresentes = FASES.filter((f) => (porFase.get(f)?.length ?? 0) > 0);
  if (fasesPresentes.length === 0) {
    return (
      <Vacio
        titulo="Este torneo aún no tiene fase eliminatoria"
        detalle="Las llaves aparecen cuando se genera la fase de cuartos, semifinales o final. Los torneos de liga no usan llaves: revisa la tabla de posiciones."
      />
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max items-stretch gap-6">
        {fasesPresentes.map((fase) => {
          const partidos = porFase.get(fase) ?? [];
          const esFinal = fase === "Final";
          return (
            <div key={fase} className="flex min-w-[240px] flex-col">
              <p className="mb-4 border-l-4 border-red-600 pl-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                {fase}
              </p>
              <div className="flex flex-1 flex-col justify-center gap-4">
                {partidos.map((p) => (
                  <div key={p.id}>
                    {esFinal && (
                      <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
                        <Trophy className="h-4 w-4" /> Gran Final
                      </div>
                    )}
                    <MatchCard partido={p} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
