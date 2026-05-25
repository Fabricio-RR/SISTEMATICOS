"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, RefreshCw, Filter, AlertCircle, RotateCcw, Pencil, X, Plus, Trash2, ClipboardList, Save, ChevronDown, Swords, CheckCircle2, Loader2, HelpCircle} from "lucide-react";
import { api } from "@/lib/api";
import type { 
  Partido, Torneo, Deporte, EstadoPartido, Sede, 
  AtletaJugador, EventoPartidoCreate, ClubEquipo 
} from "@/types/api";

// Constantes Globales 
const ESTADO_LABEL: Record<EstadoPartido, string> = {
  programado: "Programado",
  en_curso: "En curso",
  finalizado: "Finalizado",
};

const TIPO_INFO: Record<string, { label: string; bg: string }> = {
  gol:              { label: "GOL", bg: "bg-emerald-500 text-white" },
  puntos:           { label: "PTS", bg: "bg-blue-500 text-white"   },
  tarjeta_amarilla: { label: "TA",  bg: "bg-amber-400 text-white"  },
  tarjeta_roja:     { label: "TR",  bg: "bg-red-600 text-white"    },
};

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all";
const scoreInputCls = "w-14 h-14 text-center text-3xl font-black text-gray-900 bg-white rounded-xl border-0 focus:outline-none focus:ring-4 focus:ring-red-300 transition shadow disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed disabled:shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// Tipos Locales 
type ToastType = "success" | "error";
interface Toast { id: string; type: ToastType; message: string; }
type ModalFormState = { isOpen: boolean; mode: "create" | "edit"; data: Partial<Partido>; fechaOriginal?: string | null };
type ModalResultadoState = { isOpen: boolean; mode: "registro" | "correccion"; partido: Partido; local: string; visitante: string; };

//  Manejo de Datos y CRUD
function useEncuentrosManager(torneoFiltro: number | undefined, deporteFiltro: number | undefined, estadoFiltro: EstadoPartido | "", addToast: (msg: string, type: ToastType) => void) {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [equipos, setEquipos] = useState<ClubEquipo[]>([]); // Necesario para crear
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [p, t, dep, s, eq] = await Promise.all([
        api.getPartidos({ torneo_id: torneoFiltro, deporte_id: !torneoFiltro ? deporteFiltro : undefined, estado: estadoFiltro || undefined }),
        api.getTorneos(),
        api.getDeportes(),
        api.getSedes(),
        api.getEquipos()
      ]);
      setPartidos(p); setTorneos(t); setDeportes(dep); setSedes(s); setEquipos(eq);
    } catch {
      addToast("No se pudo cargar la información de los encuentros.", "error");
    } finally {
      setCargando(false);
    }
  }, [torneoFiltro, deporteFiltro, estadoFiltro, addToast]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (payload: Partial<Partido>) => {
    try {
      await api.createPartido(payload as any);
      addToast("Encuentro creado correctamente.", "success");
      await cargar();
    } catch (err) { throw err; }
  };

  const editar = async (id: number, payload: Partial<Partido>) => {
    try {
      await api.updatePartido(id, payload as any);
      addToast("Encuentro actualizado correctamente.", "success");
      await cargar();
    } catch (err) { throw err; }
  };

  const eliminar = async (id: number) => {
    try {
      await api.deletePartido(id);
      addToast("Encuentro eliminado permanentemente.", "success");
      await cargar();
    } catch (err) { throw err; }
  };

  const registrarResultado = async (id: number, data: { resultado_local: number; resultado_visitante: number; eventos: EventoPartidoCreate[] }) => {
    try {
      await api.setResultado(id, data);
      addToast("Resultado procesado exitosamente.", "success");
      await cargar();
    } catch (err) { throw err; }
  };

  return { partidos, torneos, deportes, sedes, equipos, cargando, recargar: cargar, crear, editar, eliminar, registrarResultado };
}

