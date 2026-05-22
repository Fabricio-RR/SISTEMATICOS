"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, ClipboardList, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Inscripcion, Torneo, Deporte, ClubEquipo, EstadoInscripcion, InscripcionCreate } from "@/types/api";

const ESTADO_BADGE: Record<EstadoInscripcion, string> = {
  pendiente: "bg-amber-50 text-amber-700",
  aprobado: "bg-green-50 text-green-700",
  rechazado: "bg-red-50 text-red-600",
};

const ESTADO_LABEL: Record<EstadoInscripcion, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export default function InstitucionInscripcionesPage() {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [equipos, setEquipos] = useState<ClubEquipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<InscripcionCreate>({ torneo_id: 0, club_equipo_id: 0 });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [insc, torn, dep, eq] = await Promise.all([
        api.getInscripciones(),
        api.getTorneos(),
        api.getDeportes(),
        api.getEquipos(),
      ]);
      setInscripciones(insc);
      setTorneos(torn);
      setDeportes(dep);
      setEquipos(eq);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function inscribir() {
    if (!form.torneo_id || !form.club_equipo_id) return;
    setError("");
    try {
      await api.createInscripcion(form);
      setShowModal(false);
      setForm({ torneo_id: 0, club_equipo_id: 0 });
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al inscribir");
    }
  }

  const torneosActivos = torneos.filter((t) => t.estado === "activo");
  const inscripcionesYa = new Set(inscripciones.map((i) => `${i.torneo_id}-${i.club_equipo_id}`));

  function yaInscrito(torneoId: number, equipoId: number) {
    return inscripcionesYa.has(`${torneoId}-${equipoId}`);
  }

  function nombreDeporte(id: number) {
    return deportes.find((d) => d.id === id)?.nombre ?? "—";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Portal institucional</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Inscripciones</h1>
          <p className="text-sm text-gray-400 mt-0.5">Inscribe tus equipos en los torneos disponibles.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargar}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <button
            onClick={() => { setShowModal(true); setError(""); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Nueva inscripción
          </button>
        </div>
      </div>

      {/* Torneos activos */}
      {torneosActivos.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Torneos disponibles</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {torneosActivos.map((t) => (
              <div key={t.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{nombreDeporte(t.deporte_id)} · {t.temporada}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-green-50 text-green-700 rounded-full shrink-0 ml-2">
                    {t.formato}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de inscripciones */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Mis inscripciones</h2>
        </div>
        {cargando ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Cargando...</div>
        ) : inscripciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-300">
            <ClipboardList className="w-8 h-8 mb-2" strokeWidth={1.5} />
            <p className="text-sm text-gray-400">Sin inscripciones aún</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Equipo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Torneo</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inscripciones.map((insc) => (
                <tr key={insc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {insc.club_equipo?.nombre_equipo ?? `Equipo #${insc.club_equipo_id}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {insc.torneo?.nombre ?? `Torneo #${insc.torneo_id}`}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_BADGE[insc.estado]}`}>
                      {ESTADO_LABEL[insc.estado]}
                    </span>
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
            <h2 className="text-lg font-bold text-gray-900 mb-5">Inscribir equipo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Torneo</label>
                <select
                  value={form.torneo_id || ""}
                  onChange={(e) => { setForm((f) => ({ ...f, torneo_id: Number(e.target.value) })); setError(""); }}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Seleccionar torneo</option>
                  {torneosActivos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Equipo</label>
                <select
                  value={form.club_equipo_id || ""}
                  onChange={(e) => { setForm((f) => ({ ...f, club_equipo_id: Number(e.target.value) })); setError(""); }}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Seleccionar equipo</option>
                  {equipos.map((e) => (
                    <option key={e.id} value={e.id} disabled={yaInscrito(form.torneo_id, e.id)}>
                      {e.nombre_equipo}{yaInscrito(form.torneo_id, e.id) ? " (ya inscrito)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
              <button
                onClick={inscribir}
                disabled={!form.torneo_id || !form.club_equipo_id}
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
