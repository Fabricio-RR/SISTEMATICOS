"use client";
import { useEffect, useState } from "react";
import { BarChart3, Save, Plus, X, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";

type EventoCfg = { value: string; label: string };
type SportCfg = { eventos: EventoCfg[]; anotadoresLabel: string; registrarLabel: string; tipo: string };

const SPORT_CFG: Record<string, SportCfg> = {
  futbol: {
    tipo: "futbol",
    eventos: [
      { value: "gol", label: "Gol" },
      { value: "tarjeta_amarilla", label: "Tarjeta Amarilla" },
      { value: "tarjeta_roja", label: "Tarjeta Roja" },
      { value: "falta", label: "Falta" },
    ],
    anotadoresLabel: "Goleadores",
    registrarLabel: "Registrar gol / tarjeta",
  },
  basket: {
    tipo: "basket",
    eventos: [
      { value: "enceste", label: "Enceste (2 pts)" },
      { value: "triple", label: "Triple (3 pts)" },
      { value: "punto", label: "Punto libre" },
      { value: "falta", label: "Falta personal" },
    ],
    anotadoresLabel: "Encestadores",
    registrarLabel: "Registrar enceste / falta",
  },
  voley: {
    tipo: "voley",
    eventos: [
      { value: "punto", label: "Punto ganado" },
    ],
    anotadoresLabel: "Anotadores",
    registrarLabel: "Registrar punto",
  },
  pingpong: {
    tipo: "pingpong",
    eventos: [
      { value: "punto", label: "Punto / Set" },
    ],
    anotadoresLabel: "Anotadores",
    registrarLabel: "Registrar punto",
  },
  default: {
    tipo: "default",
    eventos: [
      { value: "gol", label: "Gol / Punto" },
      { value: "punto", label: "Punto" },
      { value: "tarjeta_amarilla", label: "Tarjeta Amarilla" },
      { value: "tarjeta_roja", label: "Tarjeta Roja" },
      { value: "falta", label: "Falta" },
    ],
    anotadoresLabel: "Anotadores",
    registrarLabel: "Registrar evento",
  },
};

function getSportCfg(deporteNombre: string): SportCfg {
  const n = deporteNombre.toLowerCase();
  if (n.includes("fútbol") || n.includes("futbol") || n.includes("soccer")) return SPORT_CFG.futbol;
  if (n.includes("básquet") || n.includes("basquet") || n.includes("basket")) return SPORT_CFG.basket;
  if (n.includes("vóley") || n.includes("voley") || n.includes("voleibol")) return SPORT_CFG.voley;
  if (n.includes("ping") || n.includes("tenis de mesa")) return SPORT_CFG.pingpong;
  return SPORT_CFG.default;
}

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

type ConfirmState = {
  id: number;
  local: any;
  visitante: any;
  rl: number;
  rv: number;
  esCorreccion: boolean;
};

export default function AdminResultados() {
  const [torneos, setTorneos] = useState<any[]>([]);
  const [deportes, setDeportes] = useState<any[]>([]);
  const [torneoId, setTorneoId] = useState<number | null>(null);
  const [partidos, setPartidos] = useState<any[]>([]);
  const [posiciones, setPosiciones] = useState<any[]>([]);
  const [goleadores, setGoleadores] = useState<any[]>([]);
  const [faltas, setFaltas] = useState<any[]>([]);
  const [disciplina, setDisciplina] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ texto: "", tipo: "ok" });

  // Ingresar resultado (pendientes)
  const [resultadoId, setResultadoId] = useState<number | null>(null);
  const [resForm, setResForm] = useState({ resultado_local: "0", resultado_visitante: "0" });

  // Corregir resultado (finalizados)
  const [corrigiendoId, setCorrigiendoId] = useState<number | null>(null);
  const [corForm, setCorForm] = useState({ resultado_local: "0", resultado_visitante: "0" });

  // Confirmación antes de guardar
  const [confirmando, setConfirmando] = useState<ConfirmState | null>(null);

  // Modal de evento
  const [eventoPartidoId, setEventoPartidoId] = useState<number | null>(null);
  const [atletas, setAtletas] = useState<any[]>([]);
  const [evForm, setEvForm] = useState({ atleta_jugador_id: "", tipo_evento: "gol", minuto: "", descripcion: "" });

  // Expansión de eventos en finalizados
  const [expandidoIds, setExpandidoIds] = useState<Set<number>>(new Set());
  const [eventosMap, setEventosMap] = useState<Record<number, any[]>>({});

  useEffect(() => {
    Promise.all([api.getTorneos(), api.getDeportes()])
      .then(([t, d]) => { setTorneos(t); setDeportes(d); })
      .catch(() => {});
  }, []);

  const torneoActual = torneos.find(t => t.id === torneoId);
  const deporteActual = deportes.find(d => d.id === torneoActual?.deporte_id);
  const sportCfg = deporteActual ? getSportCfg(deporteActual.nombre) : SPORT_CFG.default;

  useEffect(() => {
    if (!torneoId) {
      setPartidos([]); setPosiciones([]); setGoleadores([]);
      setFaltas([]); setDisciplina([]);
      return;
    }
    setLoading(true);
    Promise.all([
      api.getPartidosByTorneo(torneoId),
      api.getPosiciones(torneoId),
      api.getGoleadores(torneoId),
      api.getFaltas(torneoId),
      api.getDisciplina(torneoId),
    ]).then(([p, pos, gol, fal, disc]) => {
      setPartidos(p); setPosiciones(pos); setGoleadores(gol);
      setFaltas(fal); setDisciplina(disc);
    }).finally(() => setLoading(false));
  }, [torneoId]);

  const flash = (texto: string, tipo = "ok") => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg({ texto: "", tipo: "ok" }), 3500);
  };

  const esFuturo = (fechaHora: string | null) => {
    if (!fechaHora) return false;
    return new Date(fechaHora) > new Date();
  };

  const iniciarGuardar = (
    id: number, local: any, visitante: any,
    rl: string, rv: string, esCorreccion = false
  ) => {
    if (rl === "" || rv === "") { flash("Ingresa ambos resultados", "err"); return; }
    setConfirmando({ id, local, visitante, rl: Number(rl), rv: Number(rv), esCorreccion });
  };

  const recargarDatos = async () => {
    if (!torneoId) return;
    const [p, pos, gol, fal, disc] = await Promise.all([
      api.getPartidosByTorneo(torneoId),
      api.getPosiciones(torneoId),
      api.getGoleadores(torneoId),
      api.getFaltas(torneoId),
      api.getDisciplina(torneoId),
    ]);
    setPartidos(p); setPosiciones(pos); setGoleadores(gol);
    setFaltas(fal); setDisciplina(disc);
  };

  const confirmarResultado = async () => {
    if (!confirmando) return;
    try {
      await api.registrarResultado(confirmando.id, {
        resultado_local: confirmando.rl,
        resultado_visitante: confirmando.rv,
      });
      flash(confirmando.esCorreccion ? "Resultado corregido correctamente" : "Resultado registrado");
      setResultadoId(null);
      setCorrigiendoId(null);
      setConfirmando(null);
      await recargarDatos();
    } catch (e: any) {
      flash(e.message, "err");
      setConfirmando(null);
    }
  };

  const abrirEvento = async (p: any) => {
    setEventoPartidoId(p.id);
    const [localAtletas, visitAtletas] = await Promise.all([
      p.local ? api.getAtletasByEquipo(p.local.id) : Promise.resolve([]),
      p.visitante ? api.getAtletasByEquipo(p.visitante.id) : Promise.resolve([]),
    ]);
    setAtletas([...localAtletas, ...visitAtletas]);
    setEvForm({ atleta_jugador_id: "", tipo_evento: sportCfg.eventos[0].value, minuto: "", descripcion: "" });
  };

  const guardarEvento = async () => {
    if (!eventoPartidoId) return;
    const savedId = eventoPartidoId;
    try {
      await api.agregarEvento(savedId, {
        atleta_jugador_id: evForm.atleta_jugador_id ? Number(evForm.atleta_jugador_id) : null,
        tipo_evento: evForm.tipo_evento,
        minuto: evForm.minuto ? Number(evForm.minuto) : null,
        descripcion: evForm.descripcion || null,
      });
      flash("Evento registrado");
      setEventoPartidoId(null);
      if (expandidoIds.has(savedId)) {
        const evs = await api.getEventos(savedId).catch(() => []);
        setEventosMap(prev => ({ ...prev, [savedId]: evs }));
      }
    } catch (e: any) { flash(e.message, "err"); }
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

  const pendientes = partidos.filter(p => p.estado !== "finalizado");
  const finalizados = partidos.filter(p => p.estado === "finalizado");

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Portal Administrativo</p>
        <h1 className="text-4xl font-black text-gray-900 mt-1">
          Resultados y <span className="text-red-600">Estadísticas</span>
        </h1>
      </div>

      {msg.texto && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold border ${
          msg.tipo === "err" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
        }`}>{msg.texto}</div>
      )}

      {/* Selector torneo */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
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

      {loading && <p className="text-gray-400 text-sm mb-4">Cargando...</p>}

      {/* Modal confirmación de resultado */}
      {confirmando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-black text-gray-900 text-lg mb-1">
              {confirmando.esCorreccion ? "Corregir Resultado" : "Confirmar Resultado"}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {confirmando.esCorreccion
                ? "¿Confirmar la corrección? La tabla de posiciones se recalculará automáticamente."
                : "¿Los datos son correctos? Esta acción actualizará la tabla de posiciones."}
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 text-right">
                  <p className="font-bold text-gray-900 text-sm">{confirmando.local?.nombre ?? "—"}</p>
                  {confirmando.local?.pais && (
                    <p className="text-xs text-gray-400">{confirmando.local.pais_emoji} {confirmando.local.pais}</p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-gray-900">{confirmando.rl} – {confirmando.rv}</p>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">{confirmando.visitante?.nombre ?? "—"}</p>
                  {confirmando.visitante?.pais && (
                    <p className="text-xs text-gray-400">{confirmando.visitante.pais_emoji} {confirmando.visitante.pais}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={confirmarResultado}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-red-700">
                Sí, confirmar
              </button>
              <button onClick={() => setConfirmando(null)}
                className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de evento */}
      {eventoPartidoId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-900">Registrar Evento</h3>
              <button onClick={() => setEventoPartidoId(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Tipo de evento</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={evForm.tipo_evento}
                  onChange={e => setEvForm(f => ({ ...f, tipo_evento: e.target.value }))}
                >
                  {sportCfg.eventos.map(ev => (
                    <option key={ev.value} value={ev.value}>{ev.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Jugador</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={evForm.atleta_jugador_id}
                  onChange={e => setEvForm(f => ({ ...f, atleta_jugador_id: e.target.value }))}
                >
                  <option value="">— Sin jugador específico —</option>
                  {atletas.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.nombre_completo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Minuto</label>
                <input
                  type="number" min="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej. 45"
                  value={evForm.minuto}
                  onChange={e => setEvForm(f => ({ ...f, minuto: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={evForm.descripcion}
                  onChange={e => setEvForm(f => ({ ...f, descripcion: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={guardarEvento}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-red-700">
                Guardar Evento
              </button>
              <button onClick={() => setEventoPartidoId(null)}
                className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {torneoId && (
        <div className="grid grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="col-span-2 space-y-4">

            {/* Ingresar Resultados */}
            {pendientes.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50">
                  <h2 className="font-black text-gray-900">Ingresar Resultados</h2>
                  <p className="text-xs text-gray-400">{pendientes.length} partidos pendientes</p>
                </div>
                {pendientes.map(p => {
                  const futuro = esFuturo(p.fecha_hora);
                  return (
                    <div key={p.id} className="border-b border-gray-50 last:border-0 px-6 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase">{p.ronda}</span>
                        <div className="flex items-center gap-2">
                          {futuro && (
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                              Aún no comienza
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {p.fecha_hora
                              ? new Date(p.fecha_hora).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })
                              : "Sin fecha"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 text-right">
                          <p className="font-bold text-sm text-gray-900">{p.local?.nombre ?? "—"}</p>
                          {p.local?.pais && <p className="text-xs text-gray-400">{p.local.pais_emoji} {p.local.pais}</p>}
                        </div>
                        {resultadoId === p.id ? (
                          <div className="flex items-center gap-2 min-w-[180px]">
                            <input
                              type="number" min="0"
                              className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-center font-black text-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                              value={resForm.resultado_local}
                              onChange={e => setResForm(f => ({ ...f, resultado_local: e.target.value }))}
                            />
                            <span className="font-black text-gray-400">—</span>
                            <input
                              type="number" min="0"
                              className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-center font-black text-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                              value={resForm.resultado_visitante}
                              onChange={e => setResForm(f => ({ ...f, resultado_visitante: e.target.value }))}
                            />
                            <button
                              onClick={() => iniciarGuardar(p.id, p.local, p.visitante, resForm.resultado_local, resForm.resultado_visitante)}
                              className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setResultadoId(null)}
                              className="border border-gray-200 text-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="min-w-[180px] flex justify-center">
                            <button
                              disabled={futuro}
                              onClick={() => {
                                if (futuro) return;
                                setResultadoId(p.id);
                                setResForm({ resultado_local: "0", resultado_visitante: "0" });
                              }}
                              className={`text-xs font-bold border px-3 py-1.5 rounded-lg transition-colors ${
                                futuro
                                  ? "border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50"
                                  : "text-red-600 border-red-200 hover:bg-red-50"
                              }`}
                            >
                              Ingresar resultado
                            </button>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-bold text-sm text-gray-900">{p.visitante?.nombre ?? "—"}</p>
                          {p.visitante?.pais && <p className="text-xs text-gray-400">{p.visitante.pais_emoji} {p.visitante.pais}</p>}
                        </div>
                      </div>
                      {!futuro && (
                        <div className="mt-2 flex justify-center">
                          <button onClick={() => abrirEvento(p)}
                            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                            <Plus className="w-3 h-3" /> {sportCfg.registrarLabel}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Resultados Registrados */}
            {finalizados.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50">
                  <h2 className="font-black text-gray-900">Resultados Registrados</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Lapiz para corregir resultado · flecha para ver/agregar eventos del partido
                  </p>
                </div>
                {finalizados.slice(0, 10).map(p => (
                  <div key={p.id}>
                    <div className="flex items-center px-6 py-3 border-b border-gray-50 gap-4">
                      <div className="flex-1 text-right">
                        <p className="text-sm font-bold text-gray-900">{p.local?.nombre ?? "—"}</p>
                        {p.local?.pais && <p className="text-xs text-gray-400">{p.local.pais_emoji} {p.local.pais}</p>}
                      </div>
                      {corrigiendoId === p.id ? (
                        <div className="flex items-center gap-2 min-w-[190px]">
                          <input
                            type="number" min="0"
                            className="w-14 border border-blue-300 rounded-lg px-2 py-1.5 text-center font-black text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={corForm.resultado_local}
                            onChange={e => setCorForm(f => ({ ...f, resultado_local: e.target.value }))}
                          />
                          <span className="font-black text-gray-400">—</span>
                          <input
                            type="number" min="0"
                            className="w-14 border border-blue-300 rounded-lg px-2 py-1.5 text-center font-black text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            value={corForm.resultado_visitante}
                            onChange={e => setCorForm(f => ({ ...f, resultado_visitante: e.target.value }))}
                          />
                          <button
                            onClick={() => iniciarGuardar(p.id, p.local, p.visitante, corForm.resultado_local, corForm.resultado_visitante, true)}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setCorrigiendoId(null)}
                            className="border border-gray-200 text-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-lg font-black text-gray-900 min-w-[80px] text-center">
                          {p.resultado_local} – {p.resultado_visitante}
                        </span>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">{p.visitante?.nombre ?? "—"}</p>
                        {p.visitante?.pais && <p className="text-xs text-gray-400">{p.visitante.pais_emoji} {p.visitante.pais}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">FIN</span>
                        <button
                          title="Corregir resultado"
                          onClick={() => {
                            if (corrigiendoId === p.id) {
                              setCorrigiendoId(null);
                            } else {
                              setCorrigiendoId(p.id);
                              setCorForm({
                                resultado_local: String(p.resultado_local ?? 0),
                                resultado_visitante: String(p.resultado_visitante ?? 0),
                              });
                            }
                          }}
                          className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Ver / agregar eventos"
                          onClick={() => toggleEventos(p.id)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {expandidoIds.has(p.id) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Panel de eventos */}
                    {expandidoIds.has(p.id) && (
                      <div className="px-6 py-3 bg-gray-50/70 border-b border-gray-100">
                        {(eventosMap[p.id] ?? []).length === 0 ? (
                          <p className="text-xs text-gray-400">Sin eventos registrados para este partido</p>
                        ) : (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {(eventosMap[p.id] ?? []).map((ev: any) => (
                              <div key={ev.id} className="flex items-center gap-1.5 text-xs">
                                <span className={`font-bold px-2 py-0.5 rounded-full ${COLOR_EVENTO[ev.tipo_evento] ?? "bg-gray-100 text-gray-600"}`}>
                                  {LABEL_EVENTO[ev.tipo_evento] ?? ev.tipo_evento}
                                </span>
                                {ev.atleta && <span className="text-gray-700 font-medium">{ev.atleta}</span>}
                                {ev.minuto != null && <span className="text-gray-400">min. {ev.minuto}</span>}
                                {ev.descripcion && <span className="text-gray-400">— {ev.descripcion}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => abrirEvento(p)}
                          className="mt-1 text-xs text-gray-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Agregar evento
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar derecho */}
          <div className="space-y-4">
            {/* Tabla de Posiciones */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h2 className="font-black text-gray-900">Tabla de Posiciones</h2>
                <BarChart3 className="w-4 h-4 text-gray-400" />
              </div>
              {posiciones.length === 0 ? (
                <p className="px-5 py-4 text-xs text-gray-400">Sin datos aún</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {posiciones.slice(0, 8).map(t => (
                    <div key={t.equipo_id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-black ${t.posicion === 1 ? "text-red-600" : "text-gray-400"}`}>
                          {String(t.posicion).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{t.nombre_equipo}</p>
                          <p className="text-xs text-gray-400">{t.pais_emoji} {t.pais || t.grupo}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-gray-900">{t.puntos}</p>
                        <p className="text-[10px] text-gray-400">{t.pj} PJ</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Goleadores — solo fútbol */}
            {sportCfg.tipo === "futbol" && goleadores.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <h2 className="font-black text-gray-900">Goleadores</h2>
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">⚽ Fútbol</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {goleadores.slice(0, 8).map((g, i) => (
                    <div key={g.atleta_id} className="px-5 py-3 flex items-center gap-3">
                      <span className={`text-sm font-black w-5 shrink-0 ${i === 0 ? "text-red-600" : "text-gray-300"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{g.nombre}</p>
                        <p className="text-xs text-gray-400 truncate">{g.equipo}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-lg font-black text-green-600">{g.goles}</span>
                        {g.tarjetas_amarillas > 0 && (
                          <span className="text-[10px] bg-yellow-100 text-yellow-700 font-bold px-1.5 py-0.5 rounded">
                            {g.tarjetas_amarillas}🟨
                          </span>
                        )}
                        {g.tarjetas_rojas > 0 && (
                          <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                            {g.tarjetas_rojas}🟥
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-2 border-t border-gray-50">
                  <a href="/admin/reportes" className="text-xs text-red-600 hover:underline font-semibold">
                    Ver reporte completo →
                  </a>
                </div>
              </div>
            )}

            {/* Disciplina — tarjetas fútbol */}
            {sportCfg.tipo === "futbol" && disciplina.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="font-black text-gray-900">Disciplina</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {disciplina.slice(0, 5).map((d, i) => (
                    <div key={i} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{d.nombre}</p>
                        <p className="text-xs text-gray-400">{d.equipo}</p>
                      </div>
                      <div className="flex gap-2">
                        {d.tarjetas_amarillas > 0 && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">
                            {d.tarjetas_amarillas} 🟨
                          </span>
                        )}
                        {d.tarjetas_rojas > 0 && (
                          <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                            {d.tarjetas_rojas} 🟥
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Faltas — basket / vóley */}
            {(sportCfg.tipo === "basket" || sportCfg.tipo === "voley") && faltas.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <h2 className="font-black text-gray-900">Faltas Personales</h2>
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                    {sportCfg.tipo === "basket" ? "🏀 Básquet" : "🏐 Vóley"}
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {faltas.slice(0, 8).map((f, i) => (
                    <div key={f.atleta_id} className="px-5 py-3 flex items-center gap-3">
                      <span className={`text-sm font-black w-5 shrink-0 ${i === 0 ? "text-orange-600" : "text-gray-300"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{f.nombre}</p>
                        <p className="text-xs text-gray-400 truncate">{f.equipo}</p>
                      </div>
                      <span className="text-lg font-black text-orange-600 shrink-0">{f.faltas}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Encestadores — basket (extra info) */}
            {sportCfg.tipo === "basket" && goleadores.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <h2 className="font-black text-gray-900">Encestadores</h2>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">🏀</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {goleadores.slice(0, 5).map((g, i) => (
                    <div key={g.atleta_id} className="px-5 py-3 flex items-center gap-3">
                      <span className={`text-sm font-black w-5 shrink-0 ${i === 0 ? "text-blue-600" : "text-gray-300"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{g.nombre}</p>
                        <p className="text-xs text-gray-400 truncate">{g.equipo}</p>
                      </div>
                      <span className="text-lg font-black text-blue-600 shrink-0">{g.goles}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
