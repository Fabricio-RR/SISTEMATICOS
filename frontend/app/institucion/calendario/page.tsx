"use client";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Clock } from "lucide-react";
import { api } from "@/lib/api";

export default function InstitucionCalendario() {
  const [partidos, setPartidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | "proximos" | "finalizados">("todos");

  useEffect(() => {
    api.getMisPartidos()
      .then(setPartidos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ahora = new Date();

  const partidosFiltrados = partidos.filter(p => {
    if (filtro === "finalizados") return p.estado === "finalizado";
    if (filtro === "proximos") {
      if (p.estado === "finalizado") return false;
      if (p.estado === "en_curso") return true;
      if (!p.fecha_hora) return true; // sin programar aún
      return new Date(p.fecha_hora) >= ahora;
    }
    return true;
  }).sort((a, b) => {
    if (!a.fecha_hora && !b.fecha_hora) return 0;
    if (!a.fecha_hora) return 1;
    if (!b.fecha_hora) return -1;
    return new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime();
  });

  const formatFecha = (iso: string) => {
    const d = new Date(iso);
    return {
      dia: d.toLocaleDateString("es-PE", { weekday: "long", day: "2-digit", month: "long" }),
      hora: d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const estadoBadge = (estado: string) => {
    if (estado === "finalizado") return "bg-green-100 text-green-700";
    if (estado === "en_curso") return "bg-blue-100 text-blue-700 animate-pulse";
    return "bg-gray-100 text-gray-500";
  };

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Portal Institucional</p>
        <h1 className="text-4xl font-black text-gray-900 mt-1">
          Calendario de <span className="text-red-600">Eventos</span>
        </h1>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {(["todos", "proximos", "finalizados"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              filtro === f ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {f === "todos" ? "Todos" : f === "proximos" ? "Próximos" : "Finalizados"}
          </button>
        ))}
      </div>

      {loading && <p className="text-gray-400 text-sm">Cargando...</p>}

      {!loading && partidos.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 shadow-sm">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No hay partidos programados aún</p>
          <p className="text-sm mt-1">Los partidos aparecerán aquí cuando el administrador los programe</p>
        </div>
      )}

      <div className="space-y-4">
        {partidosFiltrados.map(p => {
          const fecha = p.fecha_hora ? formatFecha(p.fecha_hora) : null;
          const esHoy = p.fecha_hora && new Date(p.fecha_hora).toDateString() === ahora.toDateString();

          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                esHoy && p.estado !== "finalizado" ? "border-red-200" : "border-gray-100"
              }`}
            >
              {esHoy && p.estado !== "finalizado" && (
                <div className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  HOY
                </div>
              )}
              <div className="px-6 py-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase">{p.ronda}</span>
                    {fecha && (
                      <p className="text-sm font-semibold text-gray-700 mt-0.5 capitalize">
                        <Clock className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                        {fecha.dia} · {fecha.hora}
                      </p>
                    )}
                    {p.sede_nombre && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {p.sede_nombre}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${estadoBadge(p.estado)}`}>
                    {p.estado === "finalizado" ? "Finalizado" : p.estado === "en_curso" ? "En Curso" : "Programado"}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <div className="flex-1 text-center">
                    <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <span className="text-white font-black text-sm">
                        {p.local?.nombre?.slice(0, 2).toUpperCase() ?? "??"}
                      </span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{p.local?.nombre ?? "—"}</p>
                    {p.local?.pais && (
                      <p className="text-xs text-gray-400 mt-0.5">{p.local.pais_emoji} {p.local.pais}</p>
                    )}
                  </div>

                  <div className="text-center min-w-[80px]">
                    {p.resultado_local !== null && p.resultado_visitante !== null ? (
                      <p className="text-3xl font-black text-gray-900">
                        {p.resultado_local} – {p.resultado_visitante}
                      </p>
                    ) : (
                      <p className="text-2xl font-black text-gray-300">VS</p>
                    )}
                  </div>

                  <div className="flex-1 text-center">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <span className="text-white font-black text-sm">
                        {p.visitante?.nombre?.slice(0, 2).toUpperCase() ?? "??"}
                      </span>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{p.visitante?.nombre ?? "—"}</p>
                    {p.visitante?.pais && (
                      <p className="text-xs text-gray-400 mt-0.5">{p.visitante.pais_emoji} {p.visitante.pais}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
