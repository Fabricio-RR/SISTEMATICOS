"use client";
import { useGoleadores } from "@/lib/hooks";
import { TablaSkeleton, Vacio } from "./Estados";

function iniciales(nombre: string) {
  return (
    nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  );
}

const PODIO = ["text-amber-500", "text-slate-400", "text-orange-400"];

// Ranking de goleadores de un torneo (goles y tarjetas), con podio en el top 3.
export default function GoleadoresTable({ torneoId, limit = 10 }: { torneoId?: number; limit?: number }) {
  const { data, isLoading, isError } = useGoleadores(torneoId, limit);

  if (torneoId == null) return <Vacio titulo="Selecciona un torneo" detalle="Elige un torneo para ver sus goleadores." />;
  if (isLoading) return <TablaSkeleton filas={5} />;
  if (isError) return <Vacio titulo="No se pudieron cargar los goleadores" />;

  const filas = data ?? [];
  if (filas.length === 0) {
    return <Vacio titulo="Sin goleadores todavía" detalle="Aparecerán cuando se registren goles o puntos en los partidos." />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <ul className="divide-y divide-slate-50">
        {filas.map((g, i) => (
          <li key={g.atleta_id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/60">
            <span className={`w-6 text-center text-lg font-black ${i < 3 ? PODIO[i] : "text-slate-300"}`}>{g.posicion}</span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {iniciales(g.nombre_completo)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{g.nombre_completo}</p>
              <p className="truncate text-xs text-slate-400">{g.nombre_equipo}</p>
            </div>
            {(g.tarjetas_amarillas > 0 || g.tarjetas_rojas > 0) && (
              <div className="hidden items-center gap-1.5 sm:flex">
                {g.tarjetas_amarillas > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <span className="inline-block h-3 w-2 rounded-[2px] bg-amber-400" />
                    {g.tarjetas_amarillas}
                  </span>
                )}
                {g.tarjetas_rojas > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <span className="inline-block h-3 w-2 rounded-[2px] bg-red-600" />
                    {g.tarjetas_rojas}
                  </span>
                )}
              </div>
            )}
            <div className="text-right">
              <span className="font-display text-xl font-black tabular-nums text-slate-900">{g.goles}</span>
              <span className="ml-1 text-xs font-medium text-slate-400">{g.etiqueta || "goles"}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
