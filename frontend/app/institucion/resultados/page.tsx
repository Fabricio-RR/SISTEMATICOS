"use client";
import { useEffect, useState, useCallback } from "react";
import { BarChart3, Filter, Trophy, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Torneo, PosicionTabla, Goleador } from "@/types/api";

export default function InstitucionResultadosPage() {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [torneoId, setTorneoId] = useState<number | null>(null);
  const [tabla, setTabla] = useState<PosicionTabla[]>([]);
  const [goleadores, setGoleadores] = useState<Goleador[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getTorneos().then(setTorneos).catch(() => {});
  }, []);

  const cargar = useCallback(async (id: number) => {
    setCargando(true);
    setError("");
    try {
      const [t, g] = await Promise.all([api.getTabla(id), api.getGoleadores(id)]);
      setTabla(t);
      setGoleadores(g);
    } catch {
      setError("No se pudieron cargar las estadísticas.");
    } finally {
      setCargando(false);
    }
  }, []);

  function handleTorneo(id: number) {
    setTorneoId(id);
    setTabla([]);
    setGoleadores([]);
    if (id) cargar(id);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Portal institucional</p>
        <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">Estadísticas</h1>
        <p className="text-sm text-slate-400 mt-0.5">Tabla de posiciones y goleadores por torneo.</p>
      </div>

      {/* Selector */}
      <div className="relative w-fit">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <select
          value={torneoId ?? ""}
          onChange={(e) => handleTorneo(Number(e.target.value))}
          className="pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">Seleccionar torneo</option>
          {torneos.map((t) => (
            <option key={t.id} value={t.id}>{t.nombre} — {t.temporada}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {!torneoId ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-300">
          <BarChart3 className="w-10 h-10 mb-3" strokeWidth={1.5} />
          <p className="text-sm text-slate-400">Selecciona un torneo para ver las estadísticas</p>
        </div>
      ) : cargando ? (
        <div className="flex items-center justify-center h-48 text-sm text-slate-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tabla de posiciones */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Tabla de posiciones</h2>
                <span className="text-xs text-slate-400">{tabla.length} equipos</span>
              </div>
              {tabla.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-slate-400">
                  Sin equipos aprobados en este torneo
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["Pos", "Equipo", "PJ", "G", "E", "P", "GF", "GC", "DIF", "PTS"].map((h) => (
                        <th
                          key={h}
                          className={`py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider ${h === "Equipo" ? "text-left px-4" : "text-center px-3"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tabla.map((fila) => (
                      <tr key={fila.equipo_id} className="hover:bg-slate-50 transition-colors">
                        <td className="text-center px-3 py-3">
                          {fila.posicion === 1
                            ? <Trophy className="w-4 h-4 text-yellow-500 mx-auto" />
                            : <span className="text-sm font-semibold text-slate-400">{fila.posicion}</span>}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{fila.nombre_equipo}</td>
                        <td className="text-center px-3 py-3 text-sm text-slate-600">{fila.partidos_jugados}</td>
                        <td className="text-center px-3 py-3 text-sm text-slate-600">{fila.partidos_ganados}</td>
                        <td className="text-center px-3 py-3 text-sm text-slate-600">{fila.partidos_empatados}</td>
                        <td className="text-center px-3 py-3 text-sm text-slate-600">{fila.partidos_perdidos}</td>
                        <td className="text-center px-3 py-3 text-sm text-slate-600">{fila.goles_a_favor}</td>
                        <td className="text-center px-3 py-3 text-sm text-slate-600">{fila.goles_en_contra}</td>
                        <td className="text-center px-3 py-3 text-sm font-semibold text-slate-700">
                          {fila.diferencia_goles > 0 ? `+${fila.diferencia_goles}` : fila.diferencia_goles}
                        </td>
                        <td className="text-center px-3 py-3">
                          <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">{fila.puntos}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Líderes individuales */}
          <div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50">
                <h2 className="text-sm font-semibold text-slate-900">
                  {goleadores[0]?.etiqueta === "Puntos" ? "Anotadores" : "Goleadores"}
                </h2>
              </div>
              {goleadores.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-slate-400 px-4 text-center">
                  Sin estadísticas individuales aún
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {goleadores.map((g) => (
                    <div key={g.atleta_id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-semibold text-slate-300 w-5 shrink-0 text-right">{g.posicion}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{g.nombre_completo}</p>
                          <p className="text-xs text-slate-400 truncate">{g.nombre_equipo}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-sm font-bold text-red-600">{g.goles}</p>
                        <p className="text-[10px] text-slate-400">{g.etiqueta.toLowerCase()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
