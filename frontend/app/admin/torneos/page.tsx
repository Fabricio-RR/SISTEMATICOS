"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { BarChart3, RefreshCw, Filter, AlertCircle, Trophy, Users, Swords, Loader2, CheckCircle2, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Torneo, PosicionTabla, Goleador, Partido, Deporte } from "@/types/api";

type Tab = "tabla" | "goleadores" | "partidos";
type ToastType = "success" | "error";
interface Toast { id: string; type: ToastType; message: string; }

function useResultadosManager(torneoId: number | undefined, addToast: (msg: string, type: ToastType) => void) {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [tabla, setTabla] = useState<PosicionTabla[]>([]);
  const [goleadores, setGoleadores] = useState<Goleador[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarDatosBase = useCallback(async () => {
    setCargando(true);
    try {
      const [t, deps] = await Promise.all([api.getTorneos(), api.getDeportes()]);
      setTorneos(t); setDeportes(deps);
    } catch {
      addToast("Error al cargar los catálogos.", "error");
    } finally { setCargando(false); }
  }, [addToast]);

  const cargarStats = useCallback(async (id: number) => {
    setCargando(true);
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
      addToast("Error al cargar las estadísticas.", "error");
    } finally { setCargando(false); }
  }, [addToast]);

  useEffect(() => { cargarDatosBase(); }, [cargarDatosBase]);

  useEffect(() => {
    if (torneoId) cargarStats(torneoId);
    else { setTabla([]); setGoleadores([]); setPartidos([]); }
  }, [torneoId, cargarStats]);

  return { torneos, deportes, tabla, goleadores, partidos, cargando, recargar: () => torneoId ? cargarStats(torneoId) : cargarDatosBase() };
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

  const { torneos, deportes, tabla, goleadores, partidos, cargando, recargar } = useResultadosManager(torneoId, addToast);

  const depMap = useMemo(() => new Map(deportes.map(d => [d.id, d])), [deportes]);
  const torneoSeleccionado = useMemo(() => torneos.find(t => t.id === torneoId), [torneos, torneoId]);
  
  const esFut = useMemo(() => {
    if (!torneoSeleccionado) return false;
    const dep = depMap.get(torneoSeleccionado.deporte_id);
    return dep ? (dep.nombre.toLowerCase().includes("fútbol") || dep.nombre.toLowerCase().includes("futbol")) : false;
  }, [torneoSeleccionado, depMap]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "tabla", label: "Tabla de posiciones", icon: <Trophy className="w-4 h-4" /> },
    { key: "goleadores", label: esFut ? "Goleadores" : "Anotadores", icon: <Users className="w-4 h-4" /> },
    { key: "partidos", label: "Partidos finalizados", icon: <Swords className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Resultados</h1>
        </div>
        <button onClick={recargar} disabled={cargando} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-4 py-3 flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400 shrink-0" />
        <select value={torneoId ?? ""} onChange={e => { setTorneoId(e.target.value ? Number(e.target.value) : undefined); setTab("tabla"); }} className="flex-1 text-sm bg-transparent focus:outline-none text-gray-800 font-medium cursor-pointer">
          <option value="">— Seleccionar torneo —</option>
          {torneos.filter(t => t.estado !== "suspendido").map(t => <option key={t.id} value={t.id}>{t.nombre} · {t.temporada}</option>)}
        </select>
      </div>

      {!torneoId ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
          <BarChart3 className="w-12 h-12 text-gray-200" strokeWidth={1.5} />
          <p className="text-sm">Selecciona un torneo para ver las estadísticas</p>
        </div>
      ) : (
        <>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto hide-scrollbar">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-lg transition ${tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* TAB: TABLA */}
          {tab === "tabla" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50/50">
                    <tr className="border-b border-gray-100">
                      {["Pos", "Equipo", "PJ", "G", "E", "P", "GF", "GC", "DIF", "PTS"].map((h) => (
                        <th key={h} className={`py-3 text-xs font-bold text-gray-500 uppercase tracking-wider ${h === "Equipo" ? "text-left px-6" : "text-center px-2"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cargando ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={10} className="py-6 animate-pulse bg-gray-50/50"></td></tr>) : 
                      tabla.map((f) => (
                        <tr key={f.equipo_id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="text-center py-4 text-sm font-bold text-gray-900">{f.posicion}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{f.nombre_equipo}</td>
                          <td className="text-center py-4 text-sm text-gray-600">{f.partidos_jugados}</td>
                          <td className="text-center py-4 text-sm text-gray-600">{f.partidos_ganados}</td>
                          <td className="text-center py-4 text-sm text-gray-600">{f.partidos_empatados}</td>
                          <td className="text-center py-4 text-sm text-gray-600">{f.partidos_perdidos}</td>
                          <td className="text-center py-4 text-sm text-gray-600">{f.goles_a_favor}</td>
                          <td className="text-center py-4 text-sm text-gray-600">{f.goles_en_contra}</td>
                          <td className="text-center py-4 text-sm font-semibold text-gray-700">{f.diferencia_goles > 0 ? `+${f.diferencia_goles}` : f.diferencia_goles}</td>
                          <td className="text-center py-4"><span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">{f.puntos}</span></td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: GOLEADORES */}
          {tab === "goleadores" && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
               <div className="divide-y divide-gray-50">
                 {cargando ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="py-6 animate-pulse bg-gray-50/50"></div>) : 
                  goleadores.map((g) => (
                    <div key={g.atleta_id} className="flex items-center gap-4 px-6 py-4">
                      <span className="text-sm font-bold text-gray-400 w-6">{g.posicion}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">{g.nombre_completo}</p>
                        <p className="text-xs text-gray-500">{g.nombre_equipo}</p>
                      </div>
                      <span className="text-lg font-black text-red-600">{g.goles}</span>
                    </div>
                  ))
                 }
               </div>
            </div>
          )}
        </>
      )}

      {/* TOASTS MANAGER */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-right-5 fade-in duration-300 pointer-events-auto ${toast.type === "success" ? "bg-gray-900 text-white" : "bg-red-600 text-white"}`}>
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.message}
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-2 opacity-70 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}