"use client";
import { useEffect, useState } from "react";
import { Trophy, Plus, Trash2, Search, AlertCircle, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import type { Deporte, TipoCompetidor } from "@/types/api";

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition";

export default function DeportesPage() {
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", tipo_competidor: "equipo" as TipoCompetidor });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [eliminando, setEliminando]   = useState<number | null>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    setError("");
    try { setDeportes(await api.getDeportes()); }
    catch { setError("No se pudo cargar los deportes."); }
    finally { setCargando(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (form.nombre.length > 100) {
      setErrorForm("El nombre del deporte no puede tener más de 100 caracteres.");
      return;
    }
    setGuardando(true);
    setErrorForm("");
    try {
      await api.createDeporte(form);
      setModal(false);
      setForm({ nombre: "", tipo_competidor: "equipo" });
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "Error al guardar");
    } finally { setGuardando(false); }
  }

  async function handleDelete(id: number) {
    setEliminando(id);
    setError("");
    try { await api.deleteDeporte(id); await cargar(); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo eliminar el deporte."); }
    finally { setEliminando(null); }
  }

  const filtrados = deportes.filter((d) =>
    d.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Deportes</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestión de disciplinas deportivas del torneo.</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo deporte
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
          placeholder="Buscar deporte..."
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
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Deporte</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tipo</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Categoría</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cargando ? (
              <tr><td colSpan={6} className="text-center py-14 text-sm text-gray-400">Cargando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-14 text-sm text-gray-400">
                {busqueda ? "Sin resultados" : "No hay deportes registrados"}
              </td></tr>
            ) : filtrados.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-400 font-mono">{String(d.id).padStart(2, "0")}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${d.es_obligatorio ? "bg-amber-50" : "bg-red-50"}`}>
                      <Trophy className={`w-4 h-4 ${d.es_obligatorio ? "text-amber-600" : "text-red-600"}`} />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{d.nombre}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                    {d.tipo_competidor === "equipo" ? "Equipos" : "Individual"}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {d.es_obligatorio ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                      <ShieldCheck className="w-3 h-3" />
                      Obligatorio
                    </span>
                  ) : (
                    <span className="inline-flex text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                      Adicional
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${
                    d.esta_activo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {d.esta_activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {!d.es_obligatorio && (
                    <button
                      onClick={() => handleDelete(d.id)}
                      disabled={eliminando === d.id}
                      className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
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
                <Trophy className="w-4 h-4 text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Nuevo deporte</h2>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nombre</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  maxLength={100}
                  required placeholder="Ej. Fútbol, Vóley, Atletismo"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tipo de competidor</label>
                <select
                  value={form.tipo_competidor}
                  onChange={(e) => setForm({ ...form, tipo_competidor: e.target.value as TipoCompetidor })}
                  className={inputCls}
                >
                  <option value="equipo">Equipos</option>
                  <option value="individual">Individual</option>
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
