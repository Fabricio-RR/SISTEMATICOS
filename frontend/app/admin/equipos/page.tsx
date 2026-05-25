"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Dumbbell, Plus, Trash2, Search, AlertCircle, CheckCircle2, 
  Trophy, Link2, Unlink, ChevronDown, User, UserPlus, Save, 
  Edit2, X, Loader2, HelpCircle 
} from "lucide-react";
import { api } from "@/lib/api";
import type { ClubEquipo, Institucion, Deporte, Torneo, Inscripcion, AtletaJugador } from "@/types/api";

function esFutbol(deporte: Deporte | undefined): boolean {
  if (!deporte) return false;
  const n = deporte.nombre.toLowerCase();
  return n.includes("fútbol") || n.includes("futbol");
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all";

const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-700",
  aprobado:  "bg-green-50 text-green-700",
  rechazado: "bg-red-50 text-red-600",
};

type ToastType = "success" | "error";
interface Toast { id: string; type: ToastType; message: string; }
type ModalFormState = { isOpen: boolean; mode: "create" | "edit"; data: Partial<ClubEquipo> & { torneo_id?: number } };

// Lógica de datos principal
function useEquiposManager(addToast: (msg: string, type: ToastType) => void) {
  const [equipos, setEquipos] = useState<ClubEquipo[]>([]);
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [eq, inst, dep, torn, insc] = await Promise.all([
        api.getEquipos(), api.getInstituciones(), api.getDeportes(),
        api.getTorneos(), api.getInscripciones(),
      ]);
      setEquipos(eq); setInstituciones(inst); setDeportes(dep); setTorneos(torn); setInscripciones(insc);
    } catch {
      addToast("Error al cargar los catálogos del sistema.", "error");
    } finally {
      setCargando(false);
    }
  }, [addToast]);

  useEffect(() => { cargar(); }, [cargar]);

  return { equipos, instituciones, deportes, torneos, inscripciones, cargando, recargar: cargar };
}

