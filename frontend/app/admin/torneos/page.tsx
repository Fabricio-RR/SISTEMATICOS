"use client";
import { useEffect, useState } from "react";
import { Medal, Plus, Trash2, Search, AlertCircle, ChevronRight, PauseCircle, Lock, Shuffle, Play, Award, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Torneo, Deporte, FormatoTorneo, EstadoTorneo } from "@/types/api";
import {
  ESTADO_TORNEO_LABEL,
  ESTADO_TORNEO_BADGE,
  ESTADO_TORNEO_SIGUIENTE,
} from "@/types/api";

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition";

const FORMATO_LABEL: Record<FormatoTorneo, string> = {
  liga: "Liga",
  eliminacion_simple: "Eliminación directa",
  grupos: "Grupos + eliminación",
};

const ACCION_VERBOS: Record<string, { label: string; bg: string; text: string; hover: string; border: string }> = {
  inscripcion_abierta: {
    label: "Cerrar Inscripción",
    bg: "bg-amber-50",
    text: "text-amber-700",
    hover: "hover:bg-amber-100",
    border: "border-amber-200",
  },
  inscripcion_cerrada: {
    label: "Habilitar Sorteo",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    hover: "hover:bg-indigo-100",
    border: "border-indigo-200",
  },
  en_sorteo: {
    label: "Iniciar Torneo",
    bg: "bg-green-50",
    text: "text-green-700",
    hover: "hover:bg-green-100",
    border: "border-green-200",
  },
  en_curso: {
    label: "Finalizar Torneo",
    bg: "bg-red-50",
    text: "text-red-700",
    hover: "hover:bg-red-100",
    border: "border-red-200",
  },
};

const FASES_TORNEO: { key: EstadoTorneo; label: string }[] = [
  { key: "inscripcion_abierta", label: "Registro" },
  { key: "inscripcion_cerrada", label: "Cierre" },
  { key: "en_sorteo", label: "Sorteo" },
  { key: "en_curso", label: "En Curso" },
  { key: "finalizado", label: "Finalizado" }
];

