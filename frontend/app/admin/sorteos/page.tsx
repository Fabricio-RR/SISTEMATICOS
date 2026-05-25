"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Shuffle, Trash2, ChevronRight, AlertCircle, CheckCircle2, Trophy, Swords, X, Loader2, HelpCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Torneo, Fixture, Inscripcion, Partido } from "@/types/api";

const FASES_ELIM = ["Cuartos de Final", "Semifinales", "Final"];
type ToastType = "success" | "error";
interface Toast { id: string; type: ToastType; message: string; }

function useSorteosManager(torneoId: number | null, addToast: (msg: string, type: ToastType) => void) {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  
  const [cargandoTorneos, setCargandoTorneos] = useState(true);
  const [cargandoDetalles, setCargandoDetalles] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // Carga inicial de torneos
  useEffect(() => {
    api.getTorneos()
      .then(setTorneos)
      .catch(() => addToast("Error al cargar la lista de torneos.", "error"))
      .finally(() => setCargandoTorneos(false));
  }, [addToast]);

  // Carga de detalles cuando cambia el torneo seleccionado
  const cargarDetalles = useCallback(async (id: number) => {
    setCargandoDetalles(true);
    try {
      const [insc, fix, parts] = await Promise.all([
        api.getInscripciones(id),
        api.getFixture(id),
        api.getPartidos({ torneo_id: id }),
      ]);
      setInscripciones(insc); setFixtures(fix); setPartidos(parts);
    } catch {
      addToast("No se pudieron cargar los detalles del torneo.", "error");
    } finally {
      setCargandoDetalles(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (torneoId) {
      cargarDetalles(torneoId);
    } else {
      setInscripciones([]); setFixtures([]); setPartidos([]);
    }
  }, [torneoId, cargarDetalles]);

  // Funciones de Generación (Mutaciones)
  const generarLiga = async () => {
    if (!torneoId) return;
    setProcesando(true);
    try {
      const result = await api.generarFixture(torneoId, fixtures.length > 0);
      setFixtures(result);
      await cargarDetalles(torneoId);
      addToast("Fixture de liga generado correctamente.", "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Error al generar fixture.", "error");
    } finally { setProcesando(false); }
  };

  const eliminarFixtures = async () => {
    if (!torneoId) return;
    setProcesando(true);
    try {
      await api.deleteFixture(torneoId);
      setFixtures([]); setPartidos([]);
      addToast("Fixtures y partidos eliminados del sistema.", "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "No se pudo eliminar el fixture.", "error");
    } finally { setProcesando(false); }
  };

  const generarFaseElim = async (nClasificados: number) => {
    if (!torneoId) return;
    setProcesando(true);
    try {
      await api.generarFaseEliminatoria(torneoId, nClasificados);
      await cargarDetalles(torneoId);
      addToast("Fase eliminatoria generada exitosamente.", "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Error al generar fase eliminatoria.", "error");
    } finally { setProcesando(false); }
  };

  const generarSiguienteFase = async (fixtureId: number) => {
    if (!torneoId) return;
    setProcesando(true);
    try {
      await api.generarSiguienteFase(torneoId, fixtureId);
      await cargarDetalles(torneoId);
      addToast("Siguiente fase generada correctamente.", "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Error al generar la siguiente fase.", "error");
    } finally { setProcesando(false); }
  };

  return { 
    torneos, inscripciones, fixtures, partidos, 
    cargandoTorneos, cargandoDetalles, procesando, 
    generarLiga, eliminarFixtures, generarFaseElim, generarSiguienteFase 
  };
}

export default function SorteosPage() {
  const [torneoId, setTorneoId] = useState<number | null>(null);
  const [nClasificados, setNClasificados] = useState(4);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modalEliminar, setModalEliminar] = useState(false);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 4000);
  }, []);

  const { 
    torneos, inscripciones, fixtures, partidos, 
    cargandoDetalles, procesando, 
    generarLiga, eliminarFixtures, generarFaseElim, generarSiguienteFase 
  } = useSorteosManager(torneoId, addToast);

  // Optimizaciones con useMemo 
  const torneo = useMemo(() => torneos.find(t => t.id === torneoId) ?? null, [torneos, torneoId]);
  const aprobados = useMemo(() => inscripciones.filter(i => i.estado === "aprobado"), [inscripciones]);
  const hayPendientes = useMemo(() => inscripciones.length > 0 && aprobados.length === 0, [inscripciones, aprobados]);

  const fixturasLiga = useMemo(() => fixtures.filter(f => f.nombre_fase.startsWith("Jornada")), [fixtures]);
  const fixturasElim = useMemo(() => fixtures.filter(f => FASES_ELIM.includes(f.nombre_fase)).sort((a, b) => a.jornada - b.jornada), [fixtures]);
  const ultimaFaseElim = useMemo(() => fixturasElim.at(-1), [fixturasElim]);
  const jornadasLiga = useMemo(() => Array.from(new Set(fixturasLiga.map(f => f.jornada))).sort((a, b) => a - b), [fixturasLiga]);

  const partidosPorFixture = useMemo(() => partidos.reduce<Record<number, number>>((acc, p) => { acc[p.fixture_id] = (acc[p.fixture_id] ?? 0) + 1; return acc; }, {}), [partidos]);
  const finalizadosPorFixture = useMemo(() => partidos.reduce<Record<number, number>>((acc, p) => { if (p.estado === "finalizado") acc[p.fixture_id] = (acc[p.fixture_id] ?? 0) + 1; return acc; }, {}), [partidos]);

  const ultimaFaseCompleta = useMemo(() => 
    ultimaFaseElim != null &&
    (partidosPorFixture[ultimaFaseElim.id] ?? 0) > 0 &&
    (finalizadosPorFixture[ultimaFaseElim.id] ?? 0) === (partidosPorFixture[ultimaFaseElim.id] ?? 0), 
  [ultimaFaseElim, partidosPorFixture, finalizadosPorFixture]);

  const puedeGenerarSiguiente = ultimaFaseCompleta && ultimaFaseElim?.nombre_fase !== "Final";
  const torneoElimFinalizado = ultimaFaseCompleta && ultimaFaseElim?.nombre_fase === "Final";
  const torneoTieneLiga = fixturasLiga.length > 0;

  const esEliminacionSimple = torneo?.formato === "eliminacion_simple";
  const estadoOk_Sorteo = torneo?.estado === "en_sorteo";
  const estadoOk_EnCurso = torneo?.estado === "en_curso";

  const puedeGenerarFaseElim = estadoOk_EnCurso && fixturasElim.length === 0 && (torneoTieneLiga || esEliminacionSimple);

  const handleDeleteConfirm = async () => {
    await eliminarFixtures();
    setModalEliminar(false);
  };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Sorteos y Fixtures</h1>
        <p className="text-sm text-gray-500 mt-0.5">Genera y administra el calendario de partidos y brackets eliminatorios.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PANEL IZQUIERDO: Configuración */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shuffle className="w-4 h-4 text-red-600" /> Parámetros del Sorteo
            </h2>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Torneo</label>
              <select
                value={torneoId ?? ""}
                onChange={e => setTorneoId(Number(e.target.value) || null)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium text-gray-700"
              >
                <option value="">— Seleccionar torneo —</option>
                {torneos.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} ({t.temporada}) — {t.estado.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Stats del torneo */}
            {torneoId && (
              <div className="mt-4 p-4 bg-gray-50/80 rounded-xl border border-gray-100 space-y-2.5 text-sm">
                {[
                  { label: "Formato", valor: torneo?.formato?.replace(/_/g, " ") ?? "—" },
                  { label: "Equipos aprobados", valor: aprobados.length },
                  { label: "Partidos generados", valor: partidos.length > 0 ? partidos.length : "—" },
                  { label: "Jornadas / Fases", valor: fixtures.length > 0 ? fixtures.length : "—", color: fixtures.length > 0 ? "text-green-600" : "text-gray-400" },
                ].map(({ label, valor, color }) => (
                  <div key={label} className="flex justify-between items-center border-b border-gray-100/50 pb-1.5 last:border-0 last:pb-0">
                    <span className="text-gray-500 font-medium">{label}</span>
                    <span className={`font-bold text-gray-900 ${color ?? ""}`}>{String(valor)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Advertencia de estado */}
            {torneo && !estadoOk_Sorteo && !estadoOk_EnCurso && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p>
                  Estado actual: <strong>{torneo.estado.replace(/_/g, " ")}</strong>.<br/>
                  {esEliminacionSimple
                    ? "Avanza el torneo a 'En sorteo' y luego a 'En curso' para generar el bracket."
                    : "Para generar el fixture de liga, avanza el torneo a la etapa 'En sorteo'."}
                </p>
              </div>
            )}

            {/* Info eliminación simple en sorteo */}
            {torneo && esEliminacionSimple && estadoOk_Sorteo && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                <p>
                  Este torneo es de eliminación directa.<br/> Avanza a <strong>En curso</strong> en la sección de <Link href="/admin/torneos" className="font-bold underline hover:text-blue-900">Torneos</Link> para generar el bracket.
                </p>
              </div>
            )}

            {/* Acciones de Liga */}
            {torneoId && !esEliminacionSimple && (
              <div className="mt-5 space-y-2">
                <button
                  onClick={generarLiga}
                  disabled={procesando || aprobados.length < 2 || !estadoOk_Sorteo}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition shadow-sm disabled:opacity-50 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
                  {procesando ? "Generando..." : fixtures.length > 0 ? "Regenerar fixture de liga" : "Generar fixture de liga"}
                </button>

                {fixtures.length > 0 && (
                  <button 
                    onClick={() => setModalEliminar(true)}
                    disabled={procesando}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition focus:outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar todos los fixtures
                  </button>
                )}
              </div>
            )}

            {/* Acciones Fase Eliminatoria */}
            {torneoId && puedeGenerarFaseElim && (
              <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-purple-500" />
                  {esEliminacionSimple ? "Bracket eliminatorio" : "Fase Eliminatoria"}
                </h3>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Equipos Clasificados</label>
                  <select
                    value={nClasificados}
                    onChange={e => setNClasificados(Number(e.target.value))}
                    disabled={procesando}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 font-medium text-gray-700"
                  >
                    <option value={2}>2 equipos — Final directa</option>
                    <option value={4}>4 equipos — Semifinales</option>
                    <option value={8}>8 equipos — Cuartos de Final</option>
                  </select>
                </div>
                
                <button
                  onClick={() => generarFaseElim(nClasificados)}
                  disabled={procesando || aprobados.length < nClasificados}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition shadow-sm disabled:opacity-50 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                  {procesando ? "Generando..." : "Generar cruces"}
                </button>
                
                {aprobados.length < nClasificados && (
                  <p className="text-[11px] text-amber-600 text-center font-medium bg-amber-50 py-1.5 rounded border border-amber-100">
                    Se requieren {nClasificados} equipos aprobados (actual: {aprobados.length})
                  </p>
                )}
              </div>
            )}

            {/* Siguiente fase eliminatoria */}
            {torneoId && puedeGenerarSiguiente && ultimaFaseElim && (
              <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-purple-500" /> Siguiente Fase
                </h3>
                
                <button
                  onClick={() => generarSiguienteFase(ultimaFaseElim.id)}
                  disabled={procesando}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition shadow-sm disabled:opacity-50 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                  {procesando ? "Procesando..." : "Avanzar de fase"}
                </button>
                
                <div className="text-xs text-center bg-gray-50 border border-gray-100 rounded-lg py-2">
                  <span className="text-gray-500 font-medium">Fase completada: </span>
                  <span className="font-bold text-purple-700">{ultimaFaseElim.nombre_fase}</span>
                </div>
              </div>
            )}

            {torneoId && torneoElimFinalizado && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl text-sm font-bold text-amber-800 shadow-sm">
                  <Trophy className="w-5 h-5 text-amber-500 drop-shadow-sm" />
                  ¡Torneo Finalizado!
                </div>
              </div>
            )}

            {torneoId && aprobados.length === 0 && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-medium">{hayPendientes ? "El torneo tiene inscripciones pendientes de revisión." : "No hay equipos inscritos y aprobados para este torneo."}</p>
                <Link href="/admin/inscripciones" className="mt-2 inline-flex items-center gap-1 font-bold text-amber-900 hover:text-amber-950 transition-colors">
                  Ir a Inscripciones <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: Visualización */}
        <div className="lg:col-span-2 space-y-4">
          {!torneoId ? (
            <div className="h-64 flex flex-col items-center justify-center bg-white border border-dashed border-gray-200 rounded-xl text-gray-400 shadow-sm">
              <Shuffle className="w-10 h-10 mb-3 text-gray-200" strokeWidth={1.5} />
              <p className="text-sm font-medium">Selecciona un torneo para gestionar su calendario</p>
            </div>
          ) : cargandoDetalles ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 animate-pulse">
                  <div className="h-5 bg-gray-100 rounded w-1/4 mb-4"></div>
                  <div className="h-4 bg-gray-50 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : fixtures.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center bg-white border border-dashed border-gray-200 rounded-xl text-gray-400 shadow-sm px-4 text-center">
              <Swords className="w-10 h-10 mb-3 text-gray-200" strokeWidth={1.5} />
              <p className="text-sm font-medium text-gray-500">Aún no se ha generado el fixture para este torneo.</p>
              <p className="text-xs mt-1 text-gray-400">Utiliza el panel izquierdo para crear los cruces.</p>
              {aprobados.length < 2 && <p className="text-xs mt-3 text-red-400 font-bold bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">Requiere al menos 2 equipos aprobados.</p>}
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Sección Liga */}
              {jornadasLiga.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 border-b border-gray-200 pb-2">Fase de Liga</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {jornadasLiga.map(jornada => {
                      const jornFix = fixturasLiga.find(f => f.jornada === jornada);
                      const cantPartidos = jornFix ? (partidosPorFixture[jornFix.id] ?? 0) : 0;
                      return (
                        <div key={jornada} className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow transition-shadow overflow-hidden group">
                          <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-900">{jornFix?.nombre_fase}</span>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                              {jornFix ? new Date(jornFix.fecha_generacion).toLocaleDateString("es-PE", { month: "short", day: "numeric" }) : ""}
                            </span>
                          </div>
                          <div className="px-4 py-3 text-sm text-gray-500 flex items-center justify-between bg-white">
                            <span className="font-medium bg-gray-100 px-2 py-0.5 rounded text-xs">{cantPartidos} encuentro{cantPartidos !== 1 ? "s" : ""}</span>
                            <Link href={`/admin/encuentros?torneo_id=${torneoId}`} className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              Ver cruces <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sección Eliminatoria */}
              {fixturasElim.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 border-b border-gray-200 pb-2">
                    {esEliminacionSimple ? "Bracket Eliminatorio" : "Fase Final"}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {fixturasElim.map(fix => {
                      const total = partidosPorFixture[fix.id] ?? 0;
                      const finalizados = finalizadosPorFixture[fix.id] ?? 0;
                      const completa = total > 0 && finalizados === total;
                      const isFinal = fix.nombre_fase === "Final";

                      return (
                        <div key={fix.id} className={`border rounded-xl shadow-sm overflow-hidden transition-all ${isFinal ? "border-amber-200 bg-amber-50/10" : "border-purple-100 bg-white"}`}>
                          <div className={`px-5 py-3 border-b flex items-center justify-between ${isFinal ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-100" : "bg-purple-50/50 border-purple-50"}`}>
                            <span className={`flex items-center gap-2 text-sm font-bold ${isFinal ? "text-amber-800" : "text-purple-800"}`}>
                              <Trophy className={`w-4 h-4 ${isFinal ? "text-amber-500" : "text-purple-500"}`} />
                              {fix.nombre_fase}
                            </span>
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isFinal ? "text-amber-500" : "text-purple-400"}`}>
                              {new Date(fix.fecha_generacion).toLocaleDateString("es-PE", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/60">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-2.5 py-1">
                                <Swords className="w-3.5 h-3.5 text-gray-400" />
                                {total} partido{total !== 1 ? "s" : ""}
                              </div>
                              <div className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                                <span className={finalizados === total ? "text-green-600 font-bold" : ""}>{finalizados}</span> / {total} finalizados
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                              {completa && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-[11px] font-bold uppercase tracking-wider border border-green-100">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Completa
                                </span>
                              )}
                              <Link href={`/admin/encuentros?torneo_id=${torneoId}`} className={`text-xs font-bold flex items-center gap-1 hover:underline ${isFinal ? "text-amber-600 hover:text-amber-700" : "text-purple-600 hover:text-purple-700"}`}>
                                Ver detalle <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE SEGURIDAD: ELIMINAR FIXTURE */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity" onClick={() => setModalEliminar(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center shrink-0 border border-red-100">
                <HelpCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-gray-900">¿Eliminar calendario?</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Estás a punto de borrar todos los cruces y partidos generados para <strong className="text-gray-900">"{torneo?.nombre}"</strong>. Si hay resultados registrados, se perderán de forma permanente.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button 
                onClick={() => setModalEliminar(false)}
                disabled={procesando}
                className="px-4 py-2 border border-gray-200 text-gray-600 font-semibold rounded-lg text-sm hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteConfirm}
                disabled={procesando}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm transition flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {procesando ? "Eliminando..." : "Sí, eliminar todo"}
              </button>
            </div>
          </div>
        </div>
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