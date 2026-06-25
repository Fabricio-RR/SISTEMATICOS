"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Trophy, X, Check } from "lucide-react";
import { api } from "@/lib/api";

interface Deporte { id: number; nombre: string; }
interface Torneo {
  id: number; nombre: string; temporada: string; estado: string;
  deporte_id: number; formato: string;
  fecha_inicio?: string; fecha_fin?: string; descripcion?: string;
}

const EMPTY_FORM = {
  nombre: "", deporte_id: "", temporada: new Date().getFullYear().toString(),
  formato: "grupos", estado: "activo",
  fecha_inicio: "", fecha_fin: "", descripcion: "",
};

export default function AdminTorneos() {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
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
    Promise.all([api.getTorneos(), api.getDeportes()])
      .then(([t, d]) => { setTorneos(t); setDeportes(d); })
      .catch(() => {});

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  };

  const abrirEditar = (t: Torneo) => {
    setForm({
      nombre: t.nombre, deporte_id: String(t.deporte_id),
      temporada: t.temporada, formato: t.formato, estado: t.estado,
      fecha_inicio: t.fecha_inicio ?? "", fecha_fin: t.fecha_fin ?? "",
      descripcion: t.descripcion ?? "",
    });
    setEditId(t.id);
    setShowForm(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim() || !form.deporte_id || !form.temporada.trim()) {
      flash("Completa nombre, deporte y temporada", "err"); return;
    }
    setLoading(true);
    try {
      const payload = {
        nombre: form.nombre, deporte_id: Number(form.deporte_id),
        temporada: form.temporada, formato: form.formato, estado: form.estado,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
        descripcion: form.descripcion || null,
      };
      if (editId) {
        await api.updateTorneo(editId, payload);
        flash("Torneo actualizado");
      } else {
        await api.createTorneo(payload);
        flash("Torneo creado");
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
    if (!confirm(`¿Eliminar el torneo "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteTorneo(id);
      flash("Torneo eliminado");
      cargar();
    } catch (e: any) {
      flash(e.message ?? "Error al eliminar", "err");
    }
  };

  const deporteNombre = (id: number) => deportes.find(d => d.id === id)?.nombre ?? "—";

  const estadoColor: Record<string, string> = {
    activo: "bg-green-50 text-green-700 border border-green-200",
    inscripciones: "bg-blue-50 text-blue-700 border border-blue-200",
    en_sorteo: "bg-purple-50 text-purple-700 border border-purple-200",
    en_curso: "bg-orange-50 text-orange-700 border border-orange-200",
    finalizado: "bg-gray-100 text-gray-600 border border-gray-200",
    suspendido: "bg-red-50 text-red-700 border border-red-200",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Panel de Control</p>
          <h1 className="text-4xl font-black text-gray-900 mt-1">
            Gestión de <span className="text-red-600">Torneos</span>
          </h1>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo Torneo
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-black text-gray-900 text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-red-600" />
                {editId ? "Editar Torneo" : "Nuevo Torneo"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre del torneo *</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej: Olimpiadas PERÚ 2026 — Fútbol Varones"
                  value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Deporte *</label>
                  <select
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={form.deporte_id} onChange={e => setForm(p => ({ ...p, deporte_id: e.target.value }))}
                    disabled={!!editId}
                  >
                    <option value="">— Selecciona —</option>
                    {deportes.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Temporada *</label>
                  <input
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="2026"
                    value={form.temporada} onChange={e => setForm(p => ({ ...p, temporada: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha inicio</label>
                  <input
                    type="date"
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={form.fecha_inicio} onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha fin</label>
                  <input
                    type="date"
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={form.fecha_fin} onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Formato</label>
                  <select
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={form.formato} onChange={e => setForm(p => ({ ...p, formato: e.target.value }))}
                  >
                    <option value="grupos">Fase de grupos + eliminación</option>
                    <option value="liga">Liga (todos vs todos)</option>
                    <option value="eliminacion_simple">Eliminación directa</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</label>
                  <select
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                  >
                    <option value="activo">Activo</option>
                    <option value="finalizado">Finalizado</option>
                    <option value="suspendido">Suspendido</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Descripción</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  placeholder="Descripción opcional del torneo..."
                  value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                />
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
      {torneos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <Trophy className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay torneos creados</p>
          <p className="text-xs text-gray-400 mt-1">Crea el primer torneo con el botón de arriba</p>
        </div>
      ) : (
        <div className="space-y-3">
          {torneos.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{t.nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {deporteNombre(t.deporte_id)} · Temporada {t.temporada}
                    {t.fecha_inicio && ` · ${t.fecha_inicio}`}
                    {t.fecha_fin && ` → ${t.fecha_fin}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${estadoColor[t.estado] ?? "bg-gray-100 text-gray-600"}`}>
                  {{ activo: "Activo", inscripciones: "Inscripciones", en_sorteo: "En Sorteo", en_curso: "En Curso", finalizado: "Finalizado", suspendido: "Suspendido" }[t.estado] ?? t.estado}
                </span>
                <button onClick={() => abrirEditar(t)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => eliminar(t.id, t.nombre)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
