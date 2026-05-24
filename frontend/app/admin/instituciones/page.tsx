"use client";
import { useEffect, useState } from "react";
import { Building2, Plus, Trash2, Search, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Institucion, CategoriaInstitucion } from "@/types/api";
import { CATEGORIAS, CATEGORIA_PAIS } from "@/types/api";

export default function InstitucionesPage() {
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({
    nombre: "", nombre_corto: "", ciudad: "", estado: "activo",
    contacto: "", categoria: "" as CategoriaInstitucion | "",
  });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [eliminando, setEliminando] = useState<number | null>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      setInstituciones(await api.getInstituciones());
    } catch {
      setError("No se pudo cargar las instituciones. Verifica que el backend esté activo.");
    } finally {
      setCargando(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (form.nombre.length > 200) {
      setErrorForm("El nombre no puede tener más de 200 caracteres.");
      return;
    }
    if (form.nombre_corto.length > 50) {
      setErrorForm("El nombre corto no puede tener más de 50 caracteres.");
      return;
    }
    if (form.ciudad.length > 100) {
      setErrorForm("La ciudad no puede tener más de 100 caracteres.");
      return;
    }
    if (form.contacto && form.contacto.length > 200) {
      setErrorForm("El contacto no puede tener más de 200 caracteres.");
      return;
    }
    setGuardando(true);
    setErrorForm("");
    try {
      await api.createInstitucion({ ...form, categoria: form.categoria || undefined });
      setModalAbierto(false);
      setForm({ nombre: "", nombre_corto: "", ciudad: "", estado: "activo", contacto: "", categoria: "" });
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function handleDelete(id: number) {
    setEliminando(id);
    setError("");
    try {
      await api.deleteInstitucion(id);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la institución.");
    } finally {
      setEliminando(null);
    }
  }

  const filtradas = instituciones.filter((i) =>
    i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    i.ciudad.toLowerCase().includes(busqueda.toLowerCase())
  );

  function iniciales(inst: Institucion) {
    const fuente = inst.nombre_corto || inst.nombre;
    return fuente.slice(0, 2).toUpperCase();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Instituciones</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestión de colegios, universidades y clubes deportivos.</p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva institución
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Búsqueda */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o ciudad..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Institución</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ciudad</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Categoría / País</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Contacto</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {cargando ? (
              <tr>
                <td colSpan={7} className="text-center py-14 text-sm text-gray-400">Cargando...</td>
              </tr>
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-14 text-sm text-gray-400">
                  {busqueda ? "Sin resultados para la búsqueda" : "No hay instituciones registradas"}
                </td>
              </tr>
            ) : (
              filtradas.map((inst) => (
                <tr key={inst.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-400 font-mono">{String(inst.id).padStart(2, "0")}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <span className="text-red-600 text-xs font-bold">{iniciales(inst)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{inst.nombre}</p>
                        <p className="text-xs text-gray-400">{inst.nombre_corto}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{inst.ciudad}</td>
                  <td className="px-6 py-4">
                    {inst.categoria ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900">{inst.categoria}</p>
                        <p className="text-xs text-gray-400">{inst.pais_representativo ?? "—"}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{inst.contacto ?? "—"}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${
                      inst.estado === "activo"
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {inst.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(inst.id)}
                      disabled={eliminando === inst.id}
                      className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Nueva institución</h2>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Nombre completo">
                <input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                  maxLength={200}
                  placeholder="Ej. Universidad de Lima"
                  className={inputCls}
                />
              </Field>
              <Field label="Nombre corto">
                <input
                  value={form.nombre_corto}
                  onChange={(e) => setForm({ ...form, nombre_corto: e.target.value })}
                  required
                  maxLength={50}
                  placeholder="Ej. UL"
                  className={inputCls}
                />
              </Field>
              <Field label="Ciudad">
                <input
                  value={form.ciudad}
                  onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                  required
                  maxLength={100}
                  placeholder="Ej. Lima"
                  className={inputCls}
                />
              </Field>
              <Field label="Contacto (teléfono o correo)">
                <input
                  value={form.contacto}
                  onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                  maxLength={200}
                  placeholder="Ej. 999-888-777"
                  className={inputCls}
                />
              </Field>
              <Field label="Categoría (año escolar)">
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaInstitucion | "" })}
                  className={inputCls}
                >
                  <option value="">Sin categoría</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{c} — {CATEGORIA_PAIS[c]}</option>
                  ))}
                </select>
                {form.categoria && (
                  <p className="mt-1 text-xs text-gray-400">
                    País asignado automáticamente: <span className="font-semibold">{CATEGORIA_PAIS[form.categoria as CategoriaInstitucion]}</span>
                  </p>
                )}
              </Field>
              {errorForm && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">{errorForm}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalAbierto(false); setErrorForm(""); }}
                  className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 rounded-lg text-sm transition"
                >
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

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