// COMPONENTE PRINCIPAL
export default function EquiposPage() {
  // Estados Globales 
  const [busqueda, setBusqueda] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 4000);
  }, []);

  const { equipos, instituciones, deportes, torneos, inscripciones, cargando, recargar } = useEquiposManager(addToast);

  //  Modales Principales 
  const [modalForm, setModalForm] = useState<ModalFormState>({ isOpen: false, mode: "create", data: {} });
  const [equipoEliminar, setEquipoEliminar] = useState<ClubEquipo | null>(null);
  const [aprobando, setAprobando] = useState<number | null>(null);

  //  Estados de Inscripción 
  const [modalInscribir, setModalInscribir] = useState<ClubEquipo | null>(null);
  const [inscribirTorneoId, setInscribirTorneoId] = useState<number>(0);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [desvinculando, setDesvinculando] = useState<number | null>(null);

  //  Estados de Atletas 
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [atletasPorEquipo, setAtletasPorEquipo] = useState<Record<number, AtletaJugador[]>>({});
  const [cargandoAtletas, setCargandoAtletas] = useState<Record<number, boolean>>({});
  
  const [modalAtletaTeam, setModalAtletaTeam] = useState<ClubEquipo | null>(null);
  const [formAtleta, setFormAtleta] = useState({ nombre_completo: "", numero_camiseta: "", posicion_rol: "", documento_identidad: "" });
  const [guardandoAtleta, setGuardandoAtleta] = useState(false);
  
  const [modalEditAtleta, setModalEditAtleta] = useState<AtletaJugador | null>(null);
  const [formEditAtleta, setFormEditAtleta] = useState({ nombre_completo: "", numero_camiseta: "", posicion_rol: "", documento_identidad: "", estado: "activo" });
  const [guardandoEditAtleta, setGuardandoEditAtleta] = useState(false);
  
  const [atletaEliminar, setAtletaEliminar] = useState<AtletaJugador | null>(null);
  
  const [editStats, setEditStats] = useState<Record<number, { goles_anotados?: number; puntos_anotados?: number; tarjetas_amarillas?: number; tarjetas_rojas?: number }>>({});
  const [guardandoStat, setGuardandoStat] = useState<number | null>(null);

  const [filtroTorneo, setFiltroTorneo] = useState<Record<number, number>>({});
  const [filtroFase, setFiltroFase] = useState<Record<number, string>>({});

  //  Mapas Optimizados 
  const instMap = useMemo(() => new Map(instituciones.map(i => [i.id, i.nombre_corto || i.nombre])), [instituciones]);
  const depMap  = useMemo(() => new Map(deportes.map(d => [d.id, d.nombre])), [deportes]);
  const depObjMap = useMemo(() => new Map(deportes.map(d => [d.id, d])), [deportes]);
  const torneosAbiertos = useMemo(() => torneos.filter(t => t.estado === "inscripcion_abierta"), [torneos]);

  const filtrados = useMemo(() => {
    const term = busqueda.toLowerCase();
    return equipos.filter(eq => 
      eq.nombre_equipo.toLowerCase().includes(term) || 
      (instMap.get(eq.institucion_id) ?? "").toLowerCase().includes(term)
    );
  }, [equipos, busqueda, instMap]);

  //  Accesibilidad 
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalForm(p => ({ ...p, isOpen: false }));
        setEquipoEliminar(null);
        setModalInscribir(null);
        setModalAtletaTeam(null);
        setModalEditAtleta(null);
        setAtletaEliminar(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  //  Lógica CRUD equipos 
  const handleSaveEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, nombre_equipo, institucion_id, deporte_id, torneo_id } = modalForm.data;
    
    if (!nombre_equipo || !institucion_id || !deporte_id) {
      setErrorForm("Completa todos los campos obligatorios."); return;
    }

    setGuardando(true); setErrorForm("");
    try {
      if (modalForm.mode === "create") {
        const equipo = await api.createEquipo({ nombre_equipo, institucion_id, deporte_id });
        if (torneo_id) {
          try {
            await api.createInscripcion({ torneo_id, club_equipo_id: equipo.id });
            addToast(`Equipo creado e inscrito correctamente.`, "success");
          } catch {
            addToast(`Equipo creado, pero falló la inscripción automática.`, "error");
          }
        } else {
          addToast(`Equipo "${equipo.nombre_equipo}" creado exitosamente.`, "success");
        }
      } else if (modalForm.mode === "edit" && id) {
        await api.updateEquipo(id, { nombre_equipo, institucion_id, deporte_id });
        addToast("Equipo actualizado correctamente.", "success");
      }
      setModalForm({ isOpen: false, mode: "create", data: {} });
      await recargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "Error al guardar el equipo.");
    } finally {
      setGuardando(false);
    }
  };

  const handleAprobar = async (id: number) => {
    setAprobando(id);
    try { 
      await api.aprobarEquipo(id); 
      addToast("Equipo aprobado.", "success");
      await recargar(); 
    }
    catch (err) { addToast("No se pudo aprobar el equipo.", "error"); }
    finally { setAprobando(null); }
  };

  const handleDeleteEquipo = async () => {
    if (!equipoEliminar) return;
    setGuardando(true);
    try { 
      await api.deleteEquipo(equipoEliminar.id); 
      addToast("Equipo eliminado.", "success");
      setEquipoEliminar(null);
      await recargar(); 
    }
    catch (err) { addToast(err instanceof Error ? err.message : "Error al eliminar equipo.", "error"); }
    finally { setGuardando(false); }
  };

  //  Lógica inscripciones 
  const handleInscribir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalInscribir || !inscribirTorneoId) return;
    setInscribiendo(true);
    try {
      await api.createInscripcion({ torneo_id: inscribirTorneoId, club_equipo_id: modalInscribir.id });
      addToast("Inscripción completada con éxito.", "success");
      setModalInscribir(null); setInscribirTorneoId(0);
      await recargar();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al inscribir.", "error");
    } finally { setInscribiendo(false); }
  };

  const handleDesvincular = async (inscripcionId: number) => {
    setDesvinculando(inscripcionId);
    try {
      await api.deleteInscripcion(inscripcionId);
      addToast("Equipo desvinculado del torneo.", "success");
      await recargar();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "No se pudo desvincular.", "error");
    } finally { setDesvinculando(null); }
  };

  //  Lógica atletas 
  async function cargarAtletasDelEquipo(teamId: number, torneoId?: number, fase?: string) {
    setCargandoAtletas(prev => ({ ...prev, [teamId]: true }));
    try {
      const ats = await api.getAtletas(teamId, torneoId, fase);
      setAtletasPorEquipo(prev => ({ ...prev, [teamId]: ats }));
    } catch {
      addToast("Error al cargar los atletas del equipo.", "error");
    } finally {
      setCargandoAtletas(prev => ({ ...prev, [teamId]: false }));
    }
  }

  async function handleFiltroStatsChange(teamId: number, tId: number | undefined, f: string | undefined) {
    setFiltroTorneo(prev => ({ ...prev, [teamId]: tId ?? 0 }));
    setFiltroFase(prev => ({ ...prev, [teamId]: f ?? "" }));
    await cargarAtletasDelEquipo(teamId, tId, f);
  }

  async function toggleTeamExpand(teamId: number) {
    const next = new Set(expandedTeams);
    if (next.has(teamId)) {
      next.delete(teamId);
    } else {
      next.add(teamId);
      const tId = filtroTorneo[teamId];
      const f = filtroFase[teamId];
      await cargarAtletasDelEquipo(teamId, tId || undefined, f || undefined);
    }
    setExpandedTeams(next);
  }

  const handleCreateAtleta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAtletaTeam) return;
    setGuardandoAtleta(true); setErrorForm("");
    try {
      await api.createAtleta({
        club_equipo_id: modalAtletaTeam.id,
        nombre_completo: formAtleta.nombre_completo.trim(),
        numero_camiseta: formAtleta.numero_camiseta || undefined,
        posicion_rol: formAtleta.posicion_rol || undefined,
        documento_identidad: formAtleta.documento_identidad,
      });
      setModalAtletaTeam(null);
      setFormAtleta({ nombre_completo: "", numero_camiseta: "", posicion_rol: "", documento_identidad: "" });
      await cargarAtletasDelEquipo(modalAtletaTeam.id);
      addToast("Atleta registrado exitosamente.", "success");
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "Error al registrar.");
    } finally { setGuardandoAtleta(false); }
  };

  const handleEditAtleta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditAtleta) return;
    setGuardandoEditAtleta(true); setErrorForm("");
    try {
      await api.updateAtleta(modalEditAtleta.id, {
        nombre_completo: formEditAtleta.nombre_completo.trim(),
        numero_camiseta: formEditAtleta.numero_camiseta || undefined,
        posicion_rol: formEditAtleta.posicion_rol || undefined,
        estado: formEditAtleta.estado as any,
      });
      setModalEditAtleta(null);
      await cargarAtletasDelEquipo(modalEditAtleta.club_equipo_id);
      addToast("Datos del atleta actualizados.", "success");
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "Error al actualizar.");
    } finally { setGuardandoEditAtleta(false); }
  };

  const handleDeleteAtleta = async () => {
    if (!atletaEliminar) return;
    setGuardando(true);
    try {
      await api.deleteAtleta(atletaEliminar.id);
      await cargarAtletasDelEquipo(atletaEliminar.club_equipo_id);
      addToast("Atleta eliminado correctamente.", "success");
      setAtletaEliminar(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "No se pudo eliminar al atleta.", "error");
    } finally { setGuardando(false); }
  };

  const guardarStatInline = async (atleta: AtletaJugador) => {
    const cambios = editStats[atleta.id];
    if (!cambios) return;
    setGuardandoStat(atleta.id);
    try {
      await api.updateAtleta(atleta.id, cambios);
      setEditStats(prev => { const next = { ...prev }; delete next[atleta.id]; return next; });
      await cargarAtletasDelEquipo(atleta.club_equipo_id);
      addToast("Estadísticas guardadas.", "success");
    } catch (err) {
      addToast("Error al guardar estadísticas.", "error");
    } finally { setGuardandoStat(null); }
  };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Equipos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de clubes, plantillas y asignación a torneos.</p>
        </div>
        <button
          onClick={() => { setModalForm({ isOpen: true, mode: "create", data: {} }); setErrorForm(""); }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <Plus className="w-4 h-4" /> Nuevo equipo
        </button>
      </div>

      {/* Buscador */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar equipo o institución..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
        />
      </div>

      {/* Tabla de Equipos */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="w-12 px-4"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Equipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Institución</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Deporte</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Torneo</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cargando ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-5"><div className="w-5 h-5 bg-gray-100 rounded"></div></td>
                    <td className="px-4 py-5"><div className="h-4 bg-gray-100 rounded w-6"></div></td>
                    <td className="px-4 py-5"><div className="flex gap-3 items-center"><div className="w-8 h-8 bg-gray-100 rounded-lg"></div><div className="h-4 bg-gray-100 rounded w-24"></div></div></td>
                    <td className="px-4 py-5"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                    <td className="px-4 py-5"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                    <td className="px-4 py-5"><div className="h-6 bg-gray-100 rounded w-28"></div></td>
                    <td className="px-4 py-5"><div className="h-5 bg-gray-100 rounded-full w-16 mx-auto"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-gray-100 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-sm text-gray-400">{busqueda ? "No se encontraron equipos." : "No hay equipos registrados en el sistema."}</td></tr>
              ) : filtrados.map(eq => {
                const insc = inscripciones.find(i => i.club_equipo_id === eq.id && i.estado !== "retirado" && torneos.find(t => t.id === i.torneo_id)?.estado !== "finalizado" && torneos.find(t => t.id === i.torneo_id)?.estado !== "suspendido");
                const torneoAsoc = insc ? torneos.find(t => t.id === insc.torneo_id) : null;
                
                return (
                  <React.Fragment key={eq.id}>
                    <tr className="hover:bg-gray-50/70 transition-colors group">
                      <td className="px-4 py-4 text-center">
                        <button onClick={() => toggleTeamExpand(eq.id)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-900 transition focus:outline-none focus:ring-2 focus:ring-red-500">
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedTeams.has(eq.id) ? "rotate-180 text-red-600" : ""}`} />
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-400 font-mono">{String(eq.id).padStart(2, "0")}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                            <Dumbbell className="w-4 h-4 text-red-600" />
                          </div>
                          <p className="text-sm font-bold text-gray-900">{eq.nombre_equipo}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-600 truncate max-w-[150px]" title={instMap.get(eq.institucion_id)}>{instMap.get(eq.institucion_id) ?? "—"}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{depMap.get(eq.deporte_id) ?? "—"}</td>
                      <td className="px-4 py-4">
                        {torneoAsoc ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold truncate max-w-[120px]" title={torneoAsoc.nombre}>
                              <Trophy className="w-3 h-3 text-indigo-600 shrink-0" /> {torneoAsoc.nombre}
                            </span>
                            {torneoAsoc.estado === "inscripcion_abierta" && insc && (
                              <button onClick={() => handleDesvincular(insc.id)} disabled={desvinculando === insc.id} title="Desvincular" className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition disabled:opacity-30">
                                <Unlink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : eq.estado === "aprobado" ? (
                          <button onClick={() => { setModalInscribir(eq); setInscribirTorneoId(0); }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-dashed border-gray-300 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 text-xs font-semibold transition">
                            <Link2 className="w-3 h-3" /> Asignar Torneo
                          </button>
                        ) : <span className="text-[11px] text-gray-400 font-medium">Aprobar primero</span>}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${ESTADO_BADGE[eq.estado] ?? "bg-gray-100 text-gray-500"}`}>
                          {eq.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {eq.estado === "pendiente" && (
                            <button onClick={() => handleAprobar(eq.id)} disabled={aprobando === eq.id} title="Aprobar" className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition">
                              {aprobando === eq.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          )}
                          <button onClick={() => setModalForm({ isOpen: true, mode: "edit", data: { ...eq } })} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar Equipo">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEquipoEliminar(eq)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar Equipo">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Fila Expandida: Atletas del Equipo */}
                    {expandedTeams.has(eq.id) && (
                      <tr className="bg-gray-50/60 border-b border-gray-100">
                        <td colSpan={8} className="px-4 sm:px-8 py-4">
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Plantilla del Equipo</span>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-md">{atletasPorEquipo[eq.id]?.length || 0}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                                  <select value={filtroTorneo[eq.id] ?? ""} onChange={e => handleFiltroStatsChange(eq.id, e.target.value ? Number(e.target.value) : undefined, filtroFase[eq.id])} className="text-xs font-semibold text-gray-700 bg-transparent focus:outline-none border-none cursor-pointer">
                                    <option value="">Stats: Globales</option>
                                    {torneos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                  </select>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                                  <select value={filtroFase[eq.id] ?? ""} onChange={e => handleFiltroStatsChange(eq.id, filtroTorneo[eq.id], e.target.value || undefined)} className="text-xs font-semibold text-gray-700 bg-transparent focus:outline-none border-none cursor-pointer">
                                    <option value="">Fase: Todas</option>
                                    <option value="Fase de Grupos">Grupos</option>
                                    <option value="Cuartos de Final">Cuartos</option>
                                    <option value="Semifinales">Semifinales</option>
                                    <option value="Final">Final</option>
                                  </select>
                                </div>
                                {eq.estado === "aprobado" && (
                                  <button onClick={() => { setModalAtletaTeam(eq); setFormAtleta({ nombre_completo: "", numero_camiseta: "", posicion_rol: "", documento_identidad: "" }); setErrorForm(""); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition shadow-sm ml-auto sm:ml-0">
                                    <UserPlus className="w-3.5 h-3.5" /> Nuevo Atleta
                                  </button>
                                )}
                              </div>
                            </div>

                            {cargandoAtletas[eq.id] ? (
                              <div className="text-center py-8 text-sm text-gray-400 flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-red-500" /> Cargando plantilla...
                              </div>
                            ) : !atletasPorEquipo[eq.id] || atletasPorEquipo[eq.id].length === 0 ? (
                              <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">Sin atletas registrados en este equipo.</div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="border-b border-gray-100">
                                      <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Atleta</th>
                                      <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center w-12">N°</th>
                                      <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center w-20">{esFutbol(depObjMap.get(eq.deporte_id)) ? "Goles" : "PTS"}</th>
                                      {esFutbol(depObjMap.get(eq.deporte_id)) && (
                                        <><th className="px-3 py-2 text-[10px] font-bold text-amber-500 uppercase tracking-wider text-center w-16">TA</th><th className="px-3 py-2 text-[10px] font-bold text-red-500 uppercase tracking-wider text-center w-16">TR</th></>
                                      )}
                                      <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center w-24">Estado</th>
                                      <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right w-24">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {atletasPorEquipo[eq.id].map(a => {
                                      const futbol = esFutbol(depObjMap.get(eq.deporte_id));
                                      const stat = editStats[a.id] ?? {};
                                      const statActual = { goles_anotados: stat.goles_anotados ?? a.goles_anotados, puntos_anotados: stat.puntos_anotados ?? a.puntos_anotados, tarjetas_amarillas: stat.tarjetas_amarillas ?? a.tarjetas_amarillas, tarjetas_rojas: stat.tarjetas_rojas ?? a.tarjetas_rojas };
                                      const isFiltered = !!filtroTorneo[eq.id] || !!filtroFase[eq.id];
                                      return (
                                        <tr key={a.id} className="hover:bg-gray-50/50 group/atleta">
                                          <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2">
                                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200"><User className="w-3 h-3 text-gray-400" /></div>
                                              <div>
                                                <p className="text-xs font-bold text-gray-800 leading-tight">{a.nombre_completo}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{a.documento_identidad}{a.posicion_rol ? ` · ${a.posicion_rol}` : ""}</p>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500">{a.numero_camiseta ?? "—"}</td>
                                          <td className="px-3 py-2.5 text-center">
                                            {isFiltered ? <span className="text-xs font-bold text-gray-900">{futbol ? statActual.goles_anotados : statActual.puntos_anotados}</span> : 
                                              <input type="number" min={0} value={futbol ? statActual.goles_anotados : statActual.puntos_anotados} onChange={e => setEditStats(p => ({ ...p, [a.id]: { ...p[a.id], ...(futbol ? { goles_anotados: Number(e.target.value) } : { puntos_anotados: Number(e.target.value) }) } }))} className="w-12 text-center text-xs border border-gray-200 rounded py-1 focus:outline-none focus:ring-1 focus:ring-red-500" />
                                            }
                                          </td>
                                          {futbol && (
                                            <>
                                              <td className="px-3 py-2.5 text-center">{isFiltered ? <span className="text-xs font-bold text-gray-900">{statActual.tarjetas_amarillas}</span> : <input type="number" min={0} value={statActual.tarjetas_amarillas} onChange={e => setEditStats(p => ({ ...p, [a.id]: { ...p[a.id], tarjetas_amarillas: Number(e.target.value) } }))} className="w-10 text-center text-xs border border-gray-200 rounded py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" />}</td>
                                              <td className="px-3 py-2.5 text-center">{isFiltered ? <span className="text-xs font-bold text-gray-900">{statActual.tarjetas_rojas}</span> : <input type="number" min={0} value={statActual.tarjetas_rojas} onChange={e => setEditStats(p => ({ ...p, [a.id]: { ...p[a.id], tarjetas_rojas: Number(e.target.value) } }))} className="w-10 text-center text-xs border border-gray-200 rounded py-1 focus:outline-none focus:ring-1 focus:ring-red-500" />}</td>
                                            </>
                                          )}
                                          <td className="px-3 py-2.5 text-center"><span className={`inline-flex text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${a.estado === "activo" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{a.estado}</span></td>
                                          <td className="px-3 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover/atleta:opacity-100 transition-opacity">
                                              {editStats[a.id] !== undefined && (
                                                <button onClick={() => guardarStatInline(a)} disabled={guardandoStat === a.id} className="text-green-600 hover:bg-green-50 p-1 rounded transition"><Save className="w-3.5 h-3.5" /></button>
                                              )}
                                              <button onClick={() => { setModalEditAtleta(a); setFormEditAtleta({ nombre_completo: a.nombre_completo, numero_camiseta: a.numero_camiseta || "", posicion_rol: a.posicion_rol || "", documento_identidad: a.documento_identidad, estado: a.estado }); setErrorForm(""); }} className="text-blue-500 hover:bg-blue-50 p-1 rounded transition"><Edit2 className="w-3.5 h-3.5" /></button>
                                              <button onClick={() => setAtletaEliminar(a)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DUAL: CREAR / EDITAR EQUIPO */}
      {modalForm.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" onClick={() => setModalForm(p => ({ ...p, isOpen: false }))}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalForm(p => ({ ...p, isOpen: false }))} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded-lg"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${modalForm.mode === "create" ? "bg-red-50" : "bg-blue-50"}`}>
                {modalForm.mode === "create" ? <Dumbbell className="w-4 h-4 text-red-600" /> : <Edit2 className="w-4 h-4 text-blue-600" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{modalForm.mode === "create" ? "Nuevo Equipo" : "Editar Equipo"}</h2>
                {modalForm.mode === "create" && <p className="text-xs text-gray-400 mt-0.5">El administrador aprueba el equipo automáticamente.</p>}
              </div>
            </div>
            <form onSubmit={handleSaveEquipo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre del equipo <span className="text-red-500">*</span></label>
                <input value={modalForm.data.nombre_equipo || ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, nombre_equipo: e.target.value } }))} maxLength={50} required placeholder="Ej. UL Fútbol A" className={inputCls} disabled={guardando} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Institución <span className="text-red-500">*</span></label>
                <select value={modalForm.data.institucion_id || ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, institucion_id: Number(e.target.value) } }))} required className={inputCls} disabled={guardando}>
                  <option value="">Seleccionar institución</option>
                  {instituciones.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Deporte <span className="text-red-500">*</span></label>
                <select value={modalForm.data.deporte_id || ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, deporte_id: Number(e.target.value) } }))} required className={inputCls} disabled={guardando}>
                  <option value="">Seleccionar deporte</option>
                  {deportes.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
              {modalForm.mode === "create" && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Torneo {torneosAbiertos.length > 0 ? <span className="text-red-500">*</span> : <span className="font-normal">(opcional)</span>}</label>
                  <select value={modalForm.data.torneo_id || ""} onChange={e => setModalForm(p => ({ ...p, data: { ...p.data, torneo_id: Number(e.target.value) } }))} className={inputCls} disabled={guardando}>
                    <option value="">{(modalForm.data.deporte_id ? torneosAbiertos.filter(t => t.deporte_id === modalForm.data.deporte_id) : torneosAbiertos).length > 0 ? "Seleccionar torneo" : "Sin torneos abiertos"}</option>
                    {(modalForm.data.deporte_id ? torneosAbiertos.filter(t => t.deporte_id === modalForm.data.deporte_id) : torneosAbiertos).map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.temporada})</option>)}
                  </select>
                  <p className="mt-1.5 text-xs text-gray-400">Sin inscripción no aparecerá en Sorteos.</p>
                </div>
              )}
              {errorForm && <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg border border-red-100">{errorForm}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalForm(p => ({ ...p, isOpen: false }))} disabled={guardando} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancelar</button>
                <button type="submit" disabled={guardando} className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition flex items-center justify-center gap-2 ${modalForm.mode === "create" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                  {guardando && <Loader2 className="w-4 h-4 animate-spin" />} {guardando ? "Guardando..." : modalForm.mode === "create" ? "Crear equipo" : "Actualizar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INSCRIBIR EQUIPO */}
      {modalInscribir && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity" onClick={() => setModalInscribir(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalInscribir(null)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded-lg"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center"><Trophy className="w-4 h-4 text-indigo-600" /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Inscribir en Torneo</h2>
                <p className="text-xs text-gray-400 mt-0.5">Asignar torneo al equipo para permitir su participación.</p>
              </div>
            </div>
            <form onSubmit={handleInscribir} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Equipo / Deporte</label>
                <div className="w-full bg-gray-50 rounded-lg px-3 py-2.5 text-sm border border-gray-100 flex flex-col gap-0.5">
                  <span className="font-bold text-gray-900">{modalInscribir.nombre_equipo}</span>
                  <span className="text-xs text-gray-500">{depMap.get(modalInscribir.deporte_id) ?? "Desconocido"}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Seleccionar Torneo <span className="text-red-500">*</span></label>
                <select value={inscribirTorneoId || ""} onChange={e => setInscribirTorneoId(Number(e.target.value))} required className={inputCls} disabled={inscribiendo}>
                  <option value="">Seleccionar torneo abierto</option>
                  {torneos.filter(t => t.deporte_id === modalInscribir.deporte_id && t.estado === "inscripcion_abierta").map(t => (
                    <option key={t.id} value={t.id}>{t.nombre} ({t.temporada})</option>
                  ))}
                </select>
                {torneos.filter(t => t.deporte_id === modalInscribir.deporte_id && t.estado === "inscripcion_abierta").length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-600 font-medium">No hay torneos abiertos disponibles para este deporte.</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalInscribir(null)} disabled={inscribiendo} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancelar</button>
                <button type="submit" disabled={inscribiendo || !inscribirTorneoId} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2">
                  {inscribiendo && <Loader2 className="w-4 h-4 animate-spin" />} {inscribiendo ? "Procesando..." : "Inscribir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DUAL ATLETA: CREAR / EDITAR */}
      {(modalAtletaTeam || modalEditAtleta) && (() => {
        const isEdit = !!modalEditAtleta;
        const formObj = isEdit ? formEditAtleta : formAtleta;
        const setFormObj = isEdit ? setFormEditAtleta : setFormAtleta as any;
        const handler = isEdit ? handleEditAtleta : handleCreateAtleta;
        const loading = isEdit ? guardandoEditAtleta : guardandoAtleta;
        const err = isEdit ? errorForm : errorForm;
        
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity" onClick={() => { setModalAtletaTeam(null); setModalEditAtleta(null); }}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setModalAtletaTeam(null); setModalEditAtleta(null); }} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded-lg"><X className="w-5 h-5" /></button>
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isEdit ? "bg-blue-50" : "bg-red-50"}`}>
                  <User className={`w-4 h-4 ${isEdit ? "text-blue-600" : "text-red-600"}`} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Editar Atleta" : "Registrar Atleta"}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{isEdit ? `DNI: ${modalEditAtleta.documento_identidad}` : `Equipo: ${modalAtletaTeam.nombre_equipo}`}</p>
                </div>
              </div>
              <form onSubmit={handler} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nombre Completo <span className="text-red-500">*</span></label>
                  <input value={formObj.nombre_completo} onChange={e => setFormObj({ ...formObj, nombre_completo: e.target.value })} maxLength={80} required placeholder="Ej. Juan Pérez" className={inputCls} disabled={loading} />
                </div>
                {!isEdit && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">DNI <span className="text-red-500">*</span></label>
                    <input type="text" pattern="[0-9]*" inputMode="numeric" maxLength={8} value={formObj.documento_identidad} onChange={e => setFormObj({ ...formObj, documento_identidad: e.target.value.replace(/\D/g, "") })} required placeholder="Ej. 70605040" className={inputCls} disabled={loading} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">N° Camiseta</label>
                    <input type="text" pattern="[0-9]*" inputMode="numeric" maxLength={2} value={formObj.numero_camiseta} onChange={e => setFormObj({ ...formObj, numero_camiseta: e.target.value.replace(/\D/g, "") })} placeholder="Ej. 10" className={inputCls} disabled={loading} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Posición / Rol</label>
                    <input value={formObj.posicion_rol} onChange={e => setFormObj({ ...formObj, posicion_rol: e.target.value.replace(/\d/g, "") })} maxLength={30} placeholder="Ej. Delantero" className={inputCls} disabled={loading} />
                  </div>
                </div>
                {isEdit && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Estado</label>
                    <select value={(formObj as any).estado} onChange={e => setFormObj({ ...formObj, estado: e.target.value })} className={inputCls} disabled={loading}>
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                      <option value="suspendido">Suspendido</option>
                    </select>
                  </div>
                )}
                {err && <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg border border-red-100">{err}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setModalAtletaTeam(null); setModalEditAtleta(null); }} disabled={loading} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancelar</button>
                  <button type="submit" disabled={loading} className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition flex items-center justify-center gap-2 ${isEdit ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"}`}>
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />} {loading ? "Guardando..." : isEdit ? "Actualizar" : "Registrar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL DE SEGURIDAD: ELIMINAR EQUIPO */}
      {equipoEliminar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity" onClick={() => setEquipoEliminar(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center shrink-0"><HelpCircle className="w-5 h-5 text-red-600" /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">¿Eliminar equipo?</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Borrarás permanentemente el equipo <strong className="text-gray-900">"{equipoEliminar.nombre_equipo}"</strong>.
                  Si tiene atletas o inscripciones activas, debes reasignarlos o eliminarlos primero.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setEquipoEliminar(null)} disabled={guardando} className="px-4 py-2 font-semibold text-gray-600 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={handleDeleteEquipo} disabled={guardando} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm flex items-center gap-2 transition">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SEGURIDAD: ELIMINAR ATLETA */}
      {atletaEliminar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity" onClick={() => setAtletaEliminar(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center shrink-0"><HelpCircle className="w-5 h-5 text-red-600" /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">¿Eliminar atleta?</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Borrarás al atleta <strong className="text-gray-900">"{atletaEliminar.nombre_completo}"</strong> y todas sus estadísticas asociadas en el sistema.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setAtletaEliminar(null)} disabled={guardando} className="px-4 py-2 font-semibold text-gray-600 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={handleDeleteAtleta} disabled={guardando} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm flex items-center gap-2 transition">
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