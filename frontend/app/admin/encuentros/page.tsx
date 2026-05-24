"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar, RefreshCw, Filter, AlertCircle, RotateCcw, Pencil, X, Plus, Trash2, ClipboardList, Save, ChevronDown
} from "lucide-react";
import { api } from "@/lib/api";
import type { Partido, Torneo, Deporte, EstadoPartido, PartidoUpdate, Sede, AtletaJugador, EventoPartidoCreate } from "@/types/api";

const ESTADO_LABEL: Record<EstadoPartido, string> = {
  programado: "Programado",
  en_curso: "En curso",
  finalizado: "Finalizado",
};

type EditModal = { partido: Partido; form: PartidoUpdate; fechaOriginal: string | null };
type CorreccionModal = { partido: Partido; local: string; visitante: string };

export default function EncuentrosPage() {
  const searchParams = useSearchParams();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [deporteFiltro, setDeporteFiltro] = useState<number | undefined>();
  const [torneoFiltro, setTorneoFiltro] = useState<number | undefined>(
    () => { const v = searchParams.get("torneo_id"); return v ? Number(v) : undefined; }
  );
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoPartido | "">("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [editModal, setEditModal] = useState<EditModal | null>(null);
  const [correccionModal, setCorreccionModal] = useState<CorreccionModal | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const [modalEventos, setModalEventos] = useState<EventoPartidoCreate[]>([]);
  const [atletasLocal, setAtletasLocal] = useState<AtletaJugador[]>([]);
  const [atletasVisitante, setAtletasVisitante] = useState<AtletaJugador[]>([]);
  const [cargandoAtletasModal, setCargandoAtletasModal] = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState<{
    equipoSelect: "local" | "visitante";
    atletaId: number;
    tipo: string;
    minuto: string;
    descripcion: string;
  }>({ equipoSelect: "local", atletaId: 0, tipo: "gol", minuto: "", descripcion: "" });

  const depMap = new Map(deportes.map(d => [d.id, d]));

  function esFutbolDelPartido(partido: Partido): boolean {
    const t = torneos.find(tor => tor.nombre === partido.torneo_nombre);
    if (!t) return false;
    const dep = depMap.get(t.deporte_id);
    if (!dep) return false;
    const name = dep.nombre.toLowerCase();
    return name.includes("fútbol") || name.includes("futbol");
  }

  async function abrirCorreccionModal(p: Partido) {
    setCorreccionModal({ partido: p, local: String(p.resultado_local ?? ""), visitante: String(p.resultado_visitante ?? "") });
    setModalEventos(p.eventos?.map(e => ({ atleta_jugador_id: e.atleta_jugador_id ?? 0, tipo_evento: e.tipo_evento, minuto: e.minuto || undefined, descripcion: e.descripcion || undefined })) ?? []);
    setNuevoEvento({ equipoSelect: "local", atletaId: 0, tipo: "gol", minuto: "", descripcion: "" });
    setAtletasLocal([]); setAtletasVisitante([]);
    setCargandoAtletasModal(true);
    try {
      const [atsL, atsV] = await Promise.all([
        p.local_club_equipo_id ? api.getAtletas(p.local_club_equipo_id) : Promise.resolve([]),
        p.visitante_club_equipo_id ? api.getAtletas(p.visitante_club_equipo_id) : Promise.resolve([]),
      ]);
      setAtletasLocal(atsL); setAtletasVisitante(atsV);
      if (atsL.length > 0) setNuevoEvento(prev => ({ ...prev, atletaId: atsL[0].id }));
    } catch { alert("Error al cargar los integrantes de los equipos."); }
    finally { setCargandoAtletasModal(false); }
  }

  function handleEquipoSelectChange(eq: "local" | "visitante") {
    const list = eq === "local" ? atletasLocal : atletasVisitante;
    setNuevoEvento(prev => ({ ...prev, equipoSelect: eq, atletaId: list.length > 0 ? list[0].id : 0 }));
  }

  function agregarEvento() {
    if (nuevoEvento.atletaId === 0) { alert("Por favor, selecciona un jugador."); return; }
    setModalEventos(prev => [...prev, { atleta_jugador_id: nuevoEvento.atletaId, tipo_evento: nuevoEvento.tipo, minuto: nuevoEvento.minuto ? Number(nuevoEvento.minuto) : null, descripcion: nuevoEvento.descripcion || null }]);
    setNuevoEvento(prev => ({ ...prev, minuto: "", descripcion: "" }));
  }

  function eliminarEvento(index: number) { setModalEventos(prev => prev.filter((_, i) => i !== index)); }

  function getNombreJugador(atletaId: number): string {
    const a = [...atletasLocal, ...atletasVisitante].find(item => item.id === atletaId);
    return a ? `${a.nombre_completo} (#${a.numero_camiseta ?? "—"})` : `Jugador #${atletaId}`;
  }

  const cargar = useCallback(async () => {
    setCargando(true); setError("");
    try {
      const [p, t, dep, s] = await Promise.all([
        api.getPartidos({ torneo_id: torneoFiltro, deporte_id: !torneoFiltro ? deporteFiltro : undefined, estado: estadoFiltro || undefined }),
        api.getTorneos(), api.getDeportes(), api.getSedes(),
      ]);
      setPartidos(p); setTorneos(t); setDeportes(dep); setSedes(s);
    } catch { setError("No se pudo cargar los encuentros."); }
    finally { setCargando(false); }
  }, [torneoFiltro, deporteFiltro, estadoFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardarEdicion() {
    if (!editModal) return;
    const estaReprogramando = editModal.fechaOriginal && editModal.form.fecha_hora && editModal.form.fecha_hora.slice(0, 16) !== editModal.fechaOriginal.slice(0, 16);
    if (estaReprogramando && !editModal.form.motivo_reprogramacion?.trim()) { alert("Debes ingresar el motivo de la reprogramación."); return; }
    if (estaReprogramando && editModal.form.motivo_reprogramacion && editModal.form.motivo_reprogramacion.length > 500) { alert("El motivo de la reprogramación no puede tener más de 500 caracteres."); return; }
    setGuardando(true);
    try { await api.updatePartido(editModal.partido.id, editModal.form); setEditModal(null); await cargar(); }
    catch (e) { alert(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setGuardando(false); }
  }

  async function guardarCorreccion() {
    if (!correccionModal) return;
    const rl = Number(correccionModal.local), rv = Number(correccionModal.visitante);
    if (!Number.isInteger(rl) || !Number.isInteger(rv) || rl < 0 || rv < 0 || correccionModal.local === "" || correccionModal.visitante === "") { alert("Ingresa marcadores válidos (números enteros ≥ 0)."); return; }
    setGuardando(true);
    try { await api.setResultado(correccionModal.partido.id, { resultado_local: rl, resultado_visitante: rv, eventos: modalEventos }); setCorreccionModal(null); await cargar(); }
    catch (e) { alert(e instanceof Error ? e.message : "Error al corregir resultado"); }
    finally { setGuardando(false); }
  }

  const torneosFiltrados = deporteFiltro ? torneos.filter(t => t.deporte_id === deporteFiltro) : torneos;

  const estadoDot: Record<EstadoPartido, string> = {
    programado: "bg-blue-400",
    en_curso: "bg-amber-400 animate-pulse",
    finalizado: "bg-emerald-400",
  };
  const estadoText: Record<EstadoPartido, string> = {
    programado: "text-blue-600",
    en_curso: "text-amber-600",
    finalizado: "text-emerald-600",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Encuentros</h1>
          <p className="text-sm text-gray-400 mt-0.5">Programación y seguimiento de partidos por deporte.</p>
        </div>
        <button onClick={cargar} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
          <RefreshCw className="w-4 h-4" />Actualizar
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
        <Filter className="w-4 h-4 text-gray-300 shrink-0" />
        <select value={deporteFiltro ?? ""} onChange={e => { setDeporteFiltro(e.target.value ? Number(e.target.value) : undefined); setTorneoFiltro(undefined); }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-gray-700">
          <option value="">Todos los deportes</option>
          {deportes.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
        <select value={torneoFiltro ?? ""} onChange={e => setTorneoFiltro(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-gray-700">
          <option value="">Todos los torneos</option>
          {torneosFiltrados.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value as EstadoPartido | "")}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-gray-700">
          <option value="">Todos los estados</option>
          {(["programado", "en_curso", "finalizado"] as EstadoPartido[]).map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
        </select>
        {!cargando && <span className="ml-auto text-xs text-gray-400">{partidos.length} encuentro{partidos.length !== 1 ? "s" : ""}</span>}
      </div>

      {/* Lista por torneo (accordion) */}
      {cargando ? (
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">Cargando...</div>
      ) : partidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-300 gap-2">
          <Calendar className="w-8 h-8" strokeWidth={1.5} />
          <p className="text-sm text-gray-400">Sin partidos para los filtros seleccionados</p>
        </div>
      ) : (() => {
        // Agrupar por torneo_nombre
        const porTorneo = new Map<string, Partido[]>();
        for (const p of partidos) {
          const k = p.torneo_nombre ?? "—";
          if (!porTorneo.has(k)) porTorneo.set(k, []);
          porTorneo.get(k)!.push(p);
        }
        const soloUnTorneo = porTorneo.size === 1;

        return (
          <div className="space-y-3">
            {Array.from(porTorneo.entries()).map(([torneoNombre, ps]) => {
              const abierto = soloUnTorneo || expandidos.has(torneoNombre);
              const progCount = ps.filter(p => p.estado === "programado").length;
              const cursoCount = ps.filter(p => p.estado === "en_curso").length;
              const finCount = ps.filter(p => p.estado === "finalizado").length;

              return (
                <div key={torneoNombre} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Accordion header */}
                  <button
                    onClick={() => {
                      if (soloUnTorneo) return;
                      setExpandidos(prev => {
                        const n = new Set(prev);
                        n.has(torneoNombre) ? n.delete(torneoNombre) : n.add(torneoNombre);
                        return n;
                      });
                    }}
                    className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors ${soloUnTorneo ? "" : "hover:bg-gray-50/80 cursor-pointer"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{torneoNombre}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-gray-400">{ps.length} partido{ps.length !== 1 ? "s" : ""}</span>
                        {finCount > 0 && <span className="text-[11px] text-emerald-600 font-medium">{finCount} finalizado{finCount !== 1 ? "s" : ""}</span>}
                        {cursoCount > 0 && <span className="text-[11px] text-amber-600 font-medium animate-pulse">{cursoCount} en curso</span>}
                        {progCount > 0 && <span className="text-[11px] text-blue-500 font-medium">{progCount} programado{progCount !== 1 ? "s" : ""}</span>}
                      </div>
                    </div>
                    {!soloUnTorneo && (
                      <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`} />
                    )}
                  </button>

                  {/* Rows */}
                  {abierto && (
                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                      {ps.map(p => (
                        <div key={p.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/60 transition-colors">
                          {/* Fase */}
                          <span className="w-20 shrink-0 text-[10px] font-bold text-gray-400 uppercase truncate">
                            {p.ronda ?? `J${p.jornada}`}
                          </span>

                          {/* Local — Score — Visitante */}
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="flex-1 text-right text-sm font-semibold text-gray-800 truncate">{p.local_nombre}</span>
                            <div className="shrink-0">
                              {p.estado === "finalizado" ? (
                                <div className="flex items-center gap-1 bg-gray-900 rounded-md px-2.5 py-0.5">
                                  <span className="text-sm font-black text-white tabular-nums w-4 text-center">{p.resultado_local ?? 0}</span>
                                  <span className="text-gray-600 text-[10px]">—</span>
                                  <span className="text-sm font-black text-white tabular-nums w-4 text-center">{p.resultado_visitante ?? 0}</span>
                                </div>
                              ) : p.estado === "en_curso" ? (
                                <div className="flex items-center gap-1 bg-amber-500 rounded-md px-2.5 py-0.5">
                                  <span className="text-sm font-black text-white tabular-nums w-4 text-center">{p.resultado_local ?? 0}</span>
                                  <span className="text-amber-200 text-[10px]">—</span>
                                  <span className="text-sm font-black text-white tabular-nums w-4 text-center">{p.resultado_visitante ?? 0}</span>
                                </div>
                              ) : (
                                <span className="text-xs font-bold text-gray-300 px-2.5">VS</span>
                              )}
                            </div>
                            <span className="flex-1 text-left text-sm font-semibold text-gray-800 truncate">{p.visitante_nombre}</span>
                          </div>

                          {/* Estado */}
                          <div className="shrink-0 flex items-center gap-1.5 w-24">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${estadoDot[p.estado]}`} />
                            <span className={`text-xs font-semibold ${estadoText[p.estado]}`}>{ESTADO_LABEL[p.estado]}</span>
                            {p.es_walkover && <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1 rounded">WO</span>}
                          </div>

                          {/* Fecha */}
                          <div className="shrink-0 w-32 hidden lg:block">
                            {p.fecha_hora ? (
                              <p className="text-[11px] text-gray-500 truncate">
                                {new Date(p.fecha_hora).toLocaleString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            ) : (
                              <span className="text-[11px] text-gray-300">—</span>
                            )}
                            {p.reprogramado_en && <RotateCcw className="w-3 h-3 text-amber-400 inline-block ml-1" />}
                          </div>

                          {/* Acciones */}
                          <div className="shrink-0 flex items-center gap-1">
                            {p.estado === "finalizado" && (
                              <button onClick={() => abrirCorreccionModal(p)}
                                className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition" title="Corregir resultado">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => setEditModal({ partido: p, form: { sede_id: p.sede_id ?? undefined, fecha_hora: p.fecha_hora ?? undefined, estado: p.estado }, fechaOriginal: p.fecha_hora })}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition" title="Programar / Editar">
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Modal edición */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Programar partido</h2>
                <p className="text-sm text-gray-500 mt-0.5">{editModal.partido.local_nombre} vs {editModal.partido.visitante_nombre}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Fecha y hora</label>
                <input type="datetime-local" value={editModal.form.fecha_hora ? editModal.form.fecha_hora.slice(0, 16) : ""}
                  onChange={e => setEditModal(m => m ? { ...m, form: { ...m.form, fecha_hora: e.target.value } } : null)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              {editModal.fechaOriginal && editModal.form.fecha_hora && editModal.form.fecha_hora.slice(0, 16) !== editModal.fechaOriginal.slice(0, 16) && (
                <div>
                  <label className="block text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1.5">Motivo de reprogramación <span className="text-red-500">*</span></label>
                  <textarea value={editModal.form.motivo_reprogramacion ?? ""}
                    onChange={e => setEditModal(m => m ? { ...m, form: { ...m.form, motivo_reprogramacion: e.target.value } } : null)}
                    maxLength={500} placeholder="Ej. Cambio de instalación por mantenimiento..." rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-amber-200 rounded-lg bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
                  <p className="mt-1 text-xs text-amber-600">Se notificará automáticamente a las instituciones participantes.</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sede / Ubicación</label>
                <select value={editModal.form.sede_id ?? ""}
                  onChange={e => setEditModal(m => m ? { ...m, form: { ...m.form, sede_id: e.target.value ? Number(e.target.value) : undefined } } : null)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Sin sede asignada</option>
                  {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre_sede} — {s.ciudad}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Estado</label>
                <select value={editModal.form.estado ?? "programado"}
                  onChange={e => setEditModal(m => m ? { ...m, form: { ...m.form, estado: e.target.value as EstadoPartido } } : null)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500">
                  {(["programado", "en_curso"] as EstadoPartido[]).map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
                </select>
                <p className="mt-1 text-xs text-gray-400">Para finalizar y registrar estadísticas usa la página de Resultados.</p>
              </div>
              {editModal.partido.reprogramado_en && editModal.partido.motivo_reprogramacion && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <p className="font-semibold mb-0.5">Historial de reprogramación:</p>
                  <p>{editModal.partido.motivo_reprogramacion}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={guardarEdicion} disabled={guardando} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal corrección */}
      {correccionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Corregir Resultado</h3>
                <p className="text-xs text-gray-400 mt-0.5">{correccionModal.partido.torneo_nombre} · {correccionModal.partido.ronda ?? `Jornada ${correccionModal.partido.jornada}`}</p>
              </div>
              <button onClick={() => setCorreccionModal(null)} className="text-gray-400 hover:text-gray-600 transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Al guardar se revertirán los puntos anteriores y se recalcularán automáticamente.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/50 flex items-center justify-center gap-6">
                <div className="text-right flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{correccionModal.partido.local_nombre}</p>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Local</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <input type="number" min={0} max={99} value={correccionModal.local}
                    onChange={e => setCorreccionModal(m => m ? { ...m, local: e.target.value } : null)}
                    className="w-14 text-center text-xl font-bold text-gray-900 border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <span className="text-gray-300 font-bold text-xl">—</span>
                  <input type="number" min={0} max={99} value={correccionModal.visitante}
                    onChange={e => setCorreccionModal(m => m ? { ...m, visitante: e.target.value } : null)}
                    className="w-14 text-center text-xl font-bold text-gray-900 border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{correccionModal.partido.visitante_nombre}</p>
                  <p className="text-xs text-gray-400 uppercase font-semibold">Visitante</p>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-1.5 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-amber-600" />Eventos ({modalEventos.length})
                </h4>
                {cargandoAtletasModal ? (
                  <div className="text-center py-4 text-sm text-gray-400">Cargando plantillas...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200/50">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase">Equipo</label>
                      <select value={nuevoEvento.equipoSelect} onChange={e => handleEquipoSelectChange(e.target.value as "local" | "visitante")}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                        <option value="local">Local</option>
                        <option value="visitante">Visitante</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase">Jugador</label>
                      <select value={nuevoEvento.atletaId} onChange={e => setNuevoEvento(prev => ({ ...prev, atletaId: Number(e.target.value) }))}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                        {(nuevoEvento.equipoSelect === "local" ? atletasLocal : atletasVisitante).map(a => (
                          <option key={a.id} value={a.id}>{a.nombre_completo} {a.numero_camiseta ? `(#${a.numero_camiseta})` : ""}</option>
                        ))}
                        {(nuevoEvento.equipoSelect === "local" ? atletasLocal : atletasVisitante).length === 0 && <option value="0">Sin jugadores</option>}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase">Tipo</label>
                      <select value={nuevoEvento.tipo} onChange={e => setNuevoEvento(prev => ({ ...prev, tipo: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                        {esFutbolDelPartido(correccionModal.partido) ? (
                          <><option value="gol">Gol</option><option value="tarjeta_amarilla">Tarjeta Amarilla</option><option value="tarjeta_roja">Tarjeta Roja</option></>
                        ) : (
                          <option value="puntos">Puntos anotados</option>
                        )}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase">Minuto</label>
                      <input type="number" min={1} max={120} placeholder="Ej. 45" value={nuevoEvento.minuto}
                        onChange={e => setNuevoEvento(prev => ({ ...prev, minuto: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-gray-400 uppercase">Descripción</label>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Ej. Penal / Falta fuerte" maxLength={100} value={nuevoEvento.descripcion}
                          onChange={e => setNuevoEvento(prev => ({ ...prev, descripcion: e.target.value }))}
                          className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        <button type="button" onClick={agregarEvento}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition">
                          <Plus className="w-3.5 h-3.5" />Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {modalEventos.length === 0 ? (
                  <div className="text-center py-5 text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">Sin eventos registrados</div>
                ) : (
                  <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50 shadow-sm">
                    {modalEventos.map((ev, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50 transition">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ev.tipo_evento === "gol" || ev.tipo_evento === "puntos" ? "bg-green-100 text-green-700" : ev.tipo_evento === "tarjeta_amarilla" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                            {ev.tipo_evento === "gol" ? "GOL" : ev.tipo_evento === "puntos" ? "PTS" : ev.tipo_evento === "tarjeta_amarilla" ? "TA" : "TR"}
                          </span>
                          <span className="font-semibold text-gray-900">{getNombreJugador(ev.atleta_jugador_id)}</span>
                          {ev.minuto != null && <span className="text-gray-400">{ev.minuto}&apos;</span>}
                          {ev.descripcion && <span className="text-gray-400 italic">({ev.descripcion})</span>}
                        </div>
                        <button type="button" onClick={() => eliminarEvento(idx)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-gray-50">
              <button type="button" onClick={() => setCorreccionModal(null)} className="px-4 py-2 border border-gray-200 text-gray-600 font-semibold rounded-lg text-sm hover:bg-gray-100 transition">Cancelar</button>
              <button type="button" onClick={guardarCorreccion} disabled={guardando || correccionModal.local === "" || correccionModal.visitante === ""}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white font-semibold rounded-lg text-sm transition inline-flex items-center gap-1.5">
                <Save className="w-4 h-4" />{guardando ? "Guardando..." : "Confirmar corrección"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
