"use client";
import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { usePartidos } from "@/lib/hooks";
import type { Partido } from "@/types/api";
import { CardsSkeleton, Vacio } from "./Estados";

const FASES = ["Cuartos de Final", "Semifinales", "Final"] as const;

function MatchCard({ partido }: { partido: Partido }) {
  const finalizado = partido.estado === "finalizado";
  const l = partido.resultado_local;
  const v = partido.resultado_visitante;
  const localGana = finalizado && l != null && v != null && l > v;
  const visitGana = finalizado && l != null && v != null && v > l;

  const fila = (nombre: string, score: number | null, gana: boolean) => (
    <div className={`flex items-center justify-between gap-3 px-4 py-2 ${gana ? "bg-red-50" : ""}`}>
      <span className={`truncate text-xs font-bold uppercase ${gana ? "text-red-700" : "text-slate-600"}`}>
        {nombre || "Por definir"}
      </span>
      <span className={`text-sm font-black tabular-nums ${gana ? "text-red-600" : "text-slate-400"}`}>
        {finalizado ? score ?? "–" : "·"}
      </span>
    </div>
  );

  return (
    <div className="w-64 overflow-hidden rounded-lg border-2 border-slate-900 bg-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
      {fila(partido.local_nombre, l, localGana)}
      <div className="border-t border-slate-200" />
      {fila(partido.visitante_nombre, v, visitGana)}
    </div>
  );
}

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

  return (
    <div className="overflow-x-auto pb-10">
      {/* Contenedor principal con espacio para los conectores */}
      <div className="flex min-w-max items-start gap-12 px-8 pt-8">
        {fasesPresentes.map((fase, colIndex) => {
          const partidos = porFase.get(fase) ?? [];
          const isLast = colIndex === fasesPresentes.length - 1;

          return (
            <div key={fase} className="flex flex-col items-center">
              <div className="mb-8 rounded-full bg-slate-900 px-6 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                {fase}
              </div>
              
              <div className="flex flex-col justify-center gap-12">
                {partidos.map((p) => (
                  <div key={p.id} className="relative flex items-center justify-center group">
                    <MatchCard partido={p} />
                    
                    {/* Conectores CSS tipo Bracket */}
                    {!isLast && (
                      <div className="absolute top-1/2 -right-8 h-[calc(100%+3rem)] w-8 border-t-2 border-r-2 border-slate-300 rounded-tr-lg" />
                    )}
                    {colIndex !== 0 && (
                      <div className="absolute top-1/2 -left-8 w-8 border-t-2 border-slate-300" />
                    )}
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