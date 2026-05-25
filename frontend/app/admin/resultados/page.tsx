"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { BarChart3, RefreshCw, Filter, AlertCircle, X, Trophy, Users, Swords, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Torneo, PosicionTabla, Goleador, Partido, Deporte } from "@/types/api";

type Tab = "tabla" | "goleadores" | "partidos";
type ToastType = "success" | "error";
interface Toast { id: string; type: ToastType; message: string; }

// Lógica de Datos
function useResultadosManager(torneoId: number | undefined, addToast: (msg: string, type: ToastType) => void) {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  
  const [tabla, setTabla] = useState<PosicionTabla[]>([]);
  const [goleadores, setGoleadores] = useState<Goleador[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  
  const [cargandoGlobal, setCargandoGlobal] = useState(true);
  const [cargandoStats, setCargandoStats] = useState(false);

  // Carga inicial de catálogos (Torneos y Deportes)
  const cargarCatalogos = useCallback(async () => {
    setCargandoGlobal(true);
    try {
      const [t, deps] = await Promise.all([api.getTorneos(), api.getDeportes()]);
      setTorneos(t);
      setDeportes(deps);
    } catch { 
      addToast("No se pudo cargar la lista de torneos.", "error"); 
    } finally { 
      setCargandoGlobal(false); 
    }
  }, [addToast]);

  useEffect(() => { cargarCatalogos(); }, [cargarCatalogos]);

  // Carga de estadísticas al seleccionar un torneo
  const cargarStats = useCallback(async (id: number) => {
    setCargandoStats(true);
    try {
      const [tabData, golData, partData] = await Promise.all([
        api.getTabla(id),
        api.getGoleadores(id),
        api.getPartidos({ torneo_id: id }),
      ]);
      setTabla(tabData);
      setGoleadores(golData);
      setPartidos(partData.filter(p => p.estado === "finalizado"));
    } catch { 
      addToast("No se pudieron cargar las estadísticas del torneo.", "error"); 
    } finally { 
      setCargandoStats(false); 
    }
  }, [addToast]);

  useEffect(() => {
    if (torneoId) {
      cargarStats(torneoId);
    } else {
      setTabla([]); setGoleadores([]); setPartidos([]);
    }
  }, [torneoId, cargarStats]);

  const recargarTodo = async () => {
    await cargarCatalogos();
    if (torneoId) await cargarStats(torneoId);
  };

  return { torneos, deportes, tabla, goleadores, partidos, cargandoGlobal, cargandoStats, recargarTodo };
}

export default function ResultadosPage() {
  const [torneoId, setTorneoId] = useState<number | undefined>();
  const [tab, setTab] = useState<Tab>("tabla");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 4000);
  }, []);

  const { torneos, deportes, tabla, goleadores, partidos, cargandoGlobal, cargandoStats, recargarTodo } = useResultadosManager(torneoId, addToast);

  //  Mapas y derivaciones Optimizadas 
  const depMap = useMemo(() => new Map(deportes.map(d => [d.id, d])), [deportes]);
  const torneoSeleccionado = useMemo(() => torneos.find(t => t.id === torneoId), [torneos, torneoId]);
  
  const esFut = useMemo(() => {
    if (!torneoSeleccionado) return false;
    const dep = depMap.get(torneoSeleccionado.deporte_id);
    return dep ? (dep.nombre.toLowerCase().includes("fútbol") || dep.nombre.toLowerCase().includes("futbol")) : false;
  }, [torneoSeleccionado, depMap]);

  //  Funciones UI Auxiliares 
  const posBadge = (pos: number) =>
    pos === 1 ? "bg-amber-400 text-white ring-2 ring-amber-200 shadow-sm"
    : pos === 2 ? "bg-gray-400 text-white shadow-sm"
    : pos === 3 ? "bg-orange-500 text-white shadow-sm"
    : "bg-gray-100 text-gray-500";

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "tabla", label: "Tabla de posiciones", icon: <Trophy className="w-4 h-4" /> },
    { key: "goleadores", label: esFut ? "Goleadores" : "Anotadores", icon: <Users className="w-4 h-4" /> },
    { key: "partidos", label: "Partidos finalizados", icon: <Swords className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Resultados</h1>
          <p className="text-sm text-gray-500 mt-0.5">Consulta tablas de posiciones, goleadores e historial de partidos.</p>
        </div>
        <button 
          onClick={recargarTodo} 
          disabled={cargandoGlobal || cargandoStats}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${(cargandoGlobal || cargandoStats) ? "animate-spin" : ""}`} /> 
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Selector de torneo */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={torneoId ?? ""}
            onChange={e => { setTorneoId(e.target.value ? Number(e.target.value) : undefined); setTab("tabla"); }}
            disabled={cargandoGlobal}
            className="w-full text-sm bg-transparent focus:outline-none text-gray-800 font-medium cursor-pointer disabled:opacity-50"
          >
            <option value="">— Seleccionar torneo para ver resultados —</option>
            {torneos.filter(t => t.estado !== "suspendido").map(t => (
              <option key={t.id} value={t.id}>{t.nombre} · {t.temporada}</option>
            ))}
          </select>
        </div>
        
        {torneoId && torneoSeleccionado && (
          <div className="shrink-0 flex justify-end">
            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              torneoSeleccionado.estado === "en_curso" ? "bg-green-100 text-green-700"
              : torneoSeleccionado.estado === "finalizado" ? "bg-gray-100 text-gray-600"
              : "bg-blue-100 text-blue-700"
            }`}>
              {torneoSeleccionado.estado.replace(/_/g, " ")}
            </span>
          </div>
        )}
      </div>

      {/* Estado Vacío / Contenido */}
      {!torneoId ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center py-20 gap-3 text-gray-400 shadow-sm">
          <BarChart3 className="w-12 h-12 text-gray-200" strokeWidth={1.5} />
          <p className="text-sm font-medium text-gray-500">Selecciona un torneo en el filtro superior</p>
          <p className="text-xs text-gray-400">Podrás visualizar posiciones, estadísticas individuales y resultados.</p>
        </div>
      ) : (
        <>
          {/* Navegación de Tabs */}
          <div className="flex gap-1 bg-gray-100/80 p-1.5 rounded-xl overflow-x-auto hide-scrollbar border border-gray-200/50">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition focus:outline-none ${
                  tab === t.key
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB: TABLA DE POSICIONES */}
          {tab === "tabla" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-bold text-gray-900">Tabla de posiciones</h2>
                </div>
                {!cargandoStats && <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{tabla.length} equipos</span>}
              </div>
              
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {["Pos", "Equipo", "PJ", "G", "E", "P", "GF", "GC", "DIF", "PTS"].map((h) => (
                        <th key={h} className={`py-3 text-xs font-bold text-gray-500 uppercase tracking-wider ${h === "Equipo" ? "text-left px-4 w-1/3" : "text-center px-3"}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cargandoStats ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-3 py-4"><div className="h-6 w-6 bg-gray-100 rounded-full mx-auto"></div></td>
                          <td className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-3/4"></div></td>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <td key={j} className="px-3 py-4"><div className="h-4 bg-gray-100 rounded w-6 mx-auto"></div></td>
                          ))}
                        </tr>
                      ))
                    ) : tabla.length === 0 ? (
                      <tr><td colSpan={10} className="text-center py-16 text-sm text-gray-400">No hay datos suficientes para generar la tabla.</td></tr>
                    ) : (
                      tabla.map((fila) => (
                        <tr key={fila.equipo_id} className="hover:bg-gray-50/70 transition-colors group">
                          <td className="text-center px-3 py-3">
                            {fila.posicion === 1
                              ? <Trophy className="w-5 h-5 text-yellow-500 mx-auto drop-shadow-sm" />
                              : <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-black ${posBadge(fila.posicion)}`}>{fila.posicion}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900">{fila.nombre_equipo}</td>
                          <td className="text-center px-3 py-3 text-sm font-medium text-gray-500">{fila.partidos_jugados}</td>
                          <td className="text-center px-3 py-3 text-sm font-medium text-gray-500">{fila.partidos_ganados}</td>
                          <td className="text-center px-3 py-3 text-sm font-medium text-gray-500">{fila.partidos_empatados}</td>
                          <td className="text-center px-3 py-3 text-sm font-medium text-gray-500">{fila.partidos_perdidos}</td>
                          <td className="text-center px-3 py-3 text-sm font-medium text-gray-500">{fila.goles_a_favor}</td>
                          <td className="text-center px-3 py-3 text-sm font-medium text-gray-500">{fila.goles_en_contra}</td>
                          <td className="text-center px-3 py-3 text-sm font-bold text-gray-600">
                            {fila.diferencia_goles > 0 ? `+${fila.diferencia_goles}` : fila.diferencia_goles}
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className="bg-gray-900 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm">{fila.puntos}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: GOLEADORES / ANOTADORES */}
          {tab === "goleadores" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <h2 className="text-sm font-bold text-gray-900">{esFut ? "Tabla de Goleadores" : "Anotadores Destacados"}</h2>
                </div>
                {!cargandoStats && <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">Top {goleadores.length}</span>}
              </div>
              
              <div className="divide-y divide-gray-50">
                {cargandoStats ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                      <div className="w-6 h-4 bg-gray-100 rounded"></div>
                      <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-1/3"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                      </div>
                      <div className="w-8 h-8 bg-gray-100 rounded-lg"></div>
                    </div>
                  ))
                ) : goleadores.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                    <Users className="w-10 h-10 text-gray-200" strokeWidth={1.5} />
                    <p className="text-sm font-medium">Sin registros individuales en este torneo.</p>
                  </div>
                ) : (
                  goleadores.map((g, idx) => (
                    <div key={g.atleta_id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/70 transition-colors group">
                      <span className={`text-sm font-bold w-6 shrink-0 text-center ${idx < 3 ? "text-gray-900" : "text-gray-400"}`}>{g.posicion}</span>
                      <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{g.nombre_completo}</p>
                        <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{g.nombre_equipo}</p>
                      </div>
                      <div className="text-center shrink-0 ml-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg group-hover:bg-white group-hover:border-red-100 transition-colors">
                        <p className="text-lg font-black text-red-600 leading-none">{g.goles}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1 leading-none">{g.etiqueta}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: PARTIDOS FINALIZADOS */}
          {tab === "partidos" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-emerald-500" />
                  <h2 className="text-sm font-bold text-gray-900">Historial de Partidos</h2>
                </div>
                {!cargandoStats && <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{partidos.length} finalizados</span>}
              </div>
              
              <div className="divide-y divide-gray-50">
                {cargandoStats ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                      <div className="w-16 h-4 bg-gray-100 rounded shrink-0"></div>
                      <div className="flex-1 h-4 bg-gray-100 rounded"></div>
                      <div className="w-16 h-8 bg-gray-100 rounded-lg shrink-0"></div>
                      <div className="flex-1 h-4 bg-gray-100 rounded"></div>
                    </div>
                  ))
                ) : partidos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                    <Swords className="w-10 h-10 text-gray-200" strokeWidth={1.5} />
                    <p className="text-sm font-medium">Aún no hay partidos finalizados.</p>
                  </div>
                ) : (
                  partidos.map((p) => {
                    const jornada = p.ronda ?? `Jornada ${p.jornada}`;
                    const localGanador = (p.resultado_local ?? 0) > (p.resultado_visitante ?? 0);
                    const visitanteGanador = (p.resultado_visitante ?? 0) > (p.resultado_local ?? 0);
                    const empate = (p.resultado_local ?? 0) === (p.resultado_visitante ?? 0);

                    return (
                      <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors">
                        <div className="flex justify-between sm:w-24 shrink-0">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{jornada}</span>
                          {p.fecha_hora && (
                            <span className="text-[10px] font-semibold text-gray-400 sm:hidden">
                              {new Date(p.fecha_hora).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 flex items-center justify-center sm:justify-start gap-3">
                          <span className={`flex-1 text-right text-sm truncate ${localGanador ? "font-bold text-gray-900" : empate ? "font-semibold text-gray-700" : "font-medium text-gray-500"}`}>
                            {p.local_nombre}
                          </span>
                          
                          <div className="shrink-0 flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 shadow-sm">
                            <span className={`text-sm tabular-nums w-5 text-center ${localGanador ? "font-black text-white" : "font-bold text-gray-400"}`}>
                              {p.resultado_local ?? 0}
                            </span>
                            <span className="text-gray-600 text-[10px]">—</span>
                            <span className={`text-sm tabular-nums w-5 text-center ${visitanteGanador ? "font-black text-white" : "font-bold text-gray-400"}`}>
                              {p.resultado_visitante ?? 0}
                            </span>
                          </div>
                          
                          <span className={`flex-1 text-left text-sm truncate ${visitanteGanador ? "font-bold text-gray-900" : empate ? "font-semibold text-gray-700" : "font-medium text-gray-500"}`}>
                            {p.visitante_nombre}
                          </span>
                        </div>
                        
                        {p.fecha_hora && (
                          <span className="shrink-0 text-[11px] font-medium text-gray-400 w-16 text-right hidden sm:block">
                            {new Date(p.fecha_hora).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* TOASTS MANAGER */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-right-5 fade-in duration-300 pointer-events-auto ${toast.type === "success" ? "bg-gray-900 text-white border border-gray-800" : "bg-red-600 text-white border border-red-700"}`}>
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.message}
            <button onClick={() => setToasts(p => p.filter(t => t.id !== toast.id))} className="ml-2 opacity-70 hover:opacity-100 transition-opacity focus:outline-none"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}