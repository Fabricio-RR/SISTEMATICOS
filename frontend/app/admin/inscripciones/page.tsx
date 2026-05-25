"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { ClipboardList, CheckCircle, XCircle, Search, RefreshCw, Trash2, Plus, Filter, LogOut, Edit2, X, Loader2, HelpCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Inscripcion, Torneo, ClubEquipo, EstadoInscripcion, Partido } from "@/types/api";

//  Constantes y Utilidades 
type Tab = EstadoInscripcion;
const LABEL: Record<EstadoInscripcion, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  retirado: "Retirado",
};

const BADGE: Record<EstadoInscripcion, string> = {
  pendiente: "bg-amber-50 text-amber-700",
  aprobado: "bg-green-50 text-green-700",
  rechazado: "bg-red-50 text-red-600",
  retirado: "bg-gray-100 text-gray-500",
};

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed";

//  Tipos locales 
type ToastType = "success" | "error";
interface Toast { id: string; type: ToastType; message: string; }
type ModalFormState = { isOpen: boolean; mode: "create" | "edit"; data: Partial<Inscripcion> };

// Lógica de datos 
function useInscripcionesManager(addToast: (msg: string, type: ToastType) => void) {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [equipos, setEquipos] = useState<ClubEquipo[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [insc, torn, eq, part] = await Promise.all([
        api.getInscripciones(), api.getTorneos(), api.getEquipos(), api.getPartidos(),
      ]);
      setInscripciones(insc); setTorneos(torn); setEquipos(eq); setPartidos(part);
    } catch {
      addToast("Error al cargar la información del servidor.", "error");
    } finally {
      setCargando(false);
    }
  }, [addToast]);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiarEstado = async (id: number, accion: "aprobar" | "rechazar" | "retirar", successMsg: string) => {
    try {
      if (accion === "aprobar") await api.aprobarInscripcion(id);
      if (accion === "rechazar") await api.rechazarInscripcion(id);
      if (accion === "retirar") await api.retirarInscripcion(id);
      addToast(successMsg, "success");
      await cargar();
    } catch (err) {
      throw err;
    }
  };

  const crear = async (payload: any) => {
    try {
      await api.createInscripcion(payload);
      addToast("Inscripción registrada correctamente.", "success");
      await cargar();
    } catch (err) { throw err; }
  };

  const editar = async (id: number, payload: any) => {
    try {
      // Nota: Asume que api.updateInscripcion existe en tu backend para actualizar ej. el seeding
      await api.updateInscripcion(id, payload);
      addToast("Inscripción actualizada.", "success");
      await cargar();
    } catch (err) { throw err; }
  };

  const eliminar = async (id: number) => {
    try {
      await api.deleteInscripcion(id);
      addToast("Inscripción eliminada.", "success");
      await cargar();
    } catch (err) { throw err; }
  };

  return { inscripciones, torneos, equipos, partidos, cargando, recargar: cargar, crear, editar, eliminar, cambiarEstado };
}

