"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, ClipboardList, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Inscripcion, Torneo, Deporte, ClubEquipo, EstadoInscripcion, InscripcionCreate } from "@/types/api";

const ESTADO_BADGE: Record<EstadoInscripcion, string> = {
  pendiente: "bg-amber-50 text-amber-700",
  aprobado:  "bg-green-50 text-green-700",
  rechazado: "bg-red-50 text-red-600",
  retirado:  "bg-gray-100 text-gray-500",
};

const ESTADO_LABEL: Record<EstadoInscripcion, string> = {
  pendiente: "Pendiente",
  aprobado:  "Aprobado",
  rechazado: "Rechazado",
  retirado:  "Retirado",
};

export default function InstitucionInscripcionesPage() {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [torneos, setTorneos]             = useState<Torneo[]>([]);
  const [deportes, setDeportes]           = useState<Deporte[]>([]);
  const [misEquipos, setMisEquipos]       = useState<ClubEquipo[]>([]);
  const [cargando, setCargando]           = useState(true);
  const [showModal, setShowModal]         = useState(false);
  const [error, setError]                 = useState("");
  const [form, setForm]                   = useState<InscripcionCreate>({ torneo_id: 0, club_equipo_id: 0 });

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [me, insc, torn, dep, equipos] = await Promise.all([
        api.me(),
        api.getInscripciones(),
        api.getTorneos(),
        api.getDeportes(),
        api.getEquipos(),
      ]);

      // Solo equipos de mi institución
      const propios = equipos.filter(e => e.institucion_id === me.institucion_id && e.estado === "aprobado");
      const propiosIds = new Set(propios.map(e => e.id));

      // Solo inscripciones de mis equipos
      const misInsc = insc.filter(i => propiosIds.has(i.club_equipo_id));

      setInscripciones(misInsc);
      setTorneos(torn);
      setDeportes(dep);
      setMisEquipos(propios);
    } catch {
      setError("No se pudo cargar la información.");
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

  const torneosActivos = torneos.filter(t => t.estado === "inscripcion_abierta");
  const inscripcionesYa = new Set(inscripciones.map(i => `${i.torneo_id}-${i.club_equipo_id}`));

  function nombreDeporte(id: number) {
    return deportes.find(d => d.id === id)?.nombre ?? "—";
  }

  // Equipos disponibles para el torneo seleccionado (no ya inscritos)
  const equiposDisponibles = misEquipos.filter(
    e => !inscripcionesYa.has(`${form.torneo_id}-${e.id}`)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Portal institucional</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Inscripciones</h1>
          <p className="text-sm text-gray-400 mt-0.5">Inscribe tus equipos en los torneos disponibles.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cargar}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <button
            onClick={() => { setShowModal(true); setError(""); }}
            disabled={torneosActivos.length === 0 || misEquipos.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Nueva inscripción
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {!cargando && misEquipos.length === 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Tu institución no tiene equipos aprobados aún. Contacta al administrador.
        </div>
      )}

      {torneosActivos.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Torneos disponibles</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {torneosActivos.map(t => (
              <div key={t.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{nombreDeporte(t.deporte_id)} · {t.temporada}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-green-50 text-green-700 rounded-full shrink-0 ml-2">
                    Abierto
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Mis inscripciones</h2>
          <span className="text-xs text-gray-400">{inscripciones.length} total</span>
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
              {inscripciones.map(insc => (
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

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Inscribir equipo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Torneo</label>
                <select
                  value={form.torneo_id || ""}
                  onChange={e => { setForm(f => ({ ...f, torneo_id: Number(e.target.value), club_equipo_id: 0 })); setError(""); }}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Seleccionar torneo</option>
                  {torneosActivos.map(t => <option key={t.id} value={t.id}>{t.nombre} — {t.temporada}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Equipo</label>
                <select
                  value={form.club_equipo_id || ""}
                  onChange={e => { setForm(f => ({ ...f, club_equipo_id: Number(e.target.value) })); setError(""); }}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={!form.torneo_id}
                >
                  <option value="">{form.torneo_id ? "Seleccionar equipo" : "Primero selecciona un torneo"}</option>
                  {equiposDisponibles.map(e => <option key={e.id} value={e.id}>{e.nombre_equipo}</option>)}
                </select>
                {form.torneo_id > 0 && equiposDisponibles.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">Todos tus equipos ya están inscritos en este torneo.</p>
                )}
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                Cancelar
              </button>
              <button
                onClick={inscribir}
                disabled={!form.torneo_id || !form.club_equipo_id || equiposDisponibles.length === 0}
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