// COMPONENTE PRINCIPAL
export default function EncuentrosPage() {
  const searchParams = useSearchParams();
  
  //  Filtros 
  const [deporteFiltro, setDeporteFiltro] = useState<number | undefined>();
  const [torneoFiltro, setTorneoFiltro] = useState<number | undefined>(() => { const v = searchParams.get("torneo_id"); return v ? Number(v) : undefined; });
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoPartido | "">("");
  
  //  UI y Modales 
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState(false);
  const [modalForm, setModalForm] = useState<ModalFormState>({ isOpen: false, mode: "create", data: {} });
  const [partidoEliminar, setPartidoEliminar] = useState<Partido | null>(null);
  
  // Modal Unificado de Resultados
  const [modalResultado, setModalResultado] = useState<ModalResultadoState | null>(null);
  const [modalEventos, setModalEventos] = useState<EventoPartidoCreate[]>([]);
  const [atletasLocal, setAtletasLocal] = useState<AtletaJugador[]>([]);
  const [atletasVisitante, setAtletasVisitante] = useState<AtletaJugador[]>([]);
  const [cargandoAtletasModal, setCargandoAtletasModal] = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState<{ equipoSelect: "local" | "visitante"; atletaId: number; tipo: string; minuto: string; descripcion: string; }>({ equipoSelect: "local", atletaId: 0, tipo: "gol", minuto: "", descripcion: "" });

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 4000);
  }, []);

  const { partidos, torneos, deportes, sedes, equipos, cargando, recargar, crear, editar, eliminar, registrarResultado } = useEncuentrosManager(torneoFiltro, deporteFiltro, estadoFiltro, addToast);

  const depMap = useMemo(() => new Map(deportes.map(d => [d.id, d])), [deportes]);

  function esFutbolDelPartido(partido: Partido | Partial<Partido>): boolean {
    const t = torneos.find(tor => tor.id === partido.torneo_id || tor.nombre === partido.torneo_nombre);
    if (!t) return false;
    const dep = depMap.get(t.deporte_id);
    if (!dep) return false;
    return dep.nombre.toLowerCase().includes("fútbol") || dep.nombre.toLowerCase().includes("futbol");
  }

  // Handlers de Teclado 
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalForm(p => ({ ...p, isOpen: false }));
        setPartidoEliminar(null);
        setModalResultado(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lógica de formulario crear/editar
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, torneo_id, local_club_equipo_id, visitante_club_equipo_id, fecha_hora, motivo_reprogramacion } = modalForm.data;

    if (modalForm.mode === "create" && (!torneo_id || !local_club_equipo_id || !visitante_club_equipo_id)) {
      addToast("Faltan seleccionar el torneo y los equipos.", "error"); return;
    }

    if (modalForm.mode === "edit" && modalForm.fechaOriginal) {
      const fechaAnterior = modalForm.fechaOriginal.slice(0, 16);
      const fechaNueva = fecha_hora ? fecha_hora.slice(0, 16) : null;
      if (fechaAnterior !== fechaNueva && (!motivo_reprogramacion || !motivo_reprogramacion.trim())) {
        addToast("Debes ingresar el motivo de la reprogramación.", "error"); return;
      }
      if (motivo_reprogramacion && motivo_reprogramacion.length > 500) {
        addToast("El motivo es demasiado largo (máx. 500 caracteres).", "error"); return;
      }
    }

    setGuardando(true);
    try {
      if (modalForm.mode === "create") {
        await crear(modalForm.data);
      } else if (modalForm.mode === "edit" && id) {
        await editar(id, modalForm.data);
      }
      setModalForm({ isOpen: false, mode: "create", data: {} });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al procesar la solicitud.", "error");
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async () => {
    if (!partidoEliminar) return;
    setGuardando(true);
    try {
      await eliminar(partidoEliminar.id);
      setPartidoEliminar(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al eliminar el encuentro.", "error");
    } finally {
      setGuardando(false);
    }
  };

  //  Lógica de resultados 
  async function cargarAtletasParaModal(p: Partido) {
    setAtletasLocal([]); setAtletasVisitante([]);
    setCargandoAtletasModal(true);
    try {
      const [atsL, atsV] = await Promise.all([
        p.local_club_equipo_id ? api.getAtletas(p.local_club_equipo_id) : Promise.resolve([]),
        p.visitante_club_equipo_id ? api.getAtletas(p.visitante_club_equipo_id) : Promise.resolve([]),
      ]);
      setAtletasLocal(atsL); setAtletasVisitante(atsV);
      if (atsL.length > 0) setNuevoEvento(prev => ({ ...prev, atletaId: atsL[0].id }));
    } catch { 
      addToast("Error al cargar las plantillas de los equipos.", "error"); 
    } finally { 
      setCargandoAtletasModal(false); 
    }
  }

  async function abrirModalResultado(p: Partido, mode: "registro" | "correccion") {
    setModalResultado({ 
      isOpen: true, mode, partido: p, 
      local: mode === "correccion" ? String(p.resultado_local ?? "") : "", 
      visitante: mode === "correccion" ? String(p.resultado_visitante ?? "") : "" 
    });
    setModalEventos(mode === "correccion" && p.eventos ? p.eventos.map(e => ({ atleta_jugador_id: e.atleta_jugador_id ?? 0, tipo_evento: e.tipo_evento, minuto: e.minuto || undefined, descripcion: e.descripcion || undefined })) : []);
    setNuevoEvento({ equipoSelect: "local", atletaId: 0, tipo: "gol", minuto: "", descripcion: "" });
    await cargarAtletasParaModal(p);
  }

  function handleEquipoSelectChange(eq: "local" | "visitante") {
    const list = eq === "local" ? atletasLocal : atletasVisitante;
    setNuevoEvento(prev => ({ ...prev, equipoSelect: eq, atletaId: list.length > 0 ? list[0].id : 0 }));
  }

  function agregarEvento() {
    if (nuevoEvento.atletaId === 0) { addToast("Selecciona un jugador para el evento.", "error"); return; }
    setModalEventos(prev => [...prev, { atleta_jugador_id: nuevoEvento.atletaId, tipo_evento: nuevoEvento.tipo, minuto: nuevoEvento.minuto ? Number(nuevoEvento.minuto) : null, descripcion: nuevoEvento.descripcion || null }]);
    if (nuevoEvento.tipo === "gol" && modalResultado) {
      if (nuevoEvento.equipoSelect === "local") setModalResultado(m => m ? { ...m, local: String(Number(m.local || 0) + 1) } : null);
      else setModalResultado(m => m ? { ...m, visitante: String(Number(m.visitante || 0) + 1) } : null);
    }
    setNuevoEvento(prev => ({ ...prev, minuto: "", descripcion: "" }));
  }

  function eliminarEvento(index: number) {
    const ev = modalEventos[index];
    if (ev.tipo_evento === "gol" && modalResultado) {
      const esLocal = atletasLocal.some(a => a.id === ev.atleta_jugador_id);
      if (esLocal) setModalResultado(m => m ? { ...m, local: String(Math.max(0, Number(m.local || 0) - 1)) } : null);
      else setModalResultado(m => m ? { ...m, visitante: String(Math.max(0, Number(m.visitante || 0) - 1)) } : null);
    }
    setModalEventos(prev => prev.filter((_, i) => i !== index));
  }

  function getNombreJugador(atletaId: number): string {
    const a = [...atletasLocal, ...atletasVisitante].find(item => item.id === atletaId);
    return a ? `${a.nombre_completo} (#${a.numero_camiseta ?? "—"})` : `Jugador #${atletaId}`;
  }

  const handleSaveResultado = async () => {
    if (!modalResultado) return;
    const esFut = esFutbolDelPartido(modalResultado.partido);
    let rl: number, rv: number;

    if (modalResultado.mode === "correccion" || !esFut) {
      rl = Number(modalResultado.local); rv = Number(modalResultado.visitante);
      if (!Number.isInteger(rl) || !Number.isInteger(rv) || rl < 0 || rv < 0 || modalResultado.local === "" || modalResultado.visitante === "") { 
        addToast("Ingresa marcadores válidos (números enteros ≥ 0).", "error"); return; 
      }
    } else {
      rl = modalEventos.filter(e => e.tipo_evento === "gol" && atletasLocal.some(a => a.id === e.atleta_jugador_id)).length;
      rv = modalEventos.filter(e => e.tipo_evento === "gol" && atletasVisitante.some(a => a.id === e.atleta_jugador_id)).length;
    }

    setGuardando(true);
    try {
      await registrarResultado(modalResultado.partido.id, { resultado_local: rl, resultado_visitante: rv, eventos: modalEventos });
      setModalResultado(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al procesar el resultado", "error");
    } finally {
      setGuardando(false);
    }
  };

  // Filtros derivados 
  const torneosFiltrados = useMemo(() => deporteFiltro ? torneos.filter(t => t.deporte_id === deporteFiltro) : torneos, [deporteFiltro, torneos]);
  const torneosSuspendidosIds = useMemo(() => new Set(torneos.filter(t => t.estado === "suspendido").map(t => t.id)), [torneos]);
  const partidosActivos = useMemo(() => partidos.filter(p => {
    const torneo = torneos.find(t => t.nombre === p.torneo_nombre);
    return torneo && !torneosSuspendidosIds.has(torneo.id);
  }), [partidos, torneos, torneosSuspendidosIds]);

  const estadoDot: Record<EstadoPartido, string> = { programado: "bg-blue-400", en_curso: "bg-amber-400 animate-pulse", finalizado: "bg-emerald-400" };
  const estadoText: Record<EstadoPartido, string> = { programado: "text-blue-600", en_curso: "text-amber-600", finalizado: "text-emerald-600" };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Encuentros</h1>
          <p className="text-sm text-gray-400 mt-0.5">Programación, registro de resultados y seguimiento de partidos.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={recargar} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm">
            <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin text-gray-400" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <button onClick={() => setModalForm({ isOpen: true, mode: "create", data: { estado: "programado" } })} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nuevo encuentro
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
        <Filter className="w-4 h-4 text-gray-400 shrink-0" />
        <select value={deporteFiltro ?? ""} onChange={e => { setDeporteFiltro(e.target.value ? Number(e.target.value) : undefined); setTorneoFiltro(undefined); }} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-gray-700 min-w-[160px]">
          <option value="">Todos los deportes</option>
          {deportes.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
        <select value={torneoFiltro ?? ""} onChange={e => setTorneoFiltro(e.target.value ? Number(e.target.value) : undefined)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-gray-700 min-w-[160px]">
          <option value="">Todos los torneos</option>
          {torneosFiltrados.filter(t => t.estado !== "suspendido").map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value as EstadoPartido | "")} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-gray-700">
          <option value="">Todos los estados</option>
          {(["programado", "en_curso", "finalizado"] as EstadoPartido[]).map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
        </select>
        {!cargando && <span className="ml-auto text-xs text-gray-400 hidden sm:block">{partidosActivos.length} encuentro{partidosActivos.length !== 1 ? "s" : ""}</span>}
      </div>

      {/* Lista (Accordion) */}
      {cargando ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-white border border-gray-100 rounded-xl animate-pulse shadow-sm" />
          ))}
        </div>
      ) : partidosActivos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-gray-100 rounded-xl shadow-sm gap-3">
          <Calendar className="w-10 h-10 text-gray-200" strokeWidth={1.5} />
          <p className="text-sm font-medium text-gray-500">Sin partidos para los filtros seleccionados</p>
        </div>
      ) : (() => {
        const porTorneo = new Map<string, Partido[]>();
        for (const p of partidosActivos) {
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
                  <button
                    onClick={() => {
                      if (soloUnTorneo) return;
                      setExpandidos(prev => {
                        const n = new Set(prev);
                        if (n.has(torneoNombre)) n.delete(torneoNombre); else n.add(torneoNombre);
                        return n;
                      });
                    }}
                    className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors focus:outline-none ${soloUnTorneo ? "" : "hover:bg-gray-50/80 cursor-pointer"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{torneoNombre}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-gray-500 font-medium">{ps.length} partido{ps.length !== 1 ? "s" : ""}</span>
                        {finCount > 0 && <span className="text-[11px] text-emerald-600 font-medium">{finCount} finalizado{finCount !== 1 ? "s" : ""}</span>}
                        {cursoCount > 0 && <span className="text-[11px] text-amber-600 font-medium animate-pulse">{cursoCount} en curso</span>}
                        {progCount > 0 && <span className="text-[11px] text-blue-500 font-medium">{progCount} programado{progCount !== 1 ? "s" : ""}</span>}
                      </div>
                    </div>
                    {!soloUnTorneo && <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`} />}
                  </button>

                  {abierto && (
                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                      {ps.map(p => (
                        <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3 sm:py-2.5 hover:bg-gray-50/60 transition-colors group">
                          <span className="w-full sm:w-20 shrink-0 text-[10px] font-bold text-gray-400 uppercase truncate">
                            {p.ronda ?? `J${p.jornada}`}
                          </span>

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
                                <div className="flex items-center gap-1 bg-amber-500 rounded-md px-2.5 py-0.5 shadow-sm">
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

                          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                            <div className="shrink-0 flex items-center gap-1.5 w-24">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${estadoDot[p.estado]}`} />
                              <span className={`text-xs font-semibold ${estadoText[p.estado]}`}>{ESTADO_LABEL[p.estado]}</span>
                              {p.es_walkover && <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1 rounded">WO</span>}
                            </div>

                            <div className="shrink-0 w-32 hidden lg:block text-right">
                              {p.fecha_hora ? (
                                <p className="text-[11px] text-gray-500 truncate">
                                  {new Date(p.fecha_hora).toLocaleString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              ) : <span className="text-[11px] text-gray-300">—</span>}
                              {p.reprogramado_en && <RotateCcw className="w-3 h-3 text-amber-400 inline-block ml-1" title="Reprogramado" />}
                            </div>

                            <div className="shrink-0 flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              {(p.estado === "programado" || p.estado === "en_curso") && (
                                <button onClick={() => abrirModalResultado(p, "registro")} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition" title="Registrar resultado">
                                  <Swords className="w-4 h-4" />
                                </button>
                              )}
                              {p.estado === "finalizado" && (
                                <button onClick={() => abrirModalResultado(p, "correccion")} className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition" title="Corregir resultado">
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={() => setModalForm({ isOpen: true, mode: "edit", data: { ...p, sede_id: p.sede_id ?? undefined, fecha_hora: p.fecha_hora ?? undefined }, fechaOriginal: p.fecha_hora })} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition" title="Programar / Editar">
                                <Calendar className="w-4 h-4" />
                              </button>
                              <button onClick={() => setPartidoEliminar(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition" title="Eliminar encuentro">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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

      {/* MODAL DUAL: CREAR / EDITAR ENCUENTRO */}
      {modalForm.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" onClick={() => setModalForm(p => ({ ...p, isOpen: false }))}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${modalForm.mode === "create" ? "bg-red-50" : "bg-blue-50"}`}>
                  {modalForm.mode === "create" ? <Plus className="w-4 h-4 text-red-600" /> : <Pencil className="w-4 h-4 text-blue-600" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{modalForm.mode === "create" ? "Nuevo encuentro" : "Editar encuentro"}</h2>
                  {modalForm.mode === "edit" && <p className="text-sm text-gray-500 mt-0.5">{modalForm.data.local_nombre} vs {modalForm.data.visitante_nombre}</p>}
                </div>
              </div>
              <button onClick={() => setModalForm(p => ({ ...p, isOpen: false }))} className="text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              {modalForm.mode === "create" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Torneo <span className="text-red-500">*</span></label>
                    <select value={modalForm.data.torneo_id || ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, torneo_id: Number(e.target.value) } }))} required className={inputCls} disabled={guardando}>
                      <option value="">Seleccionar torneo</option>
                      {torneos.filter(t => t.estado !== "suspendido").map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ronda / Jornada</label>
                      <input type="number" min={1} value={modalForm.data.jornada || ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, jornada: Number(e.target.value) } }))} placeholder="Ej. 1" className={inputCls} disabled={guardando} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre (Opcional)</label>
                      <input type="text" value={modalForm.data.ronda || ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, ronda: e.target.value } }))} placeholder="Ej. Final" className={inputCls} disabled={guardando} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Equipo Local <span className="text-red-500">*</span></label>
                    <select value={modalForm.data.local_club_equipo_id || ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, local_club_equipo_id: Number(e.target.value) } }))} required className={inputCls} disabled={guardando}>
                      <option value="">Seleccionar local</option>
                      {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre_equipo}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Equipo Visitante <span className="text-red-500">*</span></label>
                    <select value={modalForm.data.visitante_club_equipo_id || ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, visitante_club_equipo_id: Number(e.target.value) } }))} required className={inputCls} disabled={guardando}>
                      <option value="">Seleccionar visitante</option>
                      {equipos.map(eq => <option key={eq.id} value={eq.id}>{eq.nombre_equipo}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Fecha y hora (Opcional)</label>
                <input type="datetime-local" value={modalForm.data.fecha_hora ? modalForm.data.fecha_hora.slice(0, 16) : ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, fecha_hora: e.target.value } }))} className={inputCls} disabled={guardando} />
              </div>

              {modalForm.mode === "edit" && modalForm.fechaOriginal && modalForm.data.fecha_hora && modalForm.data.fecha_hora.slice(0, 16) !== modalForm.fechaOriginal.slice(0, 16) && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5">Motivo de reprogramación <span className="text-red-500">*</span></label>
                  <textarea value={modalForm.data.motivo_reprogramacion ?? ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, motivo_reprogramacion: e.target.value } }))} maxLength={500} placeholder="Ej. Cambio por lluvia..." rows={2} className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none bg-white" disabled={guardando} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Sede</label>
                  <select value={modalForm.data.sede_id ?? ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, sede_id: e.target.value ? Number(e.target.value) : undefined } }))} className={inputCls} disabled={guardando}>
                    <option value="">Sin asignar</option>
                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre_sede}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Estado</label>
                  <select value={modalForm.data.estado ?? "programado"} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, estado: e.target.value as EstadoPartido } }))} className={inputCls} disabled={guardando}>
                    {(["programado", "en_curso"] as EstadoPartido[]).map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setModalForm(p => ({ ...p, isOpen: false }))} disabled={guardando} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancelar</button>
                <button type="submit" disabled={guardando} className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition flex items-center justify-center gap-2 ${modalForm.mode === "create" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                  {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                  {guardando ? "Guardando..." : modalForm.mode === "create" ? "Crear partido" : "Actualizar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UNIFICADO: REGISTRO Y CORRECCIÓN DE RESULTADOS */}
      {modalResultado && (() => {
        const esFut = esFutbolDelPartido(modalResultado.partido);
        const golesL = modalEventos.filter(e => e.tipo_evento === "gol" && atletasLocal.some(a => a.id === e.atleta_jugador_id)).length;
        const golesV = modalEventos.filter(e => e.tipo_evento === "gol" && atletasVisitante.some(a => a.id === e.atleta_jugador_id)).length;
        const tiposEvento = esFut
          ? [
              { key: "gol",              icon: "⚽", label: "Gol",     active: "bg-emerald-600 text-white border-emerald-600" },
              { key: "tarjeta_amarilla", icon: "🟨", label: "Amarilla",active: "bg-amber-400 text-white border-amber-400" },
              { key: "tarjeta_roja",     icon: "🟥", label: "Roja",    active: "bg-red-600 text-white border-red-600" },
            ]
          : [{ key: "puntos", icon: "🏀", label: "Puntos", active: "bg-blue-600 text-white border-blue-600" }];
        const atletasActivos = nuevoEvento.equipoSelect === "local" ? atletasLocal : atletasVisitante;

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
              <div className={`px-6 py-4 flex items-center justify-between border-b border-gray-100 ${modalResultado.mode === "correccion" ? "bg-amber-50" : "bg-white"}`}>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    {modalResultado.mode === "correccion" ? <Pencil className="w-5 h-5 text-amber-600" /> : <Swords className="w-5 h-5 text-red-600" />}
                    {modalResultado.mode === "correccion" ? "Corregir Resultado" : "Registrar Resultado"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{modalResultado.partido.torneo_nombre} · {modalResultado.partido.ronda ?? `Jornada ${modalResultado.partido.jornada}`}</p>
                </div>
                <button onClick={() => setModalResultado(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-white transition"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto bg-gray-50/50">
                {modalResultado.mode === "correccion" && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" /> Al guardar se revertirán los puntos anteriores en la tabla de posiciones.
                  </p>
                )}

                <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 flex items-center justify-center gap-6 shadow-xl">
                  <div className="text-right flex-1 min-w-0">
                    <p className="text-base sm:text-lg font-bold text-white truncate">{modalResultado.partido.local_nombre}</p>
                    <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Local</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <input type="number" min={0} max={99} 
                      value={esFut && modalResultado.mode === "registro" ? Math.max(Number(modalResultado.local || 0), golesL) : modalResultado.local}
                      onChange={e => setModalResultado(m => m ? { ...m, local: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) } : null)}
                      className={scoreInputCls} disabled={esFut && modalResultado.mode === "registro"} placeholder="0" />
                    <span className="text-white/20 font-black text-2xl select-none">–</span>
                    <input type="number" min={0} max={99} 
                      value={esFut && modalResultado.mode === "registro" ? Math.max(Number(modalResultado.visitante || 0), golesV) : modalResultado.visitante}
                      onChange={e => setModalResultado(m => m ? { ...m, visitante: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) } : null)}
                      className={scoreInputCls} disabled={esFut && modalResultado.mode === "registro"} placeholder="0" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-base sm:text-lg font-bold text-white truncate">{modalResultado.partido.visitante_nombre}</p>
                    <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Visitante</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-gray-400" /> Eventos del partido ({modalEventos.length}) <span className="text-xs font-normal text-gray-400">· Opcional</span>
                  </h4>
                  
                  {cargandoAtletasModal ? (
                    <div className="text-center py-6 text-sm text-gray-400 bg-white border border-gray-200 rounded-xl">Cargando plantillas...</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Equipo</label>
                        <select value={nuevoEvento.equipoSelect} onChange={e => handleEquipoSelectChange(e.target.value as "local" | "visitante")} className={inputCls}>
                          <option value="local">{modalResultado.partido.local_nombre}</option>
                          <option value="visitante">{modalResultado.partido.visitante_nombre}</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Jugador</label>
                        <select value={nuevoEvento.atletaId} onChange={e => setNuevoEvento(prev => ({ ...prev, atletaId: Number(e.target.value) }))} className={inputCls}>
                          {atletasActivos.map(a => <option key={a.id} value={a.id}>{a.nombre_completo} {a.numero_camiseta ? `(#${a.numero_camiseta})` : ""}</option>)}
                          {atletasActivos.length === 0 && <option value="0">Sin jugadores</option>}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tipo</label>
                        <div className="flex gap-1.5 h-[42px]">
                          {tiposEvento.map(t => (
                            <button key={t.key} onClick={() => setNuevoEvento(prev => ({ ...prev, tipo: t.key }))} className={`flex-1 text-[10px] font-bold rounded-lg border-2 transition flex items-center justify-center gap-1 ${nuevoEvento.tipo === t.key ? t.active : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                              <span className="text-sm">{t.icon}</span> <span className="hidden sm:inline">{t.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Min. (Opc.)</label>
                        <input type="number" min={1} max={120} placeholder="Ej. 45" value={nuevoEvento.minuto} onChange={e => setNuevoEvento(prev => ({ ...prev, minuto: e.target.value }))} className={inputCls} />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nota (Opcional)</label>
                        <div className="flex gap-2">
                          <input type="text" maxLength={60} placeholder="Ej. Penal, de cabeza..." value={nuevoEvento.descripcion} onChange={e => setNuevoEvento(prev => ({ ...prev, descripcion: e.target.value }))} className={`flex-1 ${inputCls}`} />
                          <button onClick={agregarEvento} className="shrink-0 px-4 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm">
                            <Plus className="w-4 h-4" /> Agregar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {modalEventos.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 shadow-sm">
                      {modalEventos.map((ev, idx) => {
                        const info = TIPO_INFO[ev.tipo_evento] ?? { label: ev.tipo_evento, bg: "bg-gray-400 text-white" };
                        return (
                          <div key={idx} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition">
                            <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm ${info.bg}`}>{info.label}</span>
                            <span className="flex-1 text-sm font-semibold text-gray-900 truncate">{getNombreJugador(ev.atleta_jugador_id)}</span>
                            {ev.minuto != null && <span className="text-xs text-gray-500 font-medium shrink-0">{ev.minuto}&apos;</span>}
                            {ev.descripcion && <span className="text-xs text-gray-400 italic shrink-0 hidden sm:block max-w-[150px] truncate">{ev.descripcion}</span>}
                            <button onClick={() => eliminarEvento(idx)} className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs text-gray-500 font-medium w-full sm:w-auto text-center sm:text-left">
                  {esFut || modalResultado.mode === "correccion"
                    ? <span className="text-emerald-600 font-semibold flex items-center justify-center sm:justify-start gap-1"><CheckCircle2 className="w-4 h-4" /> Listo para guardar</span>
                    : (modalResultado.local !== "" && modalResultado.visitante !== ""
                      ? <span className="text-emerald-600 font-semibold flex items-center justify-center sm:justify-start gap-1"><CheckCircle2 className="w-4 h-4" /> Marcador registrado</span>
                      : "Ingresa el marcador para continuar")
                  }
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => setModalResultado(null)} className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancelar</button>
                  <button onClick={handleSaveResultado} disabled={guardando || (modalResultado.mode === "registro" && !esFut && (modalResultado.local === "" || modalResultado.visitante === ""))} className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-white rounded-lg transition flex items-center justify-center gap-2 shadow-sm ${modalResultado.mode === "correccion" ? "bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300" : "bg-red-600 hover:bg-red-700 disabled:bg-red-300"}`}>
                    {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                    {guardando ? "Procesando..." : modalResultado.mode === "correccion" ? "Confirmar corrección" : "Finalizar partido"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DE SEGURIDAD: ELIMINAR */}
      {partidoEliminar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity" onClick={() => setPartidoEliminar(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center shrink-0"><HelpCircle className="w-5 h-5 text-red-600" /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">¿Eliminar encuentro?</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Borrarás el partido <strong className="text-gray-900">"{partidoEliminar.local_nombre} vs {partidoEliminar.visitante_nombre}"</strong>. Si tiene resultados o estadísticas asociadas, también se perderán permanentemente.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setPartidoEliminar(null)} disabled={guardando} className="px-4 py-2 font-semibold text-gray-600 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={handleDelete} disabled={guardando} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm flex items-center gap-2 transition">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS MANAGER */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right-5 fade-in duration-300 pointer-events-auto ${toast.type === "success" ? "bg-gray-900 text-white" : "bg-red-600 text-white"}`}>
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.message}
            <button onClick={() => setToasts(p => p.filter(t => t.id !== toast.id))} className="ml-2 opacity-70 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}