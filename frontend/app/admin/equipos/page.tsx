"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Dumbbell, Plus, Trash2, Search, AlertCircle, CheckCircle, Trophy, Link2, Unlink, ChevronDown, User, UserPlus, Save, Edit } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEquipos, useInstituciones, useDeportes, useTorneos, useInscripciones } from "@/lib/hooks";
import type { ClubEquipo, Institucion, Deporte, Torneo, Inscripcion, AtletaJugador } from "@/types/api";

function esFutbol(deporte: Deporte | undefined): boolean {
  if (!deporte) return false;
  const n = deporte.nombre.toLowerCase();
  return n.includes("fútbol") || n.includes("futbol");
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition";

const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-700",
  aprobado:  "bg-green-50 text-green-700",
  rechazado: "bg-red-50 text-red-600",
};

export default function EquiposPage() {
  const queryClient = useQueryClient();
  const equiposQ = useEquipos();
  const institucionesQ = useInstituciones();
  const deportesQ = useDeportes();
  const torneosQ = useTorneos();
  const inscripcionesQ = useInscripciones();
  const equipos = equiposQ.data ?? [];
  const instituciones = institucionesQ.data ?? [];
  const deportes = deportesQ.data ?? [];
  const torneos = torneosQ.data ?? [];
  const inscripciones = inscripcionesQ.data ?? [];
  const cargando = equiposQ.isLoading || institucionesQ.isLoading || deportesQ.isLoading || torneosQ.isLoading || inscripcionesQ.isLoading;
  const recargar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["equipos"] }),
      queryClient.invalidateQueries({ queryKey: ["inscripciones"] }),
    ]);

  const [busqueda, setBusqueda]         = useState("");
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");
  const [modal, setModal]               = useState(false);
  const [form, setForm]                 = useState({ nombre_equipo: "", institucion_id: 0, deporte_id: 0, torneo_id: 0 });
  const [guardando, setGuardando]       = useState(false);
  const [errorForm, setErrorForm]       = useState("");
  const [aprobando, setAprobando]       = useState<number | null>(null);
  const [eliminando, setEliminando]     = useState<number | null>(null);
  const [desvinculando, setDesvinculando] = useState<number | null>(null);
  const [eliminandoAtleta, setEliminandoAtleta] = useState<number | null>(null);

  // Edición de equipo (renombrar)
  const [modalEditEquipo, setModalEditEquipo] = useState<ClubEquipo | null>(null);
  const [formEditEquipo, setFormEditEquipo] = useState({ nombre_equipo: "" });
  const [guardandoEditEquipo, setGuardandoEditEquipo] = useState(false);
  const [errorEditEquipoForm, setErrorEditEquipoForm] = useState("");

  // Confirmación de eliminación de equipo
  const [confirmarEliminarEquipo, setConfirmarEliminarEquipo] = useState<ClubEquipo | null>(null);
  const [errorConfirmEquipo, setErrorConfirmEquipo] = useState("");

  // Estados para inscribir equipo existente
  const [modalInscribir, setModalInscribir] = useState<ClubEquipo | null>(null);
  const [inscribirTorneoId, setInscribirTorneoId] = useState<number>(0);
  const [inscribiendo, setInscribiendo]   = useState(false);

  // Estados para atletas integrados
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set());
  const [atletasPorEquipo, setAtletasPorEquipo] = useState<Record<number, AtletaJugador[]>>({});
  const [cargandoAtletas, setCargandoAtletas] = useState<Record<number, boolean>>({});

  // Modal para nuevo atleta pre-seleccionado por equipo
  const [modalAtletaTeam, setModalAtletaTeam] = useState<ClubEquipo | null>(null);
  const [formAtleta, setFormAtleta] = useState({ nombre_completo: "", numero_camiseta: "", posicion_rol: "", documento_identidad: "" });
  const [guardandoAtleta, setGuardandoAtleta] = useState(false);
  const [errorAtletaForm, setErrorAtletaForm] = useState("");

  // Modal para editar atleta
  const [modalEditAtleta, setModalEditAtleta] = useState<AtletaJugador | null>(null);
  const [formEditAtleta, setFormEditAtleta] = useState({ nombre_completo: "", numero_camiseta: "", posicion_rol: "", documento_identidad: "", estado: "activo" });
  const [guardandoEditAtleta, setGuardandoEditAtleta] = useState(false);
  const [errorEditAtletaForm, setErrorEditAtletaForm] = useState("");

  // Edición de stats inline para atletas
  const [editStats, setEditStats] = useState<Record<number, { goles_anotados?: number; puntos_anotados?: number; tarjetas_amarillas?: number; tarjetas_rojas?: number }>>({});
  const [guardandoStat, setGuardandoStat] = useState<number | null>(null);

  // Filters for athlete statistics
  const [filtroTorneo, setFiltroTorneo] = useState<Record<number, number>>({});
  const [filtroFase, setFiltroFase] = useState<Record<number, string>>({});

  async function cargarAtletasDelEquipo(teamId: number, torneoId?: number, fase?: string) {
    setCargandoAtletas((prev) => ({ ...prev, [teamId]: true }));
    try {
      const ats = await api.getAtletas(teamId, torneoId, fase);
      setAtletasPorEquipo((prev) => ({ ...prev, [teamId]: ats }));
    } catch {
      setError("No se pudo cargar los atletas del equipo.");
    } finally {
      setCargandoAtletas((prev) => ({ ...prev, [teamId]: false }));
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

  async function handleCreateAtleta(e: React.FormEvent) {
    e.preventDefault();
    if (!modalAtletaTeam) return;
    if (!formAtleta.documento_identidad || !formAtleta.nombre_completo) {
      setErrorAtletaForm("Completa los campos obligatorios.");
      return;
    }
    if (formAtleta.nombre_completo.length > 80) {
      setErrorAtletaForm("El nombre completo no puede tener más de 80 caracteres.");
      return;
    }
    if (!/^\d{8}$/.test(formAtleta.documento_identidad)) {
      setErrorAtletaForm("El documento de identidad (DNI) debe tener exactamente 8 dígitos.");
      return;
    }
    if (formAtleta.numero_camiseta && !/^\d{1,2}$/.test(formAtleta.numero_camiseta)) {
      setErrorAtletaForm("El número de camiseta debe tener máximo 2 dígitos numéricos (0-99).");
      return;
    }
    if (formAtleta.posicion_rol && formAtleta.posicion_rol.length > 30) {
      setErrorAtletaForm("La posición / rol no puede tener más de 30 caracteres.");
      return;
    }
    if (formAtleta.posicion_rol && /\d/.test(formAtleta.posicion_rol)) {
      setErrorAtletaForm("La posición / rol no puede contener números.");
      return;
    }
    setGuardandoAtleta(true);
    setErrorAtletaForm("");
    try {
      await api.createAtleta({
        club_equipo_id: modalAtletaTeam.id,
        nombre_completo: formAtleta.nombre_completo,
        numero_camiseta: formAtleta.numero_camiseta || undefined,
        posicion_rol: formAtleta.posicion_rol || undefined,
        documento_identidad: formAtleta.documento_identidad,
      });
      setModalAtletaTeam(null);
      setFormAtleta({ nombre_completo: "", numero_camiseta: "", posicion_rol: "", documento_identidad: "" });
      await cargarAtletasDelEquipo(modalAtletaTeam.id);
      setSuccess("Atleta registrado exitosamente.");
    } catch (err) {
      setErrorAtletaForm(err instanceof Error ? err.message : "Error al registrar atleta.");
    } finally {
      setGuardandoAtleta(false);
    }
  }

  async function handleEditAtleta(e: React.FormEvent) {
    e.preventDefault();
    if (!modalEditAtleta) return;
    if (!formEditAtleta.nombre_completo || !formEditAtleta.documento_identidad) {
      setErrorEditAtletaForm("Completa los campos obligatorios.");
      return;
    }
    if (formEditAtleta.nombre_completo.length > 80) {
      setErrorEditAtletaForm("El nombre completo no puede tener más de 80 caracteres.");
      return;
    }
    if (formEditAtleta.numero_camiseta && !/^\d{1,2}$/.test(formEditAtleta.numero_camiseta)) {
      setErrorEditAtletaForm("El número de camiseta debe tener máximo 2 dígitos numéricos (0-99).");
      return;
    }
    if (formEditAtleta.posicion_rol && formEditAtleta.posicion_rol.length > 30) {
      setErrorEditAtletaForm("La posición / rol no puede tener más de 30 caracteres.");
      return;
    }
    if (formEditAtleta.posicion_rol && /\d/.test(formEditAtleta.posicion_rol)) {
      setErrorEditAtletaForm("La posición / rol no puede contener números.");
      return;
    }
    setGuardandoEditAtleta(true);
    setErrorEditAtletaForm("");
    try {
      await api.updateAtleta(modalEditAtleta.id, {
        nombre_completo: formEditAtleta.nombre_completo,
        numero_camiseta: formEditAtleta.numero_camiseta || undefined,
        posicion_rol: formEditAtleta.posicion_rol || undefined,
        estado: formEditAtleta.estado as any,
      });
      setModalEditAtleta(null);
      await cargarAtletasDelEquipo(modalEditAtleta.club_equipo_id);
      setSuccess("Datos del atleta actualizados.");
    } catch (err) {
      setErrorEditAtletaForm(err instanceof Error ? err.message : "Error al actualizar atleta.");
    } finally {
      setGuardandoEditAtleta(false);
    }
  }

  async function handleDeleteAtleta(atleta: AtletaJugador) {
    setEliminandoAtleta(atleta.id);
    setError("");
    try {
      await api.deleteAtleta(atleta.id);
      await cargarAtletasDelEquipo(atleta.club_equipo_id);
      setSuccess("Atleta eliminado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar al atleta.");
    } finally {
      setEliminandoAtleta(null);
    }
  }

  async function guardarStat(atleta: AtletaJugador) {
    const cambios = editStats[atleta.id];
    if (!cambios) return;
    setGuardandoStat(atleta.id);
    try {
      await api.updateAtleta(atleta.id, cambios);
      setEditStats((prev) => {
        const next = { ...prev };
        delete next[atleta.id];
        return next;
      });
      await cargarAtletasDelEquipo(atleta.club_equipo_id);
      setSuccess("Estadísticas del atleta actualizadas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar estadísticas.");
    } finally {
      setGuardandoStat(null);
    }
  }

  useEffect(() => {
    if (!form.deporte_id || !form.torneo_id) return;
    const torneoValido = torneos.some(
      (t) => t.estado === "inscripcion_abierta" && t.deporte_id === form.deporte_id && t.id === form.torneo_id
    );
    if (!torneoValido) {
      setForm((prev) => ({ ...prev, torneo_id: 0 }));
    }
  }, [form.deporte_id, form.torneo_id, torneos]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.institucion_id || !form.deporte_id) { setErrorForm("Selecciona institución y deporte."); return; }
    if (form.nombre_equipo.length > 50) {
      setErrorForm("El nombre del equipo no puede tener más de 50 caracteres.");
      return;
    }
    if (!form.torneo_id && torneosCompatibles.length > 0) {
      setErrorForm("Selecciona un torneo compatible para inscribir el equipo.");
      return;
    }
    setGuardando(true); setErrorForm("");
    try {
      const { torneo_id, ...equipoData } = form;
      const equipo = await api.createEquipo(equipoData);

      if (torneo_id) {
        try {
          await api.createInscripcion({ torneo_id, club_equipo_id: equipo.id });
          const t = torneos.find(t => t.id === torneo_id);
          setSuccess(`Equipo "${equipo.nombre_equipo}" creado e inscrito en "${t?.nombre}". Aparecerá en Sorteos cuando el torneo avance a "En sorteo".`);
        } catch (err) {
          setError(err instanceof Error
            ? `Equipo creado, pero la inscripción falló: ${err.message}`
            : "Equipo creado, pero la inscripción falló. Inscríbelo manualmente en Inscripciones.");
        }
      } else {
        setSuccess(`Equipo "${equipo.nombre_equipo}" creado sin torneo. Para que aparezca en Sorteos, inscríbelo en Inscripciones.`);
      }

      setModal(false);
      setForm({ nombre_equipo: "", institucion_id: 0, deporte_id: 0, torneo_id: 0 });
      await recargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "Error al guardar");
    } finally { setGuardando(false); }
  }

  async function handleAprobar(id: number) {
    setAprobando(id);
    try { await api.aprobarEquipo(id); await recargar(); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo aprobar el equipo."); }
    finally { setAprobando(null); }
  }

  async function handleEditEquipo(e: React.FormEvent) {
    e.preventDefault();
    if (!modalEditEquipo) return;
    const nombre = formEditEquipo.nombre_equipo.trim();
    if (!nombre) { setErrorEditEquipoForm("El nombre del equipo es obligatorio."); return; }
    if (nombre.length > 50) { setErrorEditEquipoForm("El nombre del equipo no puede tener más de 50 caracteres."); return; }
    setGuardandoEditEquipo(true);
    setErrorEditEquipoForm("");
    try {
      await api.updateEquipo(modalEditEquipo.id, { nombre_equipo: nombre });
      setModalEditEquipo(null);
      setSuccess("Equipo actualizado correctamente.");
      await recargar();
    } catch (err) {
      setErrorEditEquipoForm(err instanceof Error ? err.message : "Error al actualizar el equipo.");
    } finally { setGuardandoEditEquipo(false); }
  }

  async function handleDelete() {
    if (!confirmarEliminarEquipo) return;
    const id = confirmarEliminarEquipo.id;
    setEliminando(id);
    setErrorConfirmEquipo("");
    try {
      await api.deleteEquipo(id);
      setConfirmarEliminarEquipo(null);
      setSuccess("Equipo eliminado correctamente.");
      await recargar();
    } catch (err) {
      setErrorConfirmEquipo(err instanceof Error ? err.message : "No se pudo eliminar el equipo.");
    } finally { setEliminando(null); }
  }

  async function handleInscribir(e: React.FormEvent) {
    e.preventDefault();
    if (!modalInscribir || !inscribirTorneoId) return;
    setInscribiendo(true);
    setError("");
    setSuccess("");
    try {
      await api.createInscripcion({
        torneo_id: inscribirTorneoId,
        club_equipo_id: modalInscribir.id,
      });
      const t = torneos.find(t => t.id === inscribirTorneoId);
      setSuccess(`Equipo "${modalInscribir.nombre_equipo}" inscrito en "${t?.nombre}".`);
      setModalInscribir(null);
      setInscribirTorneoId(0);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al inscribir equipo en torneo.");
    } finally {
      setInscribiendo(false);
    }
  }

  async function handleDesvincular(inscripcionId: number, equipoNombre: string) {
    setDesvinculando(inscripcionId);
    setError("");
    setSuccess("");
    try {
      await api.deleteInscripcion(inscripcionId);
      setSuccess(`Se desvinculó al equipo "${equipoNombre}" del torneo.`);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desvincular el equipo.");
    } finally {
      setDesvinculando(null);
    }
  }

  const instMap = new Map(instituciones.map(i => [i.id, i.nombre_corto || i.nombre]));
  const depMap  = new Map(deportes.map(d => [d.id, d.nombre]));
  const depObjMap = new Map(deportes.map(d => [d.id, d]));
  const torneosAbiertos = torneos.filter(t => t.estado === "inscripcion_abierta");
  const torneosCompatibles = form.deporte_id
    ? torneosAbiertos.filter(t => t.deporte_id === form.deporte_id)
    : torneosAbiertos;

  const filtrados = equipos.filter(eq =>
    eq.nombre_equipo.toLowerCase().includes(busqueda.toLowerCase()) ||
    (instMap.get(eq.institucion_id) ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const errorCarga =
    equiposQ.isError || institucionesQ.isError || deportesQ.isError || torneosQ.isError || inscripcionesQ.isError
      ? "No se pudo cargar los equipos."
      : "";
  const errorMostrado = error || errorCarga;
  const errorHint = errorMostrado.includes("inscripciones")
    ? { text: "Revisa las inscripciones y retira/elimina el equipo primero.", href: "/admin/inscripciones" }
    : errorMostrado.includes("atletas")
      ? { text: "Elimina o reasigna los atletas antes de borrar el equipo.", href: "/admin/atletas" }
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Equipos</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestión de clubes y equipos por institución.</p>
        </div>
        <button
          onClick={() => { setModal(true); setErrorForm(""); setSuccess(""); setError(""); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo equipo
        </button>
      </div>

      {errorMostrado && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>{errorMostrado}</p>
            {errorHint && (
              <Link href={errorHint.href} className="inline-flex text-xs font-semibold text-red-700 hover:underline">
                {errorHint.text}
              </Link>
            )}
          </div>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          <CheckCircle className="w-4 h-4 shrink-0" />{success}
        </div>
      )}

      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por equipo o institución..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="w-10"></th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Equipo</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Institución</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Deporte</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Torneo Inscrito</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cargando ? (
              <tr><td colSpan={8} className="text-center py-14 text-sm text-gray-400">Cargando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-14 text-sm text-gray-400">
                {busqueda ? "Sin resultados" : "No hay equipos registrados"}
              </td></tr>
            ) : filtrados.map(eq => {
              const insc = inscripciones.find(i => {
                if (i.club_equipo_id !== eq.id || i.estado === "retirado") return false;
                const t = torneos.find(tor => tor.id === i.torneo_id);
                return t && t.estado !== "finalizado" && t.estado !== "suspendido";
              });
              const torneoAsoc = insc ? torneos.find(t => t.id === insc.torneo_id) : null;
              return (
                <React.Fragment key={eq.id}>
                  <tr className="hover:bg-gray-50 transition-colors border-b border-gray-50">
                    <td className="px-3 py-4 text-center">
                      <button
                        onClick={() => toggleTeamExpand(eq.id)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-950 transition-colors"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedTeams.has(eq.id) ? "rotate-180 text-red-600" : ""}`} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">{String(eq.id).padStart(2, "0")}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                          <Dumbbell className="w-4 h-4 text-red-600" />
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{eq.nombre_equipo}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{instMap.get(eq.institucion_id) ?? `#${eq.institucion_id}`}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{depMap.get(eq.deporte_id) ?? `#${eq.deporte_id}`}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {torneoAsoc ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold">
                            <Trophy className="w-3 h-3 text-indigo-600" />
                            {torneoAsoc.nombre}
                          </span>
                          {torneoAsoc.estado === "inscripcion_abierta" && insc && (
                            <button
                              onClick={() => handleDesvincular(insc.id, eq.nombre_equipo)}
                              disabled={desvinculando === insc.id}
                              title="Desvincular del torneo"
                              className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-30"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : eq.estado === "aprobado" ? (
                        <button
                          onClick={() => {
                            setModalInscribir(eq);
                            setInscribirTorneoId(0);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-300 text-xs font-semibold transition"
                        >
                          <Link2 className="w-3 h-3" />
                          Asignar Torneo
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">Aprobar primero</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_BADGE[eq.estado] ?? "bg-gray-100 text-gray-500"}`}>
                        {eq.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        {eq.estado === "pendiente" && (
                          <button
                            onClick={() => handleAprobar(eq.id)}
                            disabled={aprobando === eq.id}
                            title="Aprobar equipo"
                            className="text-green-500 hover:text-green-700 disabled:opacity-40 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => { setModalEditEquipo(eq); setFormEditEquipo({ nombre_equipo: eq.nombre_equipo }); setErrorEditEquipoForm(""); }}
                          title="Editar equipo"
                          className="text-gray-300 hover:text-blue-500 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setConfirmarEliminarEquipo(eq); setErrorConfirmEquipo(""); }}
                          title="Eliminar equipo"
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expandedTeams.has(eq.id) && (
                    <tr className="bg-gray-50/50">
                      <td colSpan={8} className="px-8 py-4 border-b border-gray-100">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Integrantes del Equipo</span>
                              <span className="px-2.5 py-0.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-full">
                                {atletasPorEquipo[eq.id]?.length || 0}
                              </span>
                            </div>
                            {eq.estado === "aprobado" ? (
                              <button
                                onClick={() => {
                                  setModalAtletaTeam(eq);
                                  setFormAtleta({ nombre_completo: "", numero_camiseta: "", posicion_rol: "", documento_identidad: "" });
                                  setErrorAtletaForm("");
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition shadow-sm"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                Registrar Atleta
                              </button>
                            ) : (
                              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 font-medium">
                                El equipo debe ser aprobado para registrar atletas
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/50">
                            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">Estadísticas por Torneo</span>
                              <select
                                value={filtroTorneo[eq.id] ?? ""}
                                onChange={e => handleFiltroStatsChange(eq.id, e.target.value ? Number(e.target.value) : undefined, filtroFase[eq.id])}
                                className="border-none text-xs font-semibold text-gray-700 focus:outline-none focus:ring-0 bg-transparent p-0 cursor-pointer font-sans"
                              >
                                <option value="">Global (Total)</option>
                                {torneos.map(t => (
                                  <option key={t.id} value={t.id}>{t.nombre}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">Fase</span>
                              <select
                                value={filtroFase[eq.id] ?? ""}
                                onChange={e => handleFiltroStatsChange(eq.id, filtroTorneo[eq.id], e.target.value || undefined)}
                                className="border-none text-xs font-semibold text-gray-700 focus:outline-none focus:ring-0 bg-transparent p-0 cursor-pointer font-sans"
                              >
                                <option value="">Todas las fases</option>
                                <option value="Fase de Grupos">Fase de Grupos</option>
                                <option value="Cuartos de Final">Cuartos de Final</option>
                                <option value="Semifinales">Semifinales</option>
                                <option value="Final">Final</option>
                              </select>
                            </div>

                            {filtroTorneo[eq.id] ? (
                              <span className="text-xs text-gray-400 italic">
                                * Las estadísticas por torneo son de solo lectura y se calculan desde los encuentros.
                              </span>
                            ) : null}
                          </div>

                          {cargandoAtletas[eq.id] ? (
                            <div className="text-center py-8 text-sm text-gray-400 flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                              Cargando atletas...
                            </div>
                          ) : !atletasPorEquipo[eq.id] || atletasPorEquipo[eq.id].length === 0 ? (
                            <div className="text-center py-8 text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                              Sin atletas registrados en este equipo.
                            </div>
                          ) : (
                            <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Atleta</th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-16">N°</th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-24">
                                      {esFutbol(depObjMap.get(eq.deporte_id)) ? "Goles" : "Puntos"}
                                    </th>
                                    {esFutbol(depObjMap.get(eq.deporte_id)) && (
                                      <>
                                        <th className="px-4 py-2.5 text-xs font-bold text-amber-600 uppercase tracking-wider text-center w-16">TA</th>
                                        <th className="px-4 py-2.5 text-xs font-bold text-red-600 uppercase tracking-wider text-center w-16">TR</th>
                                      </>
                                    )}
                                    <th className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-28">Estado</th>
                                    <th className="px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-28">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {atletasPorEquipo[eq.id].map(a => {
                                    const dep = depObjMap.get(eq.deporte_id);
                                    const futbol = esFutbol(dep);
                                    const stat = editStats[a.id] ?? {};
                                    const statActual = {
                                      goles_anotados: stat.goles_anotados ?? a.goles_anotados,
                                      puntos_anotados: stat.puntos_anotados ?? a.puntos_anotados,
                                      tarjetas_amarillas: stat.tarjetas_amarillas ?? a.tarjetas_amarillas,
                                      tarjetas_rojas: stat.tarjetas_rojas ?? a.tarjetas_rojas,
                                    };
                                    const hayEdicion = editStats[a.id] !== undefined;
                                    const isFiltered = !!filtroTorneo[eq.id] || !!filtroFase[eq.id];
                                    return (
                                      <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                                              <User className="w-3.5 h-3.5 text-gray-400" />
                                            </div>
                                            <div>
                                              <p className="text-sm font-semibold text-gray-900 leading-tight">{a.nombre_completo}</p>
                                              <p className="text-xs text-gray-400 mt-0.5">{a.documento_identidad}{a.posicion_rol ? ` · ${a.posicion_rol}` : ""}</p>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm font-medium text-gray-600">{a.numero_camiseta ?? "—"}</td>
                                        <td className="px-4 py-3 text-center">
                                          {isFiltered ? (
                                            <span className="text-sm font-bold text-gray-900">
                                              {futbol ? statActual.goles_anotados : statActual.puntos_anotados}
                                            </span>
                                          ) : (
                                            <input
                                              type="number"
                                              min={0}
                                              value={futbol ? statActual.goles_anotados : statActual.puntos_anotados}
                                              onChange={e => {
                                                const val = Number(e.target.value);
                                                setEditStats(prev => ({
                                                  ...prev,
                                                  [a.id]: {
                                                    ...prev[a.id],
                                                    ...(futbol ? { goles_anotados: val } : { puntos_anotados: val }),
                                                  },
                                                }));
                                              }}
                                              className="w-14 text-center text-sm border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white transition bg-transparent"
                                            />
                                          )}
                                        </td>
                                        {futbol && (
                                          <>
                                            <td className="px-4 py-3 text-center">
                                              {isFiltered ? (
                                                <span className="text-sm font-bold text-gray-900">
                                                  {statActual.tarjetas_amarillas}
                                                </span>
                                              ) : (
                                                <input
                                                  type="number"
                                                  min={0}
                                                  value={statActual.tarjetas_amarillas}
                                                  onChange={e => {
                                                    const val = Number(e.target.value);
                                                    setEditStats(prev => ({
                                                      ...prev,
                                                      [a.id]: { ...prev[a.id], tarjetas_amarillas: val },
                                                    }));
                                                  }}
                                                  className="w-12 text-center text-sm border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white transition bg-transparent"
                                                />
                                              )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                              {isFiltered ? (
                                                <span className="text-sm font-bold text-gray-900">
                                                  {statActual.tarjetas_rojas}
                                                </span>
                                              ) : (
                                                <input
                                                  type="number"
                                                  min={0}
                                                  value={statActual.tarjetas_rojas}
                                                  onChange={e => {
                                                    const val = Number(e.target.value);
                                                    setEditStats(prev => ({
                                                      ...prev,
                                                      [a.id]: { ...prev[a.id], tarjetas_rojas: val },
                                                    }));
                                                  }}
                                                  className="w-12 text-center text-sm border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white transition bg-transparent"
                                                />
                                              )}
                                            </td>
                                          </>
                                        )}
                                        <td className="px-4 py-3 text-center">
                                          <span className={`inline-flex text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${
                                            a.estado === "activo" ? "bg-green-50 text-green-700" :
                                            a.estado === "suspendido" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-gray-100 text-gray-500"
                                          }`}>
                                            {a.estado}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <div className="flex items-center justify-center gap-1.5">
                                            {hayEdicion && (
                                              <button
                                                onClick={() => guardarStat(a)}
                                                disabled={guardandoStat === a.id}
                                                title="Guardar estadísticas"
                                                className="text-green-600 hover:text-green-700 p-1 hover:bg-green-50 rounded-lg transition"
                                              >
                                                <Save className="w-4 h-4" />
                                              </button>
                                            )}
                                            <button
                                              onClick={() => {
                                                setModalEditAtleta(a);
                                                setFormEditAtleta({
                                                  nombre_completo: a.nombre_completo,
                                                  numero_camiseta: a.numero_camiseta || "",
                                                  posicion_rol: a.posicion_rol || "",
                                                  documento_identidad: a.documento_identidad,
                                                  estado: a.estado,
                                                });
                                                setErrorEditAtletaForm("");
                                              }}
                                              title="Editar datos del atleta"
                                              className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition"
                                            >
                                              <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteAtleta(a)}
                                              disabled={eliminandoAtleta === a.id}
                                              title="Eliminar atleta del equipo"
                                              className="text-gray-300 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition disabled:opacity-30"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
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

      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Nuevo equipo</h2>
                <p className="text-xs text-gray-400 mt-0.5">El admin aprueba el equipo automáticamente</p>
              </div>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nombre del equipo</label>
                <input
                  value={form.nombre_equipo}
                  onChange={e => setForm({ ...form, nombre_equipo: e.target.value })}
                  maxLength={50}
                  required placeholder="Ej. UL Fútbol A"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Institución</label>
                <select
                  value={form.institucion_id || ""}
                  onChange={e => setForm({ ...form, institucion_id: Number(e.target.value) })}
                  required className={inputCls}
                >
                  <option value="">Seleccionar institución</option>
                  {instituciones.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Deporte</label>
                <select
                  value={form.deporte_id || ""}
                  onChange={e => setForm({ ...form, deporte_id: Number(e.target.value) })}
                  required className={inputCls}
                >
                  <option value="">Seleccionar deporte</option>
                  {deportes.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>

              {/* Torneo: requerido si hay abiertos, opcional si no */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Torneo
                  {torneosAbiertos.length > 0
                    ? <span className="ml-1 text-red-500">*</span>
                    : <span className="ml-1 font-normal text-gray-400">(opcional — no hay torneos abiertos)</span>
                  }
                </label>
                <select
                  value={form.torneo_id || ""}
                  onChange={e => setForm({ ...form, torneo_id: Number(e.target.value) })}
                  className={inputCls}
                >
                  <option value="">
                    {torneosCompatibles.length > 0
                      ? "Seleccionar torneo"
                      : form.deporte_id
                        ? "Sin torneos abiertos para este deporte"
                        : "Selecciona un deporte primero"}
                  </option>
                  {torneosCompatibles.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre} ({t.temporada})</option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-gray-400">
                  El equipo se inscribe automáticamente. Sin inscripción no aparece en Sorteos.
                </p>
              </div>

              {errorForm && <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">{errorForm}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModal(false); setErrorForm(""); }}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 rounded-lg text-sm transition">
                  {guardando ? "Guardando..." : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para inscribir equipo existente */}
      {modalInscribir && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Trophy className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Inscribir en Torneo</h2>
                <p className="text-xs text-gray-400 mt-0.5">Asignar torneo al equipo para permitir su participación</p>
              </div>
            </div>
            <form onSubmit={handleInscribir} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Equipo</label>
                <div className="w-full bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-900 border border-gray-100 font-semibold">
                  {modalInscribir.nombre_equipo}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Deporte</label>
                <div className="w-full bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-600 border border-gray-100">
                  {depMap.get(modalInscribir.deporte_id) ?? "Desconocido"}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Seleccionar Torneo</label>
                <select
                  value={inscribirTorneoId || ""}
                  onChange={e => setInscribirTorneoId(Number(e.target.value))}
                  required
                  className={inputCls}
                >
                  <option value="">Seleccionar torneo abierto</option>
                  {torneos
                    .filter(t => t.deporte_id === modalInscribir.deporte_id && t.estado === "inscripcion_abierta")
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nombre} ({t.temporada})
                      </option>
                    ))}
                </select>
                {torneos.filter(t => t.deporte_id === modalInscribir.deporte_id && t.estado === "inscripcion_abierta").length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    No hay torneos abiertos con inscripciones disponibles para este deporte.
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalInscribir(null)}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={inscribiendo || !inscribirTorneoId}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 rounded-lg text-sm transition"
                >
                  {inscribiendo ? "Inscribiendo..." : "Inscribir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para registrar Atleta directamente */}
      {modalAtletaTeam && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Registrar Atleta</h2>
                <p className="text-xs text-gray-400 mt-0.5">Equipo: <span className="font-semibold text-gray-700">{modalAtletaTeam.nombre_equipo}</span></p>
              </div>
            </div>
            <form onSubmit={handleCreateAtleta} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nombre Completo</label>
                <input
                  value={formAtleta.nombre_completo}
                  onChange={e => setFormAtleta({ ...formAtleta, nombre_completo: e.target.value })}
                  maxLength={80}
                  required
                  placeholder="Ej. Juan Pérez López"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Documento de Identidad</label>
                <input
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={8}
                  value={formAtleta.documento_identidad}
                  onChange={e => setFormAtleta({ ...formAtleta, documento_identidad: e.target.value.replace(/\D/g, "") })}
                  required
                  placeholder="Ej. 70605040"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">N° Camiseta</label>
                  <input
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={2}
                    value={formAtleta.numero_camiseta}
                    onChange={e => setFormAtleta({ ...formAtleta, numero_camiseta: e.target.value.replace(/\D/g, "") })}
                    placeholder="Ej. 10"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Posición / Rol</label>
                  <input
                    value={formAtleta.posicion_rol}
                    onChange={e => setFormAtleta({ ...formAtleta, posicion_rol: e.target.value.replace(/\d/g, "") })}
                    maxLength={30}
                    placeholder="Ej. Delantero"
                    className={inputCls}
                  />
                </div>
              </div>

              {errorAtletaForm && <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg border border-red-100">{errorAtletaForm}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAtletaTeam(null)}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoAtleta}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 rounded-xl text-sm transition"
                >
                  {guardandoAtleta ? "Guardando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para editar Atleta */}
      {modalEditAtleta && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Editar Atleta</h2>
                <p className="text-xs text-gray-400 mt-0.5">DNI: <span className="font-semibold text-gray-700">{modalEditAtleta.documento_identidad}</span></p>
              </div>
            </div>
            <form onSubmit={handleEditAtleta} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nombre Completo</label>
                <input
                  value={formEditAtleta.nombre_completo}
                  onChange={e => setFormEditAtleta({ ...formEditAtleta, nombre_completo: e.target.value })}
                  maxLength={80}
                  required
                  placeholder="Ej. Juan Pérez López"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">N° Camiseta</label>
                  <input
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={2}
                    value={formEditAtleta.numero_camiseta}
                    onChange={e => setFormEditAtleta({ ...formEditAtleta, numero_camiseta: e.target.value.replace(/\D/g, "") })}
                    placeholder="Ej. 10"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Posición / Rol</label>
                  <input
                    value={formEditAtleta.posicion_rol}
                    onChange={e => setFormEditAtleta({ ...formEditAtleta, posicion_rol: e.target.value.replace(/\d/g, "") })}
                    maxLength={30}
                    placeholder="Ej. Delantero"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Estado</label>
                <select
                  value={formEditAtleta.estado}
                  onChange={e => setFormEditAtleta({ ...formEditAtleta, estado: e.target.value })}
                  className={inputCls}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="suspendido">Suspendido</option>
                </select>
              </div>

              {errorEditAtletaForm && <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg border border-red-100">{errorEditAtletaForm}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalEditAtleta(null)}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEditAtleta}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 rounded-xl text-sm transition"
                >
                  {guardandoEditAtleta ? "Guardando..." : "Actualizar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para editar equipo (renombrar) */}
      {modalEditEquipo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Editar equipo</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {instMap.get(modalEditEquipo.institucion_id) ?? ""} · {depMap.get(modalEditEquipo.deporte_id) ?? ""}
                </p>
              </div>
            </div>
            <form onSubmit={handleEditEquipo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nombre del equipo</label>
                <input
                  value={formEditEquipo.nombre_equipo}
                  onChange={e => setFormEditEquipo({ nombre_equipo: e.target.value })}
                  maxLength={50}
                  required placeholder="Ej. UL Fútbol A"
                  className={inputCls}
                />
              </div>
              {errorEditEquipoForm && <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">{errorEditEquipoForm}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalEditEquipo(null); setErrorEditEquipoForm(""); }}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={guardandoEditEquipo}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 rounded-lg text-sm transition">
                  {guardandoEditEquipo ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación de equipo */}
      {confirmarEliminarEquipo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Eliminar equipo</h2>
            </div>
            <p className="text-sm text-gray-600">
              ¿Seguro que deseas eliminar <span className="font-semibold text-gray-900">{confirmarEliminarEquipo.nombre_equipo}</span>?
              Dejará de mostrarse en la lista, pero se conservará en la base de datos.
            </p>
            {errorConfirmEquipo && (
              <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{errorConfirmEquipo}
              </div>
            )}
            <div className="flex gap-3 pt-5">
              <button type="button" onClick={() => { setConfirmarEliminarEquipo(null); setErrorConfirmEquipo(""); }}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button type="button" onClick={handleDelete} disabled={eliminando === confirmarEliminarEquipo.id}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 rounded-lg text-sm transition">
                {eliminando === confirmarEliminarEquipo.id ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
