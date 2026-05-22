"use client";
import { useEffect, useState } from "react";
import { Dumbbell, Plus, Trash2, Search, AlertCircle, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { ClubEquipo, Institucion, Deporte } from "@/types/api";

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition";

const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-amber-50 text-amber-700",
  aprobado: "bg-green-50 text-green-700",
  rechazado: "bg-red-50 text-red-600",
};

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<ClubEquipo[]>([]);
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre_equipo: "", institucion_id: 0, deporte_id: 0 });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [aprobando, setAprobando] = useState<number | null>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const [eq, inst, dep] = await Promise.all([api.getEquipos(), api.getInstituciones(), api.getDeportes()]);
      setEquipos(eq);
      setInstituciones(inst);
      setDeportes(dep);
    } catch { setError("No se pudo cargar los equipos."); }
    finally { setCargando(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.institucion_id || !form.deporte_id) { setErrorForm("Selecciona institución y deporte."); return; }
    setGuardando(true);
    setErrorForm("");
    try {
      await api.createEquipo(form);
      setModal(false);
      setForm({ nombre_equipo: "", institucion_id: 0, deporte_id: 0 });
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "Error al guardar");
    } finally { setGuardando(false); }
  }

  async function handleAprobar(id: number) {
    setAprobando(id);
    try { await api.aprobarEquipo(id); await cargar(); }
    catch { setError("No se pudo aprobar el equipo."); }
    finally { setAprobando(null); }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este equipo?")) return;
    try { await api.deleteEquipo(id); await cargar(); }
    catch { setError("No se pudo eliminar el equipo."); }
  }

  const instMap = new Map(instituciones.map((i) => [i.id, i.nombre_corto || i.nombre]));
  const depMap = new Map(deportes.map((d) => [d.id, d.nombre]));

  const filtrados = equipos.filter((eq) =>
    eq.nombre_equipo.toLowerCase().includes(busqueda.toLowerCase()) ||
    (instMap.get(eq.institucion_id) ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Equipos</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestión de clubes y equipos por institución.</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo equipo
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por equipo o institución..."
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
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Equipo</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Institución</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Deporte</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cargando ? (
              <tr><td colSpan={6} className="text-center py-14 text-sm text-gray-400">Cargando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-14 text-sm text-gray-400">
                {busqueda ? "Sin resultados" : "No hay equipos registrados"}
              </td></tr>
            ) : filtrados.map((eq) => (
              <tr key={eq.id} className="hover:bg-gray-50 transition-colors">
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
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_BADGE[eq.estado] ?? "bg-gray-100 text-gray-500"}`}>
                    {eq.estado}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
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
                    <button onClick={() => handleDelete(eq.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
              <h2 className="text-lg font-bold text-gray-900">Nuevo equipo</h2>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nombre del equipo</label>
                <input
                  value={form.nombre_equipo}
                  onChange={(e) => setForm({ ...form, nombre_equipo: e.target.value })}
                  required placeholder="Ej. UL Fútbol A"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Institución</label>
                <select
                  value={form.institucion_id || ""}
                  onChange={(e) => setForm({ ...form, institucion_id: Number(e.target.value) })}
                  required className={inputCls}
                >
                  <option value="">Seleccionar institución</option>
                  {instituciones.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                </select>
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