export default function TorneosPage() {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    nombre: "", deporte_id: 0,
    formato: "liga" as FormatoTorneo,
    temporada: new Date().getFullYear().toString(),
  });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [accionando, setAccionando] = useState<number | null>(null);
  const [torneosConFixture, setTorneosConFixture] = useState<Set<number>>(new Set());

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const [torn, dep, fixes] = await Promise.all([api.getTorneos(), api.getDeportes(), api.getFixture()]);
      setTorneos(torn);
      setDeportes(dep);
      setTorneosConFixture(new Set(fixes.map(f => f.torneo_id)));
    } catch { setError("No se pudo cargar los torneos."); }
    finally { setCargando(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.deporte_id) { setErrorForm("Selecciona un deporte."); return; }
    if (form.nombre.length > 150) {
      setErrorForm("El nombre del torneo no puede tener más de 150 caracteres.");
      return;
    }
    if (form.temporada.length > 20) {
      setErrorForm("La temporada no puede tener más de 20 caracteres.");
      return;
    }
    setGuardando(true);
    setErrorForm("");
    try {
      await api.createTorneo(form);
      setModal(false);
      setForm({ nombre: "", deporte_id: 0, formato: "liga", temporada: new Date().getFullYear().toString() });
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "Error al guardar");
    } finally { setGuardando(false); }
  }

  async function handleAvanzar(id: number) {
    setAccionando(id);
    setError("");
    try {
      await api.avanzarTorneo(id);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al avanzar el torneo.");
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setAccionando(null);
    }
  }

  async function handleReactivar(id: number) {
    setAccionando(id);
    setError("");
    try {
      await api.reactivarTorneo(id);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al reactivar el torneo.");
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setAccionando(null);
    }
  }

  async function handleSuspender(id: number) {
    setAccionando(id);
    setError("");
    try {
      await api.suspenderTorneo(id);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al suspender el torneo.");
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setAccionando(null);
    }
  }

  async function handleDelete(id: number) {
    setError("");
    try {
      await api.deleteTorneo(id);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el torneo.");
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }

  const depMap = new Map(deportes.map((d) => [d.id, d.nombre]));
  const filtrados = torneos.filter((t) =>
    t.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    t.temporada.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Torneos</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestión de competencias y temporadas.</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo torneo
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Leyenda de flujo */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
        {(["inscripcion_abierta", "inscripcion_cerrada", "en_sorteo", "en_curso", "finalizado"] as EstadoTorneo[]).map((e, i, arr) => (
          <span key={e} className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-full font-semibold ${ESTADO_TORNEO_BADGE[e]}`}>
              {ESTADO_TORNEO_LABEL[e]}
            </span>
            {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300" />}
          </span>
        ))}
      </div>

      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar torneo o temporada..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Torneo</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Deporte</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Formato</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Temporada</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fases de Progreso</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones de Flujo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cargando ? (
              <tr><td colSpan={7} className="text-center py-14 text-sm text-gray-400">Cargando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-14 text-sm text-gray-400">
                {busqueda ? "Sin resultados" : "No hay torneos registrados"}
              </td></tr>
            ) : filtrados.map((t) => {
              const siguiente = ESTADO_TORNEO_SIGUIENTE[t.estado];
              return (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-400 font-mono">{String(t.id).padStart(2, "0")}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <Medal className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t.nombre}</p>
                        {t.estado === "suspendido" && (
                          <span className="inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 mt-0.5">
                            SUSPENDIDO
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{depMap.get(t.deporte_id) ?? `#${t.deporte_id}`}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{FORMATO_LABEL[t.formato]}</td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700">{t.temporada}</td>
                  
                  {/* Stepper horizontal del progreso del torneo */}
                  <td className="px-6 py-4">
                    {t.estado === "suspendido" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Competencia en pausa
                      </span>
                    ) : (
                      <div className="flex items-center justify-start gap-1">
                        {FASES_TORNEO.map((f, idx) => {
                          const isCurrent = t.estado === f.key;
                          const isPast = FASES_TORNEO.findIndex(x => x.key === t.estado) > idx;
                          return (
                            <div key={f.key} className="flex items-center">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition whitespace-nowrap ${
                                  isCurrent
                                    ? "bg-red-600 text-white shadow-sm ring-2 ring-red-100"
                                    : isPast
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "bg-gray-50 text-gray-400 border border-gray-100"
                                }`}
                                title={ESTADO_TORNEO_LABEL[f.key]}
                              >
                                {f.label}
                              </span>
                              {idx < FASES_TORNEO.length - 1 && (
                                <span className={`h-0.5 w-3 mx-0.5 ${isPast ? "bg-green-300" : "bg-gray-100"}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>

                  {/* Acciones de flujo intuitivas */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1.5 justify-center">
                      <div className="flex items-center gap-2">
                        {siguiente && (() => {
                          const verbObj = ACCION_VERBOS[t.estado];
                          if (!verbObj) return null;

                          let IconComp = ChevronRight;
                          if (t.estado === "inscripcion_abierta") IconComp = Lock;
                          else if (t.estado === "inscripcion_cerrada") IconComp = Shuffle;
                          else if (t.estado === "en_sorteo") IconComp = Play;
                          else if (t.estado === "en_curso") IconComp = Award;

                          const sinFixture = t.estado === "en_sorteo" && !torneosConFixture.has(t.id);

                          return (
                            <button
                              onClick={() => {
                                if (sinFixture) {
                                  setError("Debes generar el fixture en Sorteos antes de iniciar el torneo.");
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                  return;
                                }
                                handleAvanzar(t.id);
                              }}
                              disabled={accionando === t.id}
                              title={sinFixture ? "Primero genera el fixture en Sorteos" : `Pasar a ${ESTADO_TORNEO_LABEL[siguiente]}`}
                              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition shadow-sm ${verbObj.bg} ${verbObj.text} ${verbObj.border} ${verbObj.hover} disabled:opacity-40`}
                            >
                              <IconComp className="w-3.5 h-3.5 shrink-0" />
                              {verbObj.label}
                            </button>
                          );
                        })()}

                        {t.estado === "suspendido" && (
                          <button
                            onClick={() => handleReactivar(t.id)}
                            disabled={accionando === t.id}
                            title="Reactivar torneo"
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition shadow-sm disabled:opacity-40"
                          >
                            <Play className="w-3.5 h-3.5 shrink-0" />
                            Reactivar
                          </button>
                        )}
                        {t.estado !== "finalizado" && t.estado !== "suspendido" && (
                          <button
                            onClick={() => handleSuspender(t.id)}
                            disabled={accionando === t.id}
                            title="Suspender torneo"
                            className="p-1.5 rounded-lg border border-gray-100 bg-gray-50 text-gray-400 hover:text-amber-500 hover:border-amber-200 transition-colors shadow-sm"
                          >
                            <PauseCircle className="w-4 h-4" />
                          </button>
                        )}
                        {t.estado !== "en_curso" && t.estado !== "finalizado" && (
                          <button
                            onClick={() => handleDelete(t.id)}
                            title="Eliminar torneo"
                            className="p-1.5 rounded-lg border border-gray-100 bg-gray-50 text-gray-300 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Mensaje de ayuda contextual */}
                      {t.estado === "en_sorteo" && !torneosConFixture.has(t.id) && (
                        <p className="text-[10px] text-red-500 font-semibold flex items-center gap-0.5 animate-pulse mt-0.5">
                          <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                          <span>Genera el fixture en <Link href="/admin/sorteos" className="underline hover:text-red-700">Sorteos</Link> primero</span>
                        </p>
                      )}
                      {t.estado === "inscripcion_abierta" && (
                        <p className="text-[10px] text-gray-400 font-medium">
                          Los equipos se inscriben libremente
                        </p>
                      )}
                      {t.estado === "inscripcion_cerrada" && (
                        <p className="text-[10px] text-gray-400 font-medium">
                          Inscripción cerrada. Habilita sorteo para armar partidos
                        </p>
                      )}
                      {t.estado === "en_curso" && (
                        <p className="text-[10px] text-gray-400 font-medium">
                          Torneo activo, actualiza resultados en panel
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
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
                <Medal className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Nuevo torneo</h2>
                <p className="text-xs text-gray-400 mt-0.5">Inicia en estado Inscripción abierta</p>
              </div>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nombre</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  maxLength={150}
                  required placeholder="Ej. Copa Interuniversitaria Fútbol"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Deporte</label>
                <select
                  value={form.deporte_id || ""}
                  onChange={(e) => setForm({ ...form, deporte_id: Number(e.target.value) })}
                  required className={inputCls}
                >
                  <option value="">Seleccionar deporte</option>
                  {deportes.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Formato</label>
                <select
                  value={form.formato}
                  onChange={(e) => setForm({ ...form, formato: e.target.value as FormatoTorneo })}
                  className={inputCls}
                >
                  <option value="liga">Liga</option>
                  <option value="eliminacion_simple">Eliminación directa</option>
                  <option value="grupos">Grupos + eliminación</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Temporada</label>
                <input
                  value={form.temporada}
                  onChange={(e) => setForm({ ...form, temporada: e.target.value })}
                  maxLength={20}
                  required placeholder="Ej. 2026"
                  className={inputCls}
                />
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
    </div>
  );
}
