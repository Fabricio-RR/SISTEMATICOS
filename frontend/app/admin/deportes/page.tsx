"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Dumbbell, X, Check, Users } from "lucide-react";
import { api } from "@/lib/api";

interface Deporte {
  id: number; nombre: string; tipo_competidor: string;
  min_jugadores: number; max_jugadores: number; esta_activo: boolean;
  tipo_estadistica: string;
}

const EMPTY_FORM = {
  nombre: "", tipo_competidor: "equipo",
  min_jugadores: "5", max_jugadores: "12", esta_activo: true,
  tipo_estadistica: "otro",
};


export default function AdminDeportes() {
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState({ texto: "", tipo: "ok" });
  const [loading, setLoading] = useState(false);

  const flash = (texto: string, tipo = "ok") => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg({ texto: "", tipo: "ok" }), 4000);
  };

  const cargar = () =>
    api.getDeportesAdmin().then(setDeportes).catch(() => api.getDeportes().then(setDeportes));

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  };

  const abrirEditar = (d: Deporte) => {
    setForm({
      nombre: d.nombre, tipo_competidor: d.tipo_competidor,
      min_jugadores: String(d.min_jugadores), max_jugadores: String(d.max_jugadores),
      esta_activo: d.esta_activo,
      tipo_estadistica: d.tipo_estadistica ?? "otro",
    });
    setEditId(d.id);
    setShowForm(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { flash("Ingresa el nombre del deporte", "err"); return; }
    const min = Number(form.min_jugadores);
    const max = Number(form.max_jugadores);
    if (min < 1) { flash("El mínimo debe ser al menos 1", "err"); return; }
    if (max < min) { flash("El máximo no puede ser menor que el mínimo", "err"); return; }

    setLoading(true);
    try {
      const payload = {
        nombre: form.nombre, tipo_competidor: form.tipo_competidor,
        min_jugadores: min, max_jugadores: max, esta_activo: form.esta_activo,
        tipo_estadistica: form.tipo_estadistica,
      };
      if (editId) {
        await api.updateDeporte(editId, payload);
        flash("Deporte actualizado");
      } else {
        await api.createDeporte(payload);
        flash("Deporte creado");
      }
      setShowForm(false);
      cargar();
    } catch (e: any) {
      flash(e.message ?? "Error al guardar", "err");
    } finally {
      setLoading(false);
    }
  };

  const eliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Desactivar el deporte "${nombre}"?`)) return;
    try {
      await api.deleteDeporte(id);
      flash("Deporte desactivado");
      cargar();
    } catch (e: any) {
      flash(e.message ?? "Error", "err");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Panel de Control</p>
          <h1 className="text-4xl font-black text-gray-900 mt-1">
            Gestión de <span className="text-red-600">Deportes</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">Define los deportes y los límites de jugadores por equipo</p>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo Deporte
        </button>
      </div>

      {msg.texto && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${msg.tipo === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.texto}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-black text-gray-900 text-lg flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-red-600" />
                {editId ? "Editar Deporte" : "Nuevo Deporte"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre *</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej: Fútbol Varones, Básquet Mixto..."
                  value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo de competidor</label>
                  <select
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={form.tipo_competidor}
                    onChange={e => {
                      const tipo = e.target.value;
                      setForm(p => ({
                        ...p, tipo_competidor: tipo,
                        min_jugadores: tipo === "individual" ? "1" : p.min_jugadores,
                        max_jugadores: tipo === "individual" ? "3" : p.max_jugadores,
                      }));
                    }}
                  >
                    <option value="equipo">Equipo</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estadísticas</label>
                  <select
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={form.tipo_estadistica}
                    onChange={e => setForm(p => ({ ...p, tipo_estadistica: e.target.value }))}
                  >
                    <option value="futbol">⚽ Fútbol (goleadores)</option>
                    <option value="basket">🏀 Básquet (faltas)</option>
                    <option value="voley">🏐 Vóley</option>
                    <option value="otro">— Otro</option>
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Límite de jugadores por equipo</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Mínimo *</label>
                    <input
                      type="number" min={1} max={50}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      value={form.min_jugadores}
                      onChange={e => setForm(p => ({ ...p, min_jugadores: e.target.value }))}
                      disabled={form.tipo_competidor === "individual"}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Máximo *</label>
                    <input
                      type="number" min={1} max={50}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      value={form.max_jugadores}
                      onChange={e => setForm(p => ({ ...p, max_jugadores: e.target.value }))}
                      disabled={form.tipo_competidor === "individual"}
                    />
                  </div>
                </div>
                {form.tipo_competidor === "equipo" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-xs text-gray-400 w-full">Sugerencias rápidas:</span>
                    {[
                      { label: "Fútbol (11-18)", min: 11, max: 18 },
                      { label: "Básquet (5-12)", min: 5, max: 12 },
                      { label: "Vóley (6-12)", min: 6, max: 12 },
                      { label: "Ping Pong (2-4)", min: 2, max: 4 },
                    ].map(s => (
                      <button
                        key={s.label} type="button"
                        onClick={() => setForm(p => ({ ...p, min_jugadores: String(s.min), max_jugadores: String(s.max) }))}
                        className="text-xs px-2 py-1 bg-white border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-600 transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
                {form.tipo_competidor === "individual" && (
                  <p className="text-xs text-gray-400 mt-2">Deporte individual: 1 participante por inscripción (+ hasta 2 alternos)</p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium">Cancelar</button>
              <button
                onClick={guardar} disabled={loading}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-5 py-2 rounded-lg font-bold text-sm transition-colors"
              >
                <Check className="w-4 h-4" /> {loading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="grid grid-cols-1 gap-3">
        {deportes.map(d => (
          <div key={d.id} className={`bg-white rounded-2xl border p-5 shadow-sm flex items-center justify-between transition-all ${d.esta_activo ? "border-gray-100 hover:shadow-md" : "border-gray-100 opacity-50"}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${d.esta_activo ? "bg-red-50" : "bg-gray-100"}`}>
                <Dumbbell className={`w-5 h-5 ${d.esta_activo ? "text-red-600" : "text-gray-400"}`} />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{d.nombre}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {d.tipo_competidor === "equipo" ? "Equipo" : "Individual"} ·{" "}
                  <span className="font-medium text-gray-600">
                    {d.min_jugadores}–{d.max_jugadores} jugadores
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${d.esta_activo ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-500"}`}>
                {d.esta_activo ? "Activo" : "Inactivo"}
              </span>
              <button onClick={() => abrirEditar(d)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => eliminar(d.id, d.nombre)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
