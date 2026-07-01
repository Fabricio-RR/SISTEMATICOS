"use client";
import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { ESTADO_TORNEO_BADGE, ESTADO_TORNEO_LABEL } from "@/types/api";
import { useTorneoActual } from "./useTorneoActual";

/**
 * Barra de selección deporte + torneo. La selección se guarda en memoria
 * (TorneoProvider + localStorage) vía useTorneoActual, así que todas las rutas
 * públicas comparten el mismo torneo sin ensuciar la URL.
 */
export default function TorneoSelector() {
  const { deportes, torneos, deporte, torneo, seleccionarTorneo, cargando } = useTorneoActual();

  // Solo deportes que tienen al menos un torneo publicado.
  const deportesConTorneo = useMemo(
    () => deportes.filter((d) => torneos.some((t) => t.deporte_id === d.id)),
    [deportes, torneos],
  );

  const torneosDelDeporte = useMemo(
    () => torneos.filter((t) => t.deporte_id === torneo?.deporte_id),
    [torneos, torneo],
  );

  if (cargando) {
    return (
      <div className="h-12 flex items-center">
        <div className="h-8 w-48 rounded-lg bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (deportesConTorneo.length === 0) {
    return (
      <p className="text-sm text-slate-400">Aún no hay torneos publicados.</p>
    );
  }

  function elegirDeporte(deporteId: number) {
    const primero = torneos
      .filter((t) => t.deporte_id === deporteId)
      .sort((a, b) => (a.estado === "en_curso" ? -1 : 0) - (b.estado === "en_curso" ? -1 : 0))[0];
    if (primero) seleccionarTorneo(primero.id);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Chips de deportes */}
      <div className="flex flex-wrap gap-2">
        {deportesConTorneo.map((d) => {
          const activo = d.id === deporte?.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => elegirDeporte(d.id)}
              aria-pressed={activo}
              className={
                activo
                  ? "rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white"
                  : "rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
              }
            >
              {d.nombre}
            </button>
          );
        })}
      </div>

      {/* Selector de torneo del deporte activo */}
      {torneosDelDeporte.length > 0 && torneo && (
        <div className="flex items-center gap-2">
          {torneosDelDeporte.length === 1 ? (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              {torneo.nombre}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_TORNEO_BADGE[torneo.estado]}`}>
                {ESTADO_TORNEO_LABEL[torneo.estado]}
              </span>
            </span>
          ) : (
            <div className="relative">
              <select
                value={torneo.id}
                onChange={(e) => seleccionarTorneo(Number(e.target.value))}
                aria-label="Seleccionar torneo"
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-semibold text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                {torneosDelDeporte.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} · {ESTADO_TORNEO_LABEL[t.estado]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