// COMPONENTE pRINCIPAL
export default function InscripcionesPage() {
  //  Estados de UI 
  const [tab, setTab] = useState<Tab>("pendiente");
  const [torneoFiltro, setTorneoFiltro] = useState<number | undefined>();
  const [busqueda, setBusqueda] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Estados de Modales 
  const [modalForm, setModalForm] = useState<ModalFormState>({ isOpen: false, mode: "create", data: {} });
  const [inscripcionEliminar, setInscripcionEliminar] = useState<Inscripcion | null>(null);
  
  //  Estados de Carga (Spinners en botones) 
  const [procesandoAccion, setProcesandoAccion] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 4000);
  }, []);

  const { inscripciones, torneos, equipos, partidos, cargando, recargar, crear, editar, eliminar, cambiarEstado } = useInscripcionesManager(addToast);

  //  Accesibilidad
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalForm(p => ({ ...p, isOpen: false }));
        setInscripcionEliminar(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  //  Handlers  
  const handleCambiarEstado = async (id: number, accion: "aprobar" | "rechazar" | "retirar") => {
    setProcesandoAccion(id);
    const mensajes = { aprobar: "Inscripción aprobada.", rechazar: "Inscripción rechazada.", retirar: "Equipo retirado del torneo." };
    try {
      await cambiarEstado(id, accion, mensajes[accion]);
    } catch (err) {
      addToast(err instanceof Error ? err.message : `Error al ${accion}.`, "error");
    } finally {
      setProcesandoAccion(null);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, torneo_id, club_equipo_id, numero_seeding } = modalForm.data;

    if (modalForm.mode === "create" && (!torneo_id || !club_equipo_id)) {
      setErrorForm("Selecciona torneo y equipo."); return;
    }

    setGuardando(true); setErrorForm("");
    try {
      if (modalForm.mode === "create") {
        await crear({ torneo_id, club_equipo_id, numero_seeding });
      } else if (modalForm.mode === "edit" && id) {
        await editar(id, { numero_seeding });
      }
      setModalForm({ isOpen: false, mode: "create", data: {} });
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "Error al procesar la inscripción.");
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async () => {
    if (!inscripcionEliminar) return;
    setGuardando(true);
    try {
      await eliminar(inscripcionEliminar.id);
      setInscripcionEliminar(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al eliminar.", "error");
    } finally {
      setGuardando(false);
    }
  };

  //  Control de Lógica en Formulario de Creación 
  useEffect(() => {
    if (modalForm.mode !== "create" || !modalForm.data.torneo_id || !modalForm.data.club_equipo_id) return;
    
    const torneoSel = torneos.find(t => t.id === modalForm.data.torneo_id);
    const equipoSel = equipos.find(e => e.id === modalForm.data.club_equipo_id);
    const compatible = Boolean(torneoSel && equipoSel && equipoSel.estado === "aprobado" && equipoSel.deporte_id === torneoSel.deporte_id);
    const yaInscrito = inscripciones.some(i => i.torneo_id === modalForm.data.torneo_id && i.club_equipo_id === modalForm.data.club_equipo_id);
    
    if (!compatible || yaInscrito) {
      setModalForm(f => ({ ...f, data: { ...f.data, club_equipo_id: 0 } }));
    }
  }, [modalForm.data.torneo_id, modalForm.data.club_equipo_id, torneos, equipos, inscripciones, modalForm.mode]);

  //  Optimizaciones y cálculos derivados 
  const torneosAbiertos = useMemo(() => torneos.filter(t => t.estado === "inscripcion_abierta"), [torneos]);
  const equiposAprobados = useMemo(() => equipos.filter(e => e.estado === "aprobado"), [equipos]);
  
  const torneoSeleccionado = torneos.find(t => t.id === modalForm.data.torneo_id);
  const equiposCompatibles = useMemo(() => torneoSeleccionado ? equiposAprobados.filter(e => e.deporte_id === torneoSeleccionado.deporte_id) : equiposAprobados, [equiposAprobados, torneoSeleccionado]);
  const equiposYaInscritos = useMemo(() => new Set(modalForm.data.torneo_id ? inscripciones.filter(i => i.torneo_id === modalForm.data.torneo_id).map(i => i.club_equipo_id) : []), [inscripciones, modalForm.data.torneo_id]);
  const equiposDisponibles = useMemo(() => modalForm.data.torneo_id ? equiposCompatibles.filter(e => !equiposYaInscritos.has(e.id)) : equiposCompatibles, [equiposCompatibles, equiposYaInscritos, modalForm.data.torneo_id]);

  const inscripcionesConPartidos = useMemo(() => {
    const set = new Set<number>();
    partidos.forEach(p => {
      if (p.estado === "programado" || p.estado === "en_curso") {
        if (p.inscripcion_local_id != null) set.add(p.inscripcion_local_id);
        if (p.inscripcion_visitante_id != null) set.add(p.inscripcion_visitante_id);
      }
    });
    return set;
  }, [partidos]);

  const torneosSinComenzar = useMemo(() => new Set(torneos.filter(t => ["inscripcion_abierta", "inscripcion_cerrada", "en_sorteo"].includes(t.estado)).map(t => t.id)), [torneos]);
  const torneosActivosIds = useMemo(() => new Set(torneos.filter(t => t.estado !== "suspendido").map(t => t.id)), [torneos]);

  const inscripcionesFiltradas = useMemo(() => {
    return (torneoFiltro ? inscripciones.filter(i => i.torneo_id === torneoFiltro) : inscripciones).filter(i => torneosActivosIds.has(i.torneo_id));
  }, [inscripciones, torneoFiltro, torneosActivosIds]);

  const counts = useMemo<Record<Tab, number>>(() => ({
    pendiente: inscripcionesFiltradas.filter(i => i.estado === "pendiente").length,
    aprobado: inscripcionesFiltradas.filter(i => {
      if (i.estado !== "aprobado") return false;
      return inscripcionesConPartidos.has(i.id) || torneosSinComenzar.has(i.torneo_id);
    }).length,
    rechazado: inscripcionesFiltradas.filter(i => i.estado === "rechazado").length,
    retirado: inscripcionesFiltradas.filter(i => i.estado === "retirado").length,
  }), [inscripcionesFiltradas, inscripcionesConPartidos, torneosSinComenzar]);

  const listaRenderizada = useMemo(() => {
    return inscripcionesFiltradas
      .filter(i => i.estado === tab)
      .filter(i => {
        if (tab === "aprobado") {
          const tienePartidosPendientes = inscripcionesConPartidos.has(i.id);
          const torneoSinComenzar = torneosSinComenzar.has(i.torneo_id);
          if (!tienePartidosPendientes && !torneoSinComenzar) return false;
        }
        const texto = `${i.club_equipo?.nombre_equipo ?? ""} ${i.torneo?.nombre ?? ""}`.toLowerCase();
        return texto.includes(busqueda.toLowerCase().trim());
      });
  }, [inscripcionesFiltradas, tab, busqueda, inscripcionesConPartidos, torneosSinComenzar]);

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Inscripciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de equipos inscritos por torneo.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={recargar} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm">
            <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin text-gray-400" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <button onClick={() => { setModalForm({ isOpen: true, mode: "create", data: {} }); setErrorForm(""); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
            <Plus className="w-4 h-4" />
            Nueva inscripción
          </button>
        </div>
      </div>

      {/* Tabs Estadísticos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["pendiente", "aprobado", "rechazado", "retirado"] as Tab[]).map((estado) => (
          <button
            key={estado}
            onClick={() => setTab(estado)}
            className={`p-4 rounded-xl border text-left transition-all focus:outline-none focus:ring-2 focus:ring-red-500 ${
              tab === estado ? "border-red-200 bg-red-50 shadow-sm" : "border-gray-100 bg-white hover:border-gray-200"
            }`}
          >
            {cargando ? (
              <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mb-1"></div>
            ) : (
              <p className={`text-2xl font-bold ${tab === estado ? "text-red-700" : "text-gray-900"}`}>{counts[estado]}</p>
            )}
            <p className={`text-sm mt-1 font-medium ${tab === estado ? "text-red-600" : "text-gray-500"}`}>{LABEL[estado]}</p>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por equipo o torneo..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={torneoFiltro ?? ""}
            onChange={(e) => setTorneoFiltro(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full sm:w-auto pl-10 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium text-gray-700"
          >
            <option value="">Todos los torneos</option>
            {torneos.filter(t => t.estado !== "suspendido").map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Equipo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Torneo</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Seeding</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Estado</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cargando ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-40"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-10 mx-auto"></div></td>
                    <td className="px-4 py-4"><div className="h-5 bg-gray-100 rounded-full w-20 mx-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : listaRenderizada.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center">
                      <ClipboardList className="w-10 h-10 text-gray-200 mb-3" strokeWidth={1.5} />
                      <p className="text-sm font-medium text-gray-500">Sin inscripciones en estado <span className="lowercase font-bold">"{LABEL[tab]}"</span></p>
                      {busqueda && <p className="text-xs text-gray-400 mt-1">Intenta ajustando los términos de búsqueda.</p>}
                    </div>
                  </td>
                </tr>
              ) : (
                listaRenderizada.map((insc) => (
                  <tr key={insc.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {insc.club_equipo?.nombre_equipo ?? `Equipo #${insc.club_equipo_id}`}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">
                      {insc.torneo?.nombre ?? `Torneo #${insc.torneo_id}`}
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-semibold text-gray-500">{insc.numero_seeding ?? "—"}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${BADGE[insc.estado]}`}>
                        {LABEL[insc.estado]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {insc.estado === "pendiente" && (
                          <>
                            <button onClick={() => handleCambiarEstado(insc.id, "aprobar")} disabled={procesandoAccion === insc.id} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-30" title="Aprobar Inscripción">
                              {procesandoAccion === insc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                            <button onClick={() => handleCambiarEstado(insc.id, "rechazar")} disabled={procesandoAccion === insc.id} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-30" title="Rechazar Inscripción">
                              {procesandoAccion === insc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            </button>
                          </>
                        )}
                        {insc.estado === "aprobado" && (
                          <button onClick={() => handleCambiarEstado(insc.id, "retirar")} disabled={procesandoAccion === insc.id} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-30" title="Retirar equipo del torneo (W.O.)">
                            {procesandoAccion === insc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                          </button>
                        )}
                        {(insc.estado === "pendiente" || insc.estado === "aprobado") && (
                          <button onClick={() => { setModalForm({ isOpen: true, mode: "edit", data: { ...insc } }); setErrorForm(""); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500" title="Editar Inscripción">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setInscripcionEliminar(insc)} disabled={procesandoAccion === insc.id} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-30" title="Eliminar Registro">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DUAL: CREAR / EDITAR INSCRIPCIÓN */}
      {modalForm.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" onClick={() => setModalForm(p => ({ ...p, isOpen: false }))}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalForm(p => ({ ...p, isOpen: false }))} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${modalForm.mode === "create" ? "bg-red-50" : "bg-blue-50"}`}>
                {modalForm.mode === "create" ? <Plus className="w-4 h-4 text-red-600" /> : <Edit2 className="w-4 h-4 text-blue-600" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{modalForm.mode === "create" ? "Nueva Inscripción" : "Editar Inscripción"}</h2>
                {modalForm.mode === "edit" && <p className="text-xs text-gray-500 mt-0.5">{modalForm.data.club_equipo?.nombre_equipo} en {modalForm.data.torneo?.nombre}</p>}
              </div>
            </div>

            {modalForm.mode === "create" && torneosAbiertos.length === 0 && (
              <div className="mb-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>No hay torneos con inscripción abierta. Avanza el estado de un torneo para permitir nuevas inscripciones.</p>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Torneo {modalForm.mode === "create" && <span className="text-red-500">*</span>}</label>
                <select 
                  value={modalForm.data.torneo_id || ""} 
                  onChange={(e) => setModalForm(f => ({ ...f, data: { ...f.data, torneo_id: Number(e.target.value), club_equipo_id: 0 } }))} 
                  className={inputCls} 
                  disabled={guardando || modalForm.mode === "edit"}
                >
                  <option value="">Seleccionar torneo</option>
                  {modalForm.mode === "create" 
                    ? torneosAbiertos.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.temporada})</option>)
                    : torneos.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.temporada})</option>) // Mostrar todos si está editando para resolver el id
                  }
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Equipo {modalForm.mode === "create" && <span className="text-red-500">*</span>}</label>
                <select 
                  value={modalForm.data.club_equipo_id || ""} 
                  onChange={(e) => setModalForm(f => ({ ...f, data: { ...f.data, club_equipo_id: Number(e.target.value) } }))} 
                  className={inputCls} 
                  disabled={guardando || modalForm.mode === "edit" || !modalForm.data.torneo_id}
                >
                  <option value="">Seleccionar equipo compatible</option>
                  {modalForm.mode === "create" && equiposDisponibles.length === 0 && modalForm.data.torneo_id && (
                    <option disabled value="">— No hay equipos compatibles disponibles —</option>
                  )}
                  {modalForm.mode === "create" 
                    ? equiposDisponibles.map(e => <option key={e.id} value={e.id}>{e.nombre_equipo}</option>)
                    : equipos.map(e => <option key={e.id} value={e.id}>{e.nombre_equipo}</option>)
                  }
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° de Seeding (Opcional)</label>
                <input
                  type="number" min={1} max={999}
                  value={modalForm.data.numero_seeding || ""}
                  onChange={(e) => setModalForm(f => ({ ...f, data: { ...f.data, numero_seeding: e.target.value ? Number(e.target.value) : undefined } }))}
                  placeholder="Ej. 1"
                  className={inputCls}
                  disabled={guardando}
                />
                <p className="mt-1.5 text-xs text-gray-400">Usado para ordenamiento en sorteos y emparejamientos.</p>
              </div>

              {errorForm && <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg border border-red-100 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{errorForm}</div>}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setModalForm(p => ({ ...p, isOpen: false }))} disabled={guardando} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition focus:outline-none focus:ring-2 focus:ring-gray-300">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando || (modalForm.mode === "create" && (!modalForm.data.torneo_id || !modalForm.data.club_equipo_id))} className={`flex-1 py-2.5 text-sm font-bold text-white rounded-lg transition flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${modalForm.mode === "create" ? "bg-red-600 hover:bg-red-700 focus:ring-red-500" : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"}`}>
                  {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                  {guardando ? "Procesando..." : modalForm.mode === "create" ? "Inscribir equipo" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE SEGURIDAD: ELIMINAR */}
      {inscripcionEliminar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity" onClick={() => setInscripcionEliminar(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center shrink-0"><HelpCircle className="w-5 h-5 text-red-600" /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">¿Eliminar inscripción?</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Borrarás permanentemente la inscripción de <strong className="text-gray-900">"{inscripcionEliminar.club_equipo?.nombre_equipo}"</strong> en el torneo.
                  Si tiene partidos asignados, causará errores en el fixture.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setInscripcionEliminar(null)} disabled={guardando} className="px-4 py-2 font-semibold text-gray-600 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition focus:outline-none focus:ring-2 focus:ring-gray-300">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={guardando} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm flex items-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, eliminar"}
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