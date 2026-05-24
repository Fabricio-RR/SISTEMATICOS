"use client";
import { useEffect, useState, useCallback } from "react";
import { BarChart3, RefreshCw, Filter, AlertCircle, X, Trophy, Users, Swords } from "lucide-react";
import { api } from "@/lib/api";
import type { Torneo, PosicionTabla, Goleador, Partido, Deporte } from "@/types/api";

type Tab = "tabla" | "goleadores" | "partidos";

export default function ResultadosPage() {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [torneoId, setTorneoId] = useState<number | undefined>();
  const [tab, setTab] = useState<Tab>("tabla");
  const [tabla, setTabla] = useState<PosicionTabla[]>([]);
  const [goleadores, setGoleadores] = useState<Goleador[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const depMap = new Map(deportes.map(d => [d.id, d]));

  function esFutbol(torneo: Torneo | undefined): boolean {
    if (!torneo) return false;
    const dep = depMap.get(torneo.deporte_id);
    if (!dep) return false;
    const n = dep.nombre.toLowerCase();
    return n.includes("fútbol") || n.includes("futbol");
  }

  const cargar = useCallback(async () => {
    setCargando(true); setError("");
    try {
      const [t, deps] = await Promise.all([api.getTorneos(), api.getDeportes()]);
      setTorneos(t);
      setDeportes(deps);
    } catch { setError("No se pudo cargar los torneos."); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const cargarStats = useCallback(async (id: number) => {
    setCargando(true); setError("");
    try {
      const [tabData, golData, partData] = await Promise.all([
        api.getTabla(id),
        api.getGoleadores(id),
        api.getPartidos({ torneo_id: id }),
      ]);
      setTabla(tabData);
      setGoleadores(golData);
      setPartidos(partData.filter(p => p.estado === "finalizado"));
    } catch { setError("No se pudieron cargar las estadísticas."); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => {
    if (torneoId) cargarStats(torneoId);
    else { setTabla([]); setGoleadores([]); setPartidos([]); }
  }, [torneoId, cargarStats]);

  const torneoSeleccionado = torneos.find(t => t.id === torneoId);
  const esFut = esFutbol(torneoSeleccionado);

  const posBadge = (pos: number) =>
    pos === 1 ? "bg-amber-400 text-white ring-2 ring-amber-200"
    : pos === 2 ? "bg-gray-400 text-white"
    : pos === 3 ? "bg-orange-500 text-white"
    : "bg-gray-100 text-gray-500";

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "tabla", label: "Tabla de posiciones", icon: <Trophy className="w-4 h-4" /> },
    { key: "goleadores", label: esFut ? "Goleadores" : "Anotadores", icon: <Users className="w-4 h-4" /> },
    { key: "partidos", label: "Partidos finalizados", icon: <Swords className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Resultados</h1>
          <p className="text-sm text-gray-400 mt-0.5">Consulta tablas de posiciones, goleadores e historial de partidos.</p>
        </div>
        <button onClick={cargar} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError("")} className="ml-auto"><X className="w-4 h-4 text-red-400 hover:text-red-600" /></button>
        </div>
      )}

      {/* Selector de torneo */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400 shrink-0" />
        <select
          value={torneoId ?? ""}
          onChange={e => { setTorneoId(e.target.value ? Number(e.target.value) : undefined); setTab("tabla"); }}
          className="flex-1 text-sm bg-transparent focus:outline-none text-gray-800 font-medium cursor-pointer"
        >
          <option value="">— Seleccionar torneo —</option>
          {torneos.filter(t => t.estado !== "suspendido").map(t => (
            <option key={t.id} value={t.id}>{t.nombre} · {t.temporada}</option>
          ))}
        </select>
        {torneoId && torneoSeleccionado && (
          <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
            torneoSeleccionado.estado === "en_curso" ? "bg-green-100 text-green-700"
            : torneoSeleccionado.estado === "finalizado" ? "bg-gray-100 text-gray-600"
            : torneoSeleccionado.estado === "suspendido" ? "bg-red-100 text-red-700"
            : "bg-blue-100 text-blue-700"
          }`}>
            {torneoSeleccionado.estado.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {!torneoId ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
          <BarChart3 className="w-12 h-12 text-gray-200" strokeWidth={1.5} />
          <p className="text-sm">Selecciona un torneo para ver las estadísticas</p>
        </div>
      ) : cargando ? (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm flex items-center justify-center h-64 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            Cargando...
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition ${
                  tab === t.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Contenido */}
          {tab === "tabla" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-bold text-gray-900">Tabla de posiciones</h2>
                </div>
                <span className="text-xs text-gray-400">{tabla.length} equipos</span>
              </div>
              {tabla.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-gray-400">Sin datos aún</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        {["Pos", "Equipo", "PJ", "G", "E", "P", "GF", "GC", "DIF", "PTS"].map((h) => (
                          <th
                            key={h}
                            className={`py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider ${h === "Equipo" ? "text-left px-4" : "text-center px-3"}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {tabla.map((fila) => (
                        <tr key={fila.equipo_id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="text-center px-3 py-3">
                            {fila.posicion === 1
                              ? <Trophy className="w-4 h-4 text-yellow-500 mx-auto" />
                              : <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-black ${posBadge(fila.posicion)}`}>{fila.posicion}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{fila.nombre_equipo}</td>
                          <td className="text-center px-3 py-3 text-sm text-gray-600">{fila.partidos_jugados}</td>
                          <td className="text-center px-3 py-3 text-sm text-gray-600">{fila.partidos_ganados}</td>
                          <td className="text-center px-3 py-3 text-sm text-gray-600">{fila.partidos_empatados}</td>
                          <td className="text-center px-3 py-3 text-sm text-gray-600">{fila.partidos_perdidos}</td>
                          <td className="text-center px-3 py-3 text-sm text-gray-600">{fila.goles_a_favor}</td>
                          <td className="text-center px-3 py-3 text-sm text-gray-600">{fila.goles_en_contra}</td>
                          <td className="text-center px-3 py-3 text-sm font-semibold text-gray-700">
                            {fila.diferencia_goles > 0 ? `+${fila.diferencia_goles}` : fila.diferencia_goles}
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">{fila.puntos}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "goleadores" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <h2 className="text-sm font-bold text-gray-900">{esFut ? "Goleadores" : "Anotadores"}</h2>
                </div>
                <span className="text-xs text-gray-400">Top {goleadores.length}</span>
              </div>
              {goleadores.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-gray-400">Sin estadísticas individuales aún</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {goleadores.map((g) => (
                    <div key={g.atleta_id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/40 transition-colors">
                      <span className="text-sm font-semibold text-gray-300 w-6 shrink-0 text-right">{g.posicion}</span>
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{g.nombre_completo}</p>
                        <p className="text-xs text-gray-400 truncate">{g.nombre_equipo}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-lg font-bold text-red-600">{g.goles}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{g.etiqueta.toLowerCase()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "partidos" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-emerald-500" />
                  <h2 className="text-sm font-bold text-gray-900">Partidos finalizados</h2>
                </div>
                <span className="text-xs text-gray-400">{partidos.length} partidos</span>
              </div>
              {partidos.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-gray-400">Sin partidos finalizados aún</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {partidos.map((p) => {
                    const jornada = p.ronda ?? `Jornada ${p.jornada}`;
                    return (
                      <div key={p.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/40 transition-colors">
                        <span className="w-24 shrink-0 text-[10px] font-bold text-gray-400 uppercase truncate">{jornada}</span>
                        <span className="flex-1 text-right text-sm font-semibold text-gray-800 truncate">{p.local_nombre}</span>
                        <div className="shrink-0 flex items-center gap-1 bg-gray-900 rounded-md px-3 py-1">
                          <span className="text-sm font-black text-white tabular-nums w-5 text-center">{p.resultado_local ?? 0}</span>
                          <span className="text-gray-600 text-[10px]">—</span>
                          <span className="text-sm font-black text-white tabular-nums w-5 text-center">{p.resultado_visitante ?? 0}</span>
                        </div>
                        <span className="flex-1 text-left text-sm font-semibold text-gray-800 truncate">{p.visitante_nombre}</span>
                        {p.fecha_hora && (
                          <span className="shrink-0 text-[11px] text-gray-400 hidden lg:block">
                            {new Date(p.fecha_hora).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
