"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { User, Plus, Trash2, Search, AlertCircle, Save, ChevronDown, X, Loader2, HelpCircle, CheckCircle2, Edit2 } from "lucide-react";
import { api } from "@/lib/api";
import type { AtletaJugador, ClubEquipo, Deporte } from "@/types/api";

//  Tipos y Clases Globales 
const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all";

type StatEdit = { goles_anotados?: number; puntos_anotados?: number; tarjetas_amarillas?: number; tarjetas_rojas?: number };
type ToastType = "success" | "error";
interface Toast { id: string; type: ToastType; message: string; }
type ModalFormState = { isOpen: boolean; mode: "create" | "edit"; data: Partial<AtletaJugador> };

function esFutbol(deporte: Deporte | undefined): boolean {
  if (!deporte) return false;
  const n = deporte.nombre.toLowerCase();
  return n.includes("fútbol") || n.includes("futbol");
}

// Lógica de Datos
function useAtletasManager(equipoFiltro: number | undefined, addToast: (msg: string, type: ToastType) => void) {
  const [atletas, setAtletas] = useState<AtletaJugador[]>([]);
  const [equipos, setEquipos] = useState<ClubEquipo[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [a, eq, dep] = await Promise.all([
        api.getAtletas(equipoFiltro),
        api.getEquipos(),
        api.getDeportes(),
      ]);
      setAtletas(a);
      setEquipos(eq);
      setDeportes(dep);
    } catch {
      addToast("Error al cargar los datos.", "error");
    } finally {
      setCargando(false);
    }
  }, [equipoFiltro, addToast]);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (payload: Omit<AtletaJugador, "id">) => {
    try {
      await api.createAtleta(payload);
      addToast(`Atleta "${payload.nombre_completo}" registrado.`, "success");
      await cargar();
    } catch (err) { throw err; }
  };

  const editar = async (id: number, payload: Partial<AtletaJugador>, isStatUpdate = false) => {
    const backup = [...atletas];
    setAtletas(prev => prev.map(a => a.id === id ? { ...a, ...payload } : a));
    try {
      await api.updateAtleta(id, payload);
      if (!isStatUpdate) addToast("Atleta actualizado correctamente.", "success");
    } catch (err) {
      setAtletas(backup);
      throw err;
    }
  };

  const eliminar = async (id: number) => {
    const backup = [...atletas];
    setAtletas(prev => prev.filter(a => a.id !== id));
    try {
      await api.deleteAtleta(id);
      addToast("Atleta eliminado del sistema.", "success");
    } catch (err) {
      setAtletas(backup);
      throw err;
    }
  };

  return { atletas, equipos, deportes, cargando, crear, editar, eliminar };
}

