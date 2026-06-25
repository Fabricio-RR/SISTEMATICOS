"use client";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Trash2, Users, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";

export default function AdminInscripciones() {
  const [torneos, setTorneos] = useState<any[]>([]);
  const [torneoId, setTorneoId] = useState<number | null>(null);
  const [inscripciones, setInscripciones] = useState<any[]>([]);
  const [atletas, setAtletas] = useState<Record<number, any[]>>({});
  const [expandido, setExpandido] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.getTorneos().then(setTorneos).catch(() => {});
  }, []);

  useEffect(() => {
    if (!torneoId) return;
    setLoading(true);
    api.getInscripcionesByTorneo(torneoId)
      .then(setInscripciones)
      .finally(() => setLoading(false));
  }, [torneoId]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const aprobar = async (id: number) => {
    await api.aprobarInscripcion(id);
    setInscripciones(prev => prev.map(i => i.id === id ? { ...i, estado: "aprobado" } : i));
    flash("Inscripción aprobada");
  };

  const rechazar = async (id: number) => {
    await api.rechazarInscripcion(id);
    setInscripciones(prev => prev.map(i => i.id === id ? { ...i, estado: "rechazado" } : i));
    flash("Inscripción rechazada");
  };

  const eliminar = async (id: number) => {
    if (!confirm("¿Eliminar esta inscripción?")) return;
    await api.eliminarInscripcion(id);
    setInscripciones(prev => prev.filter(i => i.id !== id));
    flash("Inscripción eliminada");
  };

  const toggleAtletas = async (insc: any) => {
    const abierto = expandido[insc.id];
    setExpandido(prev => ({ ...prev, [insc.id]: !abierto }));
    if (!abierto && !atletas[insc.club_equipo_id]) {
      const data = await api.getAtletasByEquipo(insc.club_equipo_id);
      setAtletas(prev => ({ ...prev, [insc.club_equipo_id]: data }));
    }
  };

  const estadoBadge = (estado: string) => {
    if (estado === "aprobado") return "bg-green-100 text-green-700";
    if (estado === "rechazado") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Panel de Control</p>
        <h1 className="text-4xl font-black text-gray-900 mt-1">
          Gestión de <span className="text-red-600">Inscripciones</span>
        </h1>
      </div>

      {msg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm font-semibold">
          {msg}
        </div>
      )}

      {/* Selector de torneo */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Seleccionar Torneo
        </label>
        <select
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          value={torneoId ?? ""}
          onChange={e => setTorneoId(Number(e.target.value) || null)}
        >
          <option value="">— Elige un torneo —</option>
          {torneos.map(t => (
            <option key={t.id} value={t.id}>{t.nombre} ({t.temporada})</option>
          ))}
        </select>
      </div>

      {/* Tabla de inscripciones */}
      {loading && <p className="text-gray-400 text-sm">Cargando...</p>}

      {!loading && torneoId && inscripciones.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 shadow-sm">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No hay inscripciones para este torneo</p>
        </div>
      )}

      {inscripciones.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-black text-gray-900">Equipos inscritos</h2>
            <span className="text-xs text-gray-400">{inscripciones.length} equipos</span>
          </div>
          <div>
            {inscripciones.map(insc => (
              <div key={insc.id} className="border-b border-gray-50 last:border-0">
                <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-black text-gray-500 text-xs">
                      {insc.nombre_equipo?.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{insc.nombre_equipo}</p>
                      <p className="text-xs text-gray-400">{insc.nombre_institucion} · {insc.nombre_deporte}</p>
                      {insc.pais_asignado && (
                        <p className="text-xs text-gray-400 mt-0.5">{insc.pais_emoji} {insc.pais_asignado}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${estadoBadge(insc.estado)}`}>
                      {insc.estado}
                    </span>
                    {insc.estado !== "aprobado" && (
                      <button
                        onClick={() => aprobar(insc.id)}
                        className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600"
                        title="Aprobar"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {insc.estado !== "rechazado" && (
                      <button
                        onClick={() => rechazar(insc.id)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                        title="Rechazar"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => eliminar(insc.id)}
                      className="p-1.5 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleAtletas(insc)}
                      className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500"
                      title="Ver jugadores"
                    >
                      {expandido[insc.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Lista de atletas */}
                {expandido[insc.id] && (
                  <div className="px-6 pb-4 bg-gray-50/50">
                    {(atletas[insc.club_equipo_id] ?? []).length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">Sin jugadores registrados</p>
                    ) : (
                      <table className="w-full text-xs mt-2">
                        <thead>
                          <tr className="text-gray-400 uppercase tracking-wider">
                            <th className="text-left py-1 pr-4">#</th>
                            <th className="text-left py-1 pr-4">Nombre</th>
                            <th className="text-left py-1 pr-4">DNI</th>
                            <th className="text-left py-1">Rol</th>
                          </tr>
                        </thead>
                        <tbody>
                          {atletas[insc.club_equipo_id].map((a: any, i: number) => (
                            <tr key={a.id} className="border-t border-gray-100">
                              <td className="py-1 pr-4 text-gray-400">{a.numero_camiseta ?? i + 1}</td>
                              <td className="py-1 pr-4 font-medium text-gray-800">{a.nombre_completo}</td>
                              <td className="py-1 pr-4 text-gray-500">{a.documento_identidad}</td>
                              <td className="py-1 text-gray-500">{a.posicion_rol}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
