"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Calendar, RefreshCw, Filter, Clock,
  CheckCircle2, PlayCircle, AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Partido, Torneo, EstadoPartido, PartidoUpdate, Sede } from "@/types/api";

const ESTADO_LABEL: Record<EstadoPartido, string> = {
  programado: "Programado",
  en_curso: "En curso",
  finalizado: "Finalizado",
};

const ESTADO_BADGE: Record<EstadoPartido, string> = {
  programado: "bg-blue-50 text-blue-700",
  en_curso: "bg-amber-50 text-amber-700",
  finalizado: "bg-green-50 text-green-700",
};

const ESTADO_ICON: Record<EstadoPartido, React.ReactNode> = {
  programado: <Clock className="w-3 h-3" />,
  en_curso: <PlayCircle className="w-3 h-3" />,
  finalizado: <CheckCircle2 className="w-3 h-3" />,
};

type EditModal = { partido: Partido; form: PartidoUpdate };

export default function EncuentrosPage() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [torneoFiltro, setTorneoFiltro] = useState<number | undefined>();
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoPartido | "">("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [editModal, setEditModal] = useState<EditModal | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [p, t, s] = await Promise.all([
        api.getPartidos({ torneo_id: torneoFiltro, estado: estadoFiltro || undefined }),
        api.getTorneos(),
        api.getSedes(),
      ]);
      setPartidos(p);
      setTorneos(t);
      setSedes(s);
    } catch {
      setError("No se pudo cargar los encuentros.");
    } finally {
      setCargando(false);
    }
  }, [torneoFiltro, estadoFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardarEdicion() {
    if (!editModal) return;
    setGuardando(true);
    try {
      await api.updatePartido(editModal.partido.id, editModal.form);
      setEditModal(null);
      await cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Encuentros</h1>
          <p className="text-sm text-gray-400 mt-0.5">Programación y seguimiento de partidos.</p>
        </div>
        <button
          onClick={cargar}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={torneoFiltro ?? ""}
            onChange={(e) => setTorneoFiltro(e.target.value ? Number(e.target.value) : undefined)}
            className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Todos los torneos</option>
            {torneos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
        <select
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value as EstadoPartido | "")}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">Todos los estados</option>
          {(["programado", "en_curso", "finalizado"] as EstadoPartido[]).map((e) => (
            <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        {cargando ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Cargando...</div>
        ) : partidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-300">
            <Calendar className="w-8 h-8 mb-2" strokeWidth={1.5} />
            <p className="text-sm text-gray-400">Sin partidos para los filtros seleccionados</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Torneo / Jornada</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Partido</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Editar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {partidos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-900">{p.torneo_nombre}</p>
                    <p className="text-xs text-gray-400">Jornada {p.jornada}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-gray-900">{p.local_nombre}</span>
                      <span className="text-gray-300">vs</span>
                      <span className="font-semibold text-gray-900">{p.visitante_nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-500">
                    {p.fecha_hora
                      ? new Date(p.fecha_hora).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })
                      : "—"}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_BADGE[p.estado]}`}>
                      {ESTADO_ICON[p.estado]}
                      {ESTADO_LABEL[p.estado]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() =>
                        setEditModal({
                          partido: p,
                          form: { sede_id: p.sede_id ?? undefined, fecha_hora: p.fecha_hora ?? undefined, estado: p.estado },
                        })
                      }
                      className="text-xs font-semibold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal edición */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Editar partido</h2>
            <p className="text-sm text-gray-500 mb-5">
              {editModal.partido.local_nombre} vs {editModal.partido.visitante_nombre}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Fecha y hora</label>
                <input
                  type="datetime-local"
                  value={editModal.form.fecha_hora ? editModal.form.fecha_hora.slice(0, 16) : ""}
                  onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, fecha_hora: e.target.value } } : null)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sede</label>
                <select
                  value={editModal.form.sede_id ?? ""}
                  onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, sede_id: e.target.value ? Number(e.target.value) : undefined } } : null)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Sin sede asignada</option>
                  {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre_sede}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Estado</label>
                <select
                  value={editModal.form.estado ?? "programado"}
                  onChange={(e) => setEditModal((m) => m ? { ...m, form: { ...m.form, estado: e.target.value as EstadoPartido } } : null)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {(["programado", "en_curso", "finalizado"] as EstadoPartido[]).map((e) => (
                    <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicion}
                disabled={guardando}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
