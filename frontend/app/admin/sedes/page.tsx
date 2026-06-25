"use client";
import { useEffect, useState } from "react";
import { MapPin, Plus, Pencil, Trash2, X, Save } from "lucide-react";
import { api } from "@/lib/api";

const BLANK = { nombre_sede: "", ciudad: "", capacidad: "" };

export default function AdminSedes() {
  const [sedes, setSedes] = useState<any[]>([]);
  const [msg, setMsg] = useState({ texto: "", tipo: "ok" });

  // Crear
  const [modalCrear, setModalCrear] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [guardando, setGuardando] = useState(false);

  // Editar
  const [editando, setEditando] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ ...BLANK });
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  const flash = (texto: string, tipo = "ok") => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg({ texto: "", tipo: "ok" }), 3500);
  };

  const cargar = () => api.getSedes().then(setSedes).catch(() => {});

  useEffect(() => { cargar(); }, []);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre_sede.trim() || !form.ciudad.trim()) {
      flash("Nombre y ciudad son obligatorios", "err"); return;
    }
    setGuardando(true);
    try {
      await api.createSede({
        nombre_sede: form.nombre_sede.trim(),
        ciudad: form.ciudad.trim(),
        capacidad: form.capacidad ? Number(form.capacidad) : null,
      });
      flash("Sede creada correctamente");
      setModalCrear(false);
      setForm({ ...BLANK });
      await cargar();
    } catch (e: any) {
      flash(e.message, "err");
    } finally {
      setGuardando(false);
    }
  };

  const abrirEditar = (s: any) => {
    setEditando(s);
    setEditForm({
      nombre_sede: s.nombre_sede ?? "",
      ciudad: s.ciudad ?? "",
      capacidad: s.capacidad != null ? String(s.capacidad) : "",
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    if (!editForm.nombre_sede.trim() || !editForm.ciudad.trim()) {
      flash("Nombre y ciudad son obligatorios", "err"); return;
    }
    setGuardandoEdit(true);
    try {
      await api.updateSede(editando.id, {
        nombre_sede: editForm.nombre_sede.trim(),
        ciudad: editForm.ciudad.trim(),
        capacidad: editForm.capacidad ? Number(editForm.capacidad) : null,
      });
      flash("Sede actualizada");
      setEditando(null);
      await cargar();
    } catch (e: any) {
      flash(e.message, "err");
    } finally {
      setGuardandoEdit(false);
    }
  };

  const eliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar la sede "${nombre}"?`)) return;
    try {
      await api.deleteSede(id);
      flash("Sede eliminada");
      await cargar();
    } catch (e: any) {
      flash(e.message, "err");
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Panel de Control</p>
          <h1 className="text-4xl font-black text-gray-900 mt-1">
            Gestión de <span className="text-red-600">Sedes</span>
          </h1>
        </div>
        <button
          onClick={() => { setModalCrear(true); setForm({ ...BLANK }); }}
          className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-colors mt-2"
        >
          <Plus className="w-4 h-4" /> Nueva Sede
        </button>
      </div>

      {msg.texto && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold border ${
          msg.tipo === "err" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
        }`}>{msg.texto}</div>
      )}

      {/* Modal crear */}
      {modalCrear && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-gray-900 text-lg">Nueva Sede</h3>
              <button onClick={() => setModalCrear(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCrear} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nombre de la Sede *</label>
                <input
                  type="text" required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej. Estadio UTP Lima Centro"
                  value={form.nombre_sede}
                  onChange={e => setForm(f => ({ ...f, nombre_sede: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Ciudad *</label>
                <input
                  type="text" required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Lima"
                  value={form.ciudad}
                  onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Capacidad (opcional)</label>
                <input
                  type="number" min="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej. 500"
                  value={form.capacidad}
                  onChange={e => setForm(f => ({ ...f, capacidad: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={guardando}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  {guardando ? "Guardando..." : "Crear Sede"}
                </button>
                <button type="button" onClick={() => setModalCrear(false)}
                  className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-gray-900 text-lg">Editar Sede</h3>
              <button onClick={() => setEditando(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nombre de la Sede *</label>
                <input
                  type="text" required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editForm.nombre_sede}
                  onChange={e => setEditForm(f => ({ ...f, nombre_sede: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Ciudad *</label>
                <input
                  type="text" required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editForm.ciudad}
                  onChange={e => setEditForm(f => ({ ...f, ciudad: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Capacidad (opcional)</label>
                <input
                  type="number" min="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editForm.capacidad}
                  onChange={e => setEditForm(f => ({ ...f, capacidad: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={guardandoEdit}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50">
                  <Save className="w-4 h-4" />
                  {guardandoEdit ? "Guardando..." : "Guardar Cambios"}
                </button>
                <button type="button" onClick={() => setEditando(null)}
                  className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de sedes */}
      {sedes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 shadow-sm">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No hay sedes registradas</p>
          <p className="text-sm mt-1">Crea la primera sede con el botón "Nueva Sede"</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-black text-gray-900">Sedes registradas</h2>
            <span className="text-xs text-gray-400">{sedes.length} sede{sedes.length !== 1 ? "s" : ""}</span>
          </div>
          <div>
            {sedes.map((s, i) => (
              <div key={s.id} className={`px-6 py-4 flex items-center justify-between ${i < sedes.length - 1 ? "border-b border-gray-50" : ""} hover:bg-gray-50/50`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{s.nombre_sede}</p>
                    <p className="text-xs text-gray-400">{s.ciudad}{s.capacidad ? ` · ${s.capacidad.toLocaleString()} personas` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => abrirEditar(s)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => eliminar(s.id, s.nombre_sede)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