// COMPONENTE PRINCIPAL
export default function AtletasAdminPage() {
  // Filtros y UI 
  const [equipoFiltro, setEquipoFiltro] = useState<number | undefined>();
  const [busqueda, setBusqueda] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expandido, setExpandido] = useState<Set<number>>(new Set());

  // Modales y formularios 
  const [modalForm, setModalForm] = useState<ModalFormState>({ isOpen: false, mode: "create", data: {} });
  const [atletaEliminar, setAtletaEliminar] = useState<AtletaJugador | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Estado para Estadísticas en Línea 
  const [editStats, setEditStats] = useState<Record<number, StatEdit>>({});
  const [guardandoStat, setGuardandoStat] = useState<number | null>(null);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 4000);
  }, []);

  const { atletas, equipos, deportes, cargando, crear, editar, eliminar } = useAtletasManager(equipoFiltro, addToast);

  // Mapas Optimizados 
  const depMap = useMemo(() => new Map(deportes.map((d) => [d.id, d])), [deportes]);
  const eqMap = useMemo(() => new Map(equipos.map((e) => [e.id, e])), [equipos]);

  // Accesibilidad
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalForm(p => ({ ...p, isOpen: false }));
        setAtletaEliminar(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  //  Handlers 
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, club_equipo_id, nombre_completo, documento_identidad, numero_camiseta, posicion_rol } = modalForm.data;

    if (!club_equipo_id || !documento_identidad || !nombre_completo) {
      addToast("Faltan campos obligatorios.", "error"); return;
    }

    setGuardando(true);
    try {
      const payload = {
        club_equipo_id: Number(club_equipo_id),
        nombre_completo: nombre_completo.trim(),
        documento_identidad: documento_identidad.trim(),
        numero_camiseta: numero_camiseta || undefined,
        posicion_rol: posicion_rol || undefined,
      };

      if (modalForm.mode === "create") {
        await crear(payload as Omit<AtletaJugador, "id">);
      } else if (modalForm.mode === "edit" && id) {
        await editar(id, payload);
      }
      setModalForm({ isOpen: false, mode: "create", data: {} });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al guardar", "error");
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async () => {
    if (!atletaEliminar) return;
    setGuardando(true);
    try {
      await eliminar(atletaEliminar.id);
      setAtletaEliminar(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al eliminar.", "error");
    } finally {
      setGuardando(false);
    }
  };

  const guardarStatInline = async (atleta: AtletaJugador) => {
    const cambios = editStats[atleta.id];
    if (!cambios) return;
    setGuardandoStat(atleta.id);
    try {
      await editar(atleta.id, cambios, true);
      setEditStats((prev) => { const next = { ...prev }; delete next[atleta.id]; return next; });
      addToast("Estadísticas actualizadas.", "success");
    } catch (err) {
      addToast("Error al guardar estadísticas.", "error");
    } finally {
      setGuardandoStat(null);
    }
  };

  function toggleExpandido(equipoId: number) {
    setExpandido((prev) => {
      const next = new Set(prev);
      if (next.has(equipoId)) next.delete(equipoId);
      else next.add(equipoId);
      return next;
    });
  }

  //  Filtrado 
  const filtrados = useMemo(() => {
    const termino = busqueda.toLowerCase().trim();
    if (!termino) return atletas;
    return atletas.filter((a) =>
      a.nombre_completo.toLowerCase().includes(termino) ||
      a.documento_identidad.includes(termino)
    );
  }, [atletas, busqueda]);

  const equiposConAtletas = useMemo(() => equipos.filter((eq) => filtrados.some((a) => a.club_equipo_id === eq.id)), [equipos, filtrados]);
  const atletasSinEquipo = useMemo(() => filtrados.filter((a) => !eqMap.has(a.club_equipo_id)), [filtrados, eqMap]);

  //  Renders 
  function renderAtleta(a: AtletaJugador) {
    const eq = eqMap.get(a.club_equipo_id);
    const dep = eq ? depMap.get(eq.deporte_id) : undefined;
    const futbol = esFutbol(dep);
    const stat = editStats[a.id] ?? {};
    const statActual = {
      goles_anotados: stat.goles_anotados ?? a.goles_anotados,
      puntos_anotados: stat.puntos_anotados ?? a.puntos_anotados,
      tarjetas_amarillas: stat.tarjetas_amarillas ?? a.tarjetas_amarillas,
      tarjetas_rojas: stat.tarjetas_rojas ?? a.tarjetas_rojas,
    };
    const hayEdicion = editStats[a.id] !== undefined;

    return (
      <tr key={a.id} className="hover:bg-gray-50 transition-colors group">
        <td className="px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
              <User className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{a.nombre_completo}</p>
              <p className="text-xs text-gray-400">{a.documento_identidad}{a.posicion_rol ? ` · ${a.posicion_rol}` : ""}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-center text-sm font-medium text-gray-500">{a.numero_camiseta ?? "—"}</td>
        <td className="px-4 py-3 text-center">
          <input
            type="number" min={0}
            value={futbol ? statActual.goles_anotados : statActual.puntos_anotados}
            onChange={(e) => {
              const val = Number(e.target.value);
              setEditStats((prev) => ({ ...prev, [a.id]: { ...prev[a.id], ...(futbol ? { goles_anotados: val } : { puntos_anotados: val }) } }));
            }}
            className="w-16 text-center text-sm border border-gray-200 rounded-lg py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </td>
        {futbol && (
          <>
            <td className="px-4 py-3 text-center">
              <input type="number" min={0} value={statActual.tarjetas_amarillas} onChange={(e) => setEditStats(p => ({ ...p, [a.id]: { ...p[a.id], tarjetas_amarillas: Number(e.target.value) } }))} className="w-14 text-center text-sm border border-gray-200 rounded-lg py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </td>
            <td className="px-4 py-3 text-center">
              <input type="number" min={0} value={statActual.tarjetas_rojas} onChange={(e) => setEditStats(p => ({ ...p, [a.id]: { ...p[a.id], tarjetas_rojas: Number(e.target.value) } }))} className="w-14 text-center text-sm border border-gray-200 rounded-lg py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500" />
            </td>
          </>
        )}
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            {hayEdicion && (
              <button onClick={() => guardarStatInline(a)} disabled={guardandoStat === a.id} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition">
                {guardandoStat === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Guardar
              </button>
            )}
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
              <button onClick={() => setModalForm({ isOpen: true, mode: "edit", data: { ...a } })} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Atleta">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => setAtletaEliminar(a)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar Atleta">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  function renderGrupoEquipo(eq: ClubEquipo) {
    const dep = depMap.get(eq.deporte_id);
    const futbol = esFutbol(dep);
    const atletasDeEquipo = filtrados.filter((a) => a.club_equipo_id === eq.id);
    const abierto = expandido.has(eq.id);

    return (
      <div key={eq.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden mb-3">
        <button onClick={() => toggleExpandido(eq.id)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition focus:outline-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
              <User className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900">{eq.nombre_equipo}</p>
              <p className="text-xs text-gray-500 font-medium">{dep?.nombre ?? "—"} · {atletasDeEquipo.length} atleta{atletasDeEquipo.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`} />
        </button>

        {abierto && (
          <div className="border-t border-gray-100 overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Atleta</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">#</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">{futbol ? "Goles" : "Puntos"}</th>
                  {futbol && (
                    <>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-amber-500 uppercase tracking-wider w-20">TA</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-red-500 uppercase tracking-wider w-20">TR</th>
                    </>
                  )}
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {atletasDeEquipo.length === 0 ? (
                  <tr><td colSpan={futbol ? 6 : 4} className="text-center py-8 text-sm text-gray-400">Sin atletas registrados</td></tr>
                ) : atletasDeEquipo.map(renderAtleta)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Atletas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro de jugadores y estadísticas individuales por equipo.</p>
        </div>
        <button
          onClick={() => setModalForm({ isOpen: true, mode: "create", data: { club_equipo_id: equipoFiltro } })}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo atleta
        </button>
      </div>

      {/* Controles: Buscador y Filtro */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o documento..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
          />
        </div>
        <select
          value={equipoFiltro ?? ""}
          onChange={(e) => setEquipoFiltro(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-64"
        >
          <option value="">Todos los equipos</option>
          {equipos.map((eq) => <option key={eq.id} value={eq.id}>{eq.nombre_equipo}</option>)}
        </select>
      </div>

      {/* Lista Principal */}
      {cargando ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[72px] bg-gray-100 rounded-xl animate-pulse w-full"></div>
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-gray-100 rounded-xl">
          <User className="w-12 h-12 text-gray-200 mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-gray-500">No se encontraron atletas</p>
          <p className="text-xs text-gray-400 mt-1">Intenta con otros términos de búsqueda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {equiposConAtletas.map(renderGrupoEquipo)}
          
          {atletasSinEquipo.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-900">Atletas sin equipo asignado</p>
                <p className="text-xs text-red-700 mt-0.5">Hay {atletasSinEquipo.length} atleta(s) en el sistema que pertenecen a un equipo eliminado o no válido.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL DUAL: CREAR / EDITAR */}
      {modalForm.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity" onClick={() => setModalForm(p => ({ ...p, isOpen: false }))}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalForm(p => ({ ...p, isOpen: false }))} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 rounded-lg p-1"><X className="w-5 h-5" /></button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${modalForm.mode === "create" ? "bg-red-50" : "bg-blue-50"}`}>
                {modalForm.mode === "create" ? <Plus className="w-4 h-4 text-red-600" /> : <Edit2 className="w-4 h-4 text-blue-600" />}
              </div>
              <h2 className="text-lg font-bold text-gray-900">{modalForm.mode === "create" ? "Nuevo atleta" : "Editar atleta"}</h2>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Equipo</label>
                <select value={modalForm.data.club_equipo_id || ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, club_equipo_id: Number(e.target.value) } }))} required className={inputCls} disabled={guardando}>
                  <option value="">Seleccionar equipo</option>
                  {equipos.map((eq) => <option key={eq.id} value={eq.id}>{eq.nombre_equipo}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre completo</label>
                <input value={modalForm.data.nombre_completo || ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, nombre_completo: e.target.value } }))} required placeholder="Ej. Juan Pérez" className={inputCls} disabled={guardando} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Documento de identidad</label>
                <input value={modalForm.data.documento_identidad || ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, documento_identidad: e.target.value } }))} required placeholder="DNI / Carnet" className={inputCls} disabled={guardando} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° Camiseta</label>
                  <input value={modalForm.data.numero_camiseta || ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, numero_camiseta: e.target.value } }))} placeholder="Ej. 10" className={inputCls} disabled={guardando} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Posición / Rol</label>
                  <input value={modalForm.data.posicion_rol || ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, posicion_rol: e.target.value } }))} placeholder="Ej. Delantero" className={inputCls} disabled={guardando} />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setModalForm(p => ({ ...p, isOpen: false }))} disabled={guardando} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-50 transition">Cancelar</button>
                <button type="submit" disabled={guardando} className={`flex-1 font-semibold py-2.5 rounded-lg text-sm transition flex justify-center items-center gap-2 text-white ${modalForm.mode === "create" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : (modalForm.mode === "create" ? "Crear" : "Guardar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE SEGURIDAD: ELIMINAR */}
      {atletaEliminar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity" onClick={() => setAtletaEliminar(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center shrink-0"><HelpCircle className="w-5 h-5 text-red-600" /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">¿Eliminar atleta?</h2>
                <p className="text-sm text-gray-500 mt-2">Borrarás permanentemente a <strong className="text-gray-900">"{atletaEliminar.nombre_completo}"</strong> y sus estadísticas. Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button type="button" onClick={() => setAtletaEliminar(null)} disabled={guardando} className="px-4 py-2 border border-gray-200 text-gray-600 font-semibold rounded-lg text-sm hover:bg-gray-50 transition">Cancelar</button>
              <button type="button" onClick={handleDelete} disabled={guardando} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm flex items-center gap-2 transition">
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