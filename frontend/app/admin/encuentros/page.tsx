"use client";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Clock, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { api } from "@/lib/api";

const LABEL_EVENTO: Record<string, string> = {
  gol: "Gol",
  enceste: "Enceste",
  triple: "Triple",
  punto: "Punto",
  tarjeta_amarilla: "T. Amarilla",
  tarjeta_roja: "T. Roja",
  falta: "Falta",
};

const COLOR_EVENTO: Record<string, string> = {
  gol: "bg-green-100 text-green-700",
  enceste: "bg-green-100 text-green-700",
  triple: "bg-emerald-100 text-emerald-700",
  punto: "bg-green-100 text-green-700",
  tarjeta_amarilla: "bg-yellow-100 text-yellow-700",
  tarjeta_roja: "bg-red-100 text-red-700",
  falta: "bg-orange-100 text-orange-700",
};

export default function AdminEncuentros() {
  const [torneos, setTorneos] = useState<any[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [torneoId, setTorneoId] = useState<number | null>(null);
  const [partidos, setPartidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ texto: "", tipo: "ok" });

  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ fecha_hora: "", sede_id: "" });

  const [expandidoIds, setExpandidoIds] = useState<Set<number>>(new Set());
  const [eventosMap, setEventosMap] = useState<Record<number, any[]>>({});

  useEffect(() => {
    api.getTorneos().then(setTorneos).catch(() => {});
    api.getSedes().then(setSedes).catch(() => {});
  }, []);

  useEffect(() => {
    if (!torneoId) { setPartidos([]); return; }
    setLoading(true);
    api.getPartidosByTorneo(torneoId)
      .then(setPartidos)
      .finally(() => setLoading(false));
  }, [torneoId]);

  const flash = (texto: string, tipo = "ok") => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg({ texto: "", tipo: "ok" }), 3500);
  };

  const programar = async (id: number) => {
    if (!form.fecha_hora) { flash("Ingresa la fecha y hora", "err"); return; }
    try {
      await api.programarPartido(id, {
        fecha_hora: new Date(form.fecha_hora).toISOString(),
        sede_id: form.sede_id ? Number(form.sede_id) : null,
      });
      flash("Partido programado correctamente");
      setEditId(null);
      const data = await api.getPartidosByTorneo(torneoId!);
      setPartidos(data);
    } catch (e: any) {
      flash(e.message, "err");
    }
  };

  const toggleEventos = async (id: number) => {
    const next = new Set(expandidoIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      if (!eventosMap[id]) {
        const evs = await api.getEventos(id).catch(() => []);
        setEventosMap(prev => ({ ...prev, [id]: evs }));
      }
    }
    setExpandidoIds(next);
  };

  const estadoBadge = (estado: string) => {
    if (estado === "finalizado") return "bg-green-100 text-green-700";
    if (estado === "en_curso") return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-500";
  };

  const filtros = ["todos", "programado", "en_curso", "finalizado"];
  const [filtro, setFiltro] = useState("todos");

  const partidosFiltrados = partidos.filter(p =>
    filtro === "todos" || p.estado === filtro
  );

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Panel de Control</p>
        <h1 className="text-4xl font-black text-gray-900 mt-1">
          Gestión de <span className="text-red-600">Encuentros</span>
        </h1>
      </div>

      {msg.texto && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold border ${
          msg.tipo === "err" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
        }`}>{msg.texto}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Torneo</label>
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
          <div className="flex gap-2">
            {filtros.map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                  filtro === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {f === "todos" ? "Todos" : f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <p className="text-gray-400 text-sm">Cargando...</p>}

      {!loading && torneoId && partidos.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 shadow-sm">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No hay partidos generados para este torneo</p>
          <p className="text-sm mt-1">Genera el sorteo primero desde "Sorteos y Fixture"</p>
        </div>
      )}

      {partidosFiltrados.map(p => (
        <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase">{p.ronda}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${estadoBadge(p.estado)}`}>
                  {p.estado}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {p.sede_nombre && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <MapPin className="w-3 h-3" /> {p.sede_nombre}
                  </span>
                )}
                {p.estado === "finalizado" && (
                  <button
                    onClick={() => toggleEventos(p.id)}
                    title="Ver eventos del partido"
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {expandidoIds.has(p.id) ? (
                      <><ChevronUp className="w-3.5 h-3.5" /> Ocultar eventos</>
                    ) : (
                      <><ChevronDown className="w-3.5 h-3.5" /> Ver eventos</>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 my-2">
              <div className="flex-1 text-right">
                <p className="font-black text-gray-900 text-base leading-tight">{p.local?.nombre ?? "—"}</p>
                {p.local?.pais && (
                  <p className="text-xs text-gray-500 mt-0.5">{p.local.pais_emoji} {p.local.pais}</p>
                )}
              </div>
              <div className="text-center min-w-[80px]">
                {p.resultado_local !== null && p.resultado_visitante !== null ? (
                  <span className="text-2xl font-black text-gray-900">{p.resultado_local} – {p.resultado_visitante}</span>
                ) : p.fecha_hora ? (
                  <span className="text-sm font-bold text-gray-500">
                    {new Date(p.fecha_hora).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                    <br />
                    {new Date(p.fecha_hora).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-gray-300">Sin fecha</span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-black text-gray-900 text-base leading-tight">{p.visitante?.nombre ?? "—"}</p>
                {p.visitante?.pais && (
                  <p className="text-xs text-gray-500 mt-0.5">{p.visitante.pais_emoji} {p.visitante.pais}</p>
                )}
              </div>
            </div>

            {/* Programar / Reprogramar */}
            {p.estado !== "finalizado" && (
              <div className="mt-3">
                {editId === p.id ? (
                  <div className="flex flex-col sm:flex-row gap-3 items-end bg-gray-50 rounded-xl p-4 mt-2">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        <Clock className="w-3 h-3 inline mr-1" />Fecha y Hora
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        value={form.fecha_hora}
                        onChange={e => setForm(f => ({ ...f, fecha_hora: e.target.value }))}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        <MapPin className="w-3 h-3 inline mr-1" />Sede
                      </label>
                      <select
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        value={form.sede_id}
                        onChange={e => setForm(f => ({ ...f, sede_id: e.target.value }))}
                      >
                        <option value="">— Sin sede —</option>
                        {sedes.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.nombre_sede}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => programar(p.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="border border-gray-200 text-gray-500 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditId(p.id);
                      setForm({
                        fecha_hora: p.fecha_hora ? new Date(p.fecha_hora).toISOString().slice(0, 16) : "",
                        sede_id: p.sede_id?.toString() ?? "",
                      });
                    }}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 mt-1"
                  >
                    <Calendar className="w-3 h-3" />
                    {p.fecha_hora ? "Reprogramar" : "Programar fecha y sede"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Panel de eventos (solo finalizados) */}
          {p.estado === "finalizado" && expandidoIds.has(p.id) && (
            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/60">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Eventos del partido
              </p>
              {(eventosMap[p.id] ?? []).length === 0 ? (
                <p className="text-xs text-gray-400 italic">Sin eventos registrados para este partido</p>
              ) : (
                <div className="space-y-2">
                  {(eventosMap[p.id] ?? []).map((ev: any) => (
                    <div key={ev.id} className="flex items-center gap-3 text-sm">
                      {ev.minuto != null && (
                        <span className="text-xs font-black text-gray-400 w-10 text-right shrink-0">
                          {ev.minuto}&apos;
                        </span>
                      )}
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 ${COLOR_EVENTO[ev.tipo_evento] ?? "bg-gray-100 text-gray-600"}`}>
                        {LABEL_EVENTO[ev.tipo_evento] ?? ev.tipo_evento}
                      </span>
                      <span className="text-sm font-medium text-gray-800">
                        {ev.atleta ?? <span className="text-gray-400 italic">Sin jugador</span>}
                      </span>
                      {ev.descripcion && (
                        <span className="text-xs text-gray-400">— {ev.descripcion}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-3">
                Los eventos se registran desde <span className="font-semibold">Resultados</span>
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
