"use client";
import { useEffect, useState } from "react";
import {
  ClipboardList, CheckCircle, XCircle, Search,
  RefreshCw, Trash2, Plus, Filter, AlertCircle, LogOut,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useInscripciones, useTorneos, useEquipos, usePartidos } from "@/lib/hooks";
import type { EstadoInscripcion, InscripcionCreate } from "@/types/api";

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
  retirado: "bg-slate-100 text-slate-500",
};

export default function InscripcionesPage() {
  const queryClient = useQueryClient();
  const inscQ = useInscripciones();
  const torneosQ = useTorneos();
  const equiposQ = useEquipos();
  const partidosQ = usePartidos();
  const inscripciones = inscQ.data ?? [];
  const torneos = torneosQ.data ?? [];
  const equipos = equiposQ.data ?? [];
  const partidos = partidosQ.data ?? [];
  const cargando = inscQ.isLoading || torneosQ.isLoading || equiposQ.isLoading || partidosQ.isLoading;
  const recargar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["inscripciones"] }),
      queryClient.invalidateQueries({ queryKey: ["partidos"] }),
    ]);

  const [tab, setTab] = useState<Tab>("pendiente");
  const [torneoFiltro, setTorneoFiltro] = useState<number | undefined>();
  const [busqueda, setBusqueda] = useState("");
  const [accion, setAccion] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<InscripcionCreate>({ torneo_id: 0, club_equipo_id: 0 });

  const errorMostrado = error || ((inscQ.isError || torneosQ.isError || equiposQ.isError || partidosQ.isError) ? "No se pudo cargar las inscripciones." : "");
  useEffect(() => {
    if (!form.torneo_id || !form.club_equipo_id) return;
    const torneoSel = torneos.find((t) => t.id === form.torneo_id);
    const equipoSel = equipos.find((e) => e.id === form.club_equipo_id);
    const compatible = Boolean(
      torneoSel
      && equipoSel
      && equipoSel.estado === "aprobado"
      && equipoSel.deporte_id === torneoSel.deporte_id
    );
    const yaInscrito = inscripciones.some(
      (i) => i.torneo_id === form.torneo_id && i.club_equipo_id === form.club_equipo_id
    );
    if (!compatible || yaInscrito) {
      setForm((f) => ({ ...f, club_equipo_id: 0 }));
    }
  }, [form.torneo_id, form.club_equipo_id, torneos, equipos, inscripciones]);

  async function aprobar(id: number) {
    setAccion(id);
    setError("");
    try { await api.aprobarInscripcion(id); await recargar(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo aprobar la inscripción."); }
    finally { setAccion(null); }
  }

  async function rechazar(id: number) {
    setAccion(id);
    setError("");
    try { await api.rechazarInscripcion(id); await recargar(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo rechazar la inscripción."); }
    finally { setAccion(null); }
  }

  async function retirar(id: number) {
    setAccion(id);
    setError("");
    try { await api.retirarInscripcion(id); await recargar(); }
    catch (e) { setError(e instanceof Error ? e.message : "Error al retirar"); }
    finally { setAccion(null); }
  }

  async function eliminar(id: number) {
    setAccion(id);
    setError("");
    try { await api.deleteInscripcion(id); await recargar(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar la inscripción."); }
    finally { setAccion(null); }
  }

  async function crear() {
    if (!form.torneo_id || !form.club_equipo_id) {
      setError("Selecciona torneo y equipo.");
      return;
    }
    setError("");
    try {
      await api.createInscripcion(form);
      setShowModal(false);
      setForm({ torneo_id: 0, club_equipo_id: 0 });
      await recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al inscribir");
    }
  }

  const torneosAbiertos = torneos.filter((t) => t.estado === "inscripcion_abierta");
  const equiposAprobados = equipos.filter((e) => e.estado === "aprobado");
  const torneosActivosIds = new Set(torneos.filter((t) => t.estado !== "suspendido").map((t) => t.id));
  const inscripcionesFiltradas = (torneoFiltro
    ? inscripciones.filter((i) => i.torneo_id === torneoFiltro)
    : inscripciones
  ).filter((i) => torneosActivosIds.has(i.torneo_id));
  const torneoSeleccionado = torneos.find((t) => t.id === form.torneo_id);
  const equiposCompatibles = torneoSeleccionado
    ? equiposAprobados.filter((e) => e.deporte_id === torneoSeleccionado.deporte_id)
    : equiposAprobados;
  const equiposYaInscritos = new Set(
    form.torneo_id
      ? inscripciones.filter((i) => i.torneo_id === form.torneo_id).map((i) => i.club_equipo_id)
      : []
  );
  const equiposDisponibles = form.torneo_id
    ? equiposCompatibles.filter((e) => !equiposYaInscritos.has(e.id))
    : equiposCompatibles;

  // IDs de inscripciones con partidos pendientes (programado o en_curso)
  const inscripcionesConPartidos = new Set<number>();
  partidos.forEach((p) => {
    if (p.estado === "programado" || p.estado === "en_curso") {
      if (p.inscripcion_local_id != null) inscripcionesConPartidos.add(p.inscripcion_local_id);
      if (p.inscripcion_visitante_id != null) inscripcionesConPartidos.add(p.inscripcion_visitante_id);
    }
  });

  // Torneos que aún no han comenzado (sin partidos todavía)
  const torneosSinComenzar = new Set(
    torneos.filter((t) => ["inscripcion_abierta", "inscripcion_cerrada", "en_sorteo"].includes(t.estado)).map((t) => t.id)
  );

  const counts: Record<Tab, number> = {
    pendiente: inscripcionesFiltradas.filter((i) => i.estado === "pendiente").length,
    aprobado: inscripcionesFiltradas.filter((i) => {
      if (i.estado !== "aprobado") return false;
      const tienePartidosPendientes = inscripcionesConPartidos.has(i.id);
      const torneoSinComenzar = torneosSinComenzar.has(i.torneo_id);
      return tienePartidosPendientes || torneoSinComenzar;
    }).length,
    rechazado: inscripcionesFiltradas.filter((i) => i.estado === "rechazado").length,
    retirado: inscripcionesFiltradas.filter((i) => i.estado === "retirado").length,
  };

  const lista = inscripcionesFiltradas
    .filter((i) => i.estado === tab)
    .filter((i) => {
      // En tab "aprobado", ocultar equipos eliminados (sin partidos pendientes y torneo ya en curso/finalizado)
      if (tab === "aprobado") {
        const tienePartidosPendientes = inscripcionesConPartidos.has(i.id);
        const torneoSinComenzar = torneosSinComenzar.has(i.torneo_id);
        if (!tienePartidosPendientes && !torneoSinComenzar) return false;
      }
      const texto = `${i.club_equipo?.nombre_equipo ?? ""} ${i.torneo?.nombre ?? ""}`.toLowerCase();
      return texto.includes(busqueda.toLowerCase());
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Administración</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">Inscripciones</h1>
          <p className="text-sm text-slate-400 mt-0.5">Gestión de equipos inscritos por torneo.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={recargar}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Nueva inscripción
          </button>
        </div>
      </div>

      {errorMostrado && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMostrado}
        </div>
      )}

      {/* Tabs de estado */}
      <div className="grid grid-cols-4 gap-4">
        {(["pendiente", "aprobado", "rechazado", "retirado"] as Tab[]).map((estado) => (
          <button
            key={estado}
            onClick={() => setTab(estado)}
            className={`p-4 rounded-xl border text-left transition-all ${
              tab === estado
                ? "border-red-200 bg-red-50"
                : "border-slate-100 bg-white hover:border-slate-200"
            }`}
          >
            <p className="text-2xl font-bold text-slate-900">{counts[estado]}</p>
            <p className="text-sm text-slate-500 mt-1">{LABEL[estado]}</p>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar equipo o torneo..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={torneoFiltro ?? ""}
            onChange={(e) => setTorneoFiltro(e.target.value ? Number(e.target.value) : undefined)}
            className="pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Todos los torneos</option>
            {torneos.filter((t) => t.estado !== "suspendido").map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center h-40 text-sm text-slate-400">Cargando...</div>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-300">
            <ClipboardList className="w-8 h-8 mb-2" strokeWidth={1.5} />
            <p className="text-sm text-slate-400">Sin inscripciones {LABEL[tab].toLowerCase()}s</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Equipo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Torneo</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Seeding</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lista.map((insc) => (
                <tr key={insc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                    {insc.club_equipo?.nombre_equipo ?? `Equipo #${insc.club_equipo_id}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {insc.torneo?.nombre ?? `Torneo #${insc.torneo_id}`}
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-slate-500">{insc.numero_seeding ?? "—"}</td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${BADGE[insc.estado]}`}>
                      {LABEL[insc.estado]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1.5">
                      {insc.estado === "pendiente" && (
                        <>
                          <button
                            onClick={() => aprobar(insc.id)}
                            disabled={accion === insc.id}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                            title="Aprobar"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => rechazar(insc.id)}
                            disabled={accion === insc.id}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Rechazar"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {insc.estado === "aprobado" && (
                        <button
                          onClick={() => retirar(insc.id)}
                          disabled={accion === insc.id}
                          className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition disabled:opacity-50"
                          title="Retirar equipo (W.O.)"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => eliminar(insc.id)}
                        disabled={accion === insc.id}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-5">Nueva inscripción</h2>
              {torneosAbiertos.length === 0 && (
                <div className="mb-4 flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                No hay torneos con inscripción abierta. Crea un torneo o avanza su estado a Inscripción abierta.
                </div>
              )}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Torneo</label>
                  <select
                    value={form.torneo_id || ""}
                    onChange={(e) => setForm((f) => ({ ...f, torneo_id: Number(e.target.value), club_equipo_id: 0 }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                  <option value="">Seleccionar torneo</option>
                  {torneosAbiertos.length === 0 && (
                    <option disabled value="">— No hay torneos con inscripción abierta —</option>
                  )}
                  {torneosAbiertos.map((t) => <option key={t.id} value={t.id}>{t.nombre} ({t.temporada})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Equipo</label>
                  <select
                    value={form.club_equipo_id || ""}
                    onChange={(e) => setForm((f) => ({ ...f, club_equipo_id: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Seleccionar equipo</option>
                    {equiposDisponibles.length === 0 && (
                      <option disabled value="">
                        {form.torneo_id ? "— No hay equipos compatibles disponibles —" : "— Selecciona un torneo —"}
                      </option>
                    )}
                    {equiposDisponibles.map((e) => <option key={e.id} value={e.id}>{e.nombre_equipo}</option>)}
                  </select>
                </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Seeding (opcional)</label>
                <input
                  type="number"
                  min={1}
                  value={form.numero_seeding ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, numero_seeding: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
              >
                Cancelar
              </button>
              <button
                onClick={crear}
                disabled={!form.torneo_id || !form.club_equipo_id || torneosAbiertos.length === 0 || equiposDisponibles.length === 0}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                Inscribir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
