"use client";
import { useEffect, useState } from "react";
import { Building2, Plus, Trash2, Search } from "lucide-react";
import { api } from "@/lib/api";

interface Institucion {
  id: number;
  nombre: string;
  nombre_corto: string;
  ciudad: string;
  estado: string;
}

export default function InstitucionesPage() {
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({ nombre: "", nombre_corto: "", ciudad: "", estado: "activo" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    try {
      const data = await api.getInstituciones();
      setInstituciones(data);
    } catch {}
    setCargando(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError("");
    try {
      await api.createInstitucion(form);
      setModalAbierto(false);
      setForm({ nombre: "", nombre_corto: "", ciudad: "", estado: "activo" });
      cargar();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta institución?")) return;
    try {
      await api.deleteInstitucion(id);
      cargar();
    } catch {}
  }

  const filtradas = instituciones.filter(
    (i) => i.nombre.toLowerCase().includes(busqueda.toLowerCase()) || i.ciudad.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Portal Administrativo</p>
          <h1 className="text-4xl font-black text-gray-900 mt-1">Instituciones</h1>
          <p className="text-sm text-gray-400 mt-1">Gestión de colegios, universidades y clubes deportivos.</p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-md shadow-red-100"
        >
          <Plus className="w-4 h-4" /> Nueva Institución
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o ciudad..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full max-w-sm border border-gray-200 rounded-xl pl-11 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <th className="text-left px-6 py-4">#</th>
              <th className="text-left px-6 py-4">Institución</th>
              <th className="text-left px-6 py-4">Ciudad</th>
              <th className="text-center px-6 py-4">Estado</th>
              <th className="text-center px-6 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cargando ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">Cargando...</td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">No hay instituciones registradas</td></tr>
            ) : filtradas.map((inst) => (
              <tr key={inst.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-gray-400 text-sm font-mono">{String(inst.id).padStart(2, "0")}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                      <span className="text-red-600 text-xs font-black">{inst.nombre_corto.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{inst.nombre}</p>
                      <p className="text-xs text-gray-400">{inst.nombre_corto}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{inst.ciudad}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${inst.estado === "activo" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                    {inst.estado}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => handleDelete(inst.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-black text-gray-900">Nueva Institución</h2>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre completo</label>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Ej. Universidad de Lima" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre corto</label>
                <input value={form.nombre_corto} onChange={(e) => setForm({ ...form, nombre_corto: e.target.value })} required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Ej. UL" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ciudad</label>
                <input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Ej. Lima" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-200">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAbierto(false)}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-3 rounded-xl text-sm transition">
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