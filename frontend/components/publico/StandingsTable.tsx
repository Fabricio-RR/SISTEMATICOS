"use client";
import { useTabla } from "@/lib/hooks";
import type { PosicionTabla } from "@/types/api";
import { TablaSkeleton, Vacio } from "./Estados";

/** Colores de borde para las medallas del podio (oro/plata/bronce). */
const PODIO = ["border-l-amber-400", "border-l-slate-300", "border-l-orange-400"];

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

// Tabla de posiciones de un torneo. En modo `compacto` muestra solo el top 5
// (se usa como vista previa en el inicio).
export default function StandingsTable({ torneoId, compacto = false }: { torneoId?: number; compacto?: boolean }) {
  const { data, isLoading, isError } = useTabla(torneoId);

  if (torneoId == null) return <Vacio titulo="Selecciona un torneo" detalle="Elige un deporte y torneo para ver su tabla de posiciones." />;
  if (isLoading) return <TablaSkeleton filas={compacto ? 5 : 8} />;
  if (isError) return <Vacio titulo="No se pudo cargar la tabla" detalle="Intenta nuevamente en unos momentos." />;

  const filas: PosicionTabla[] = data ?? [];
  if (filas.length === 0) {
    return <Vacio titulo="Sin posiciones todavía" detalle="La tabla se actualizará cuando se registren resultados." />;
  }

  const visibles = compacto ? filas.slice(0, 5) : filas;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3 text-left">#</th>
              <th className="px-5 py-3 text-left">Equipo</th>
              <th className="px-3 py-3 text-center" title="Partidos jugados">PJ</th>
              <th className="px-3 py-3 text-center" title="Ganados">G</th>
              <th className="px-3 py-3 text-center" title="Empatados">E</th>
              <th className="px-3 py-3 text-center" title="Perdidos">P</th>
              {!compacto && <th className="hidden px-3 py-3 text-center sm:table-cell" title="Goles a favor">GF</th>}
              {!compacto && <th className="hidden px-3 py-3 text-center sm:table-cell" title="Goles en contra">GC</th>}
              <th className="px-3 py-3 text-center" title="Diferencia de goles">DIF</th>
              <th className="px-5 py-3 text-center">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visibles.map((fila, i) => {
              const podio = i < 3 ? PODIO[i] : "border-l-transparent";
              const dif = fila.diferencia_goles;
              return (
                <tr key={fila.equipo_id} className={`border-l-4 ${podio} transition-colors hover:bg-slate-50/60`}>
                  <td className="px-5 py-4">
                    <span className="text-lg font-black text-slate-300">{String(fila.posicion).padStart(2, "0")}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                        {iniciales(fila.nombre_equipo)}
                      </div>
                      <span className="font-semibold text-slate-900">{fila.nombre_equipo}</span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-center text-slate-600">{fila.partidos_jugados}</td>
                  <td className="px-3 py-4 text-center font-medium text-emerald-600">{fila.partidos_ganados}</td>
                  <td className="px-3 py-4 text-center text-slate-500">{fila.partidos_empatados}</td>
                  <td className="px-3 py-4 text-center font-medium text-red-500">{fila.partidos_perdidos}</td>
                  {!compacto && <td className="hidden px-3 py-4 text-center text-slate-500 sm:table-cell">{fila.goles_a_favor}</td>}
                  {!compacto && <td className="hidden px-3 py-4 text-center text-slate-500 sm:table-cell">{fila.goles_en_contra}</td>}
                  <td className="px-3 py-4 text-center font-medium text-slate-600">
                    {dif > 0 ? `+${dif}` : dif}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-block min-w-[2.5rem] rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-black text-white">
                      {fila.puntos}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
