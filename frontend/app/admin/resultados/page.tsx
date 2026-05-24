"use client";
import { useEffect, useState, useCallback } from "react";
import { BarChart3, RefreshCw, Filter, AlertCircle, X, Plus, Trash2, CheckCircle2, Trophy, Save, Swords, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import type { Partido, Torneo, PosicionTabla, AtletaJugador, EventoPartidoCreate, Deporte } from "@/types/api";

const TIPO_INFO: Record<string, { label: string; bg: string }> = {
  gol:              { label: "GOL", bg: "bg-emerald-500 text-white" },
  puntos:           { label: "PTS", bg: "bg-blue-500 text-white"   },
  tarjeta_amarilla: { label: "TA",  bg: "bg-amber-400 text-white"  },
  tarjeta_roja:     { label: "TR",  bg: "bg-red-600 text-white"    },
};

const scoreInputCls =
  "w-14 h-14 text-center text-3xl font-black text-gray-900 bg-white rounded-xl border-0 " +
  "focus:outline-none focus:ring-4 focus:ring-red-300 transition shadow " +
  "disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed disabled:shadow-none " +
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export default function ResultadosPage() {
  const [partidos, setPartidos]   = useState<Partido[]>([]);
  const [torneos, setTorneos]     = useState<Torneo[]>([]);
  const [tabla, setTabla]         = useState<PosicionTabla[]>([]);
  const [deportes, setDeportes]   = useState<Deporte[]>([]);
  const [torneoId, setTorneoId]   = useState<number | undefined>();
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState("");

  // Modal
  const [modalPartido, setModalPartido]               = useState<Partido | null>(null);
  const [modalLocal, setModalLocal]                   = useState("");
  const [modalVisitante, setModalVisitante]           = useState("");
  const [modalEventos, setModalEventos]               = useState<EventoPartidoCreate[]>([]);
  const [atletasLocal, setAtletasLocal]               = useState<AtletaJugador[]>([]);
  const [atletasVisitante, setAtletasVisitante]       = useState<AtletaJugador[]>([]);
  const [cargandoAtletas, setCargandoAtletas]         = useState(false);
  const [guardando, setGuardando]                     = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState<{
    equipo: "local" | "visitante"; atletaId: number; tipo: string; minuto: string; descripcion: string;
  }>({ equipo: "local", atletaId: 0, tipo: "gol", minuto: "", descripcion: "" });

  const depMap = new Map(deportes.map(d => [d.id, d]));

  function esFutbol(partido: Partido) {
    const t = torneos.find(tor => tor.nombre === partido.torneo_nombre);
    if (!t) return false;
    const dep = depMap.get(t.deporte_id);
    if (!dep) return false;
    const n = dep.nombre.toLowerCase();
    return n.includes("fútbol") || n.includes("futbol");
  }

  const cargar = useCallback(async () => {
    setCargando(true); setError("");
    try {
      const [p, t, tab, deps] = await Promise.all([
        api.getPartidos({ torneo_id: torneoId }),
        api.getTorneos(),
        torneoId ? api.getTabla(torneoId) : Promise.resolve([]),
        api.getDeportes(),
      ]);
      setTorneos(t);
      setPartidos(p.filter(x => x.estado !== "finalizado"));
      setTabla(tab);
      setDeportes(deps);
    } catch { setError("No se pudo cargar los resultados."); }
    finally { setCargando(false); }
  }, [torneoId]);

  useEffect(() => {
    const enCurso = torneos.filter(t => t.estado === "en_curso");
    if (!torneoId && enCurso.length === 1) setTorneoId(enCurso[0].id);
  }, [torneos, torneoId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function abrirModal(partido: Partido) {
    setModalPartido(partido);
    setModalLocal(""); setModalVisitante("");
    setModalEventos(
      partido.eventos?.map(e => ({
        atleta_jugador_id: e.atleta_jugador_id ?? 0,
        tipo_evento: e.tipo_evento,
        minuto: e.minuto || undefined,
        descripcion: e.descripcion || undefined,
      })) ?? []
    );
    setNuevoEvento({ equipo: "local", atletaId: 0, tipo: "gol", minuto: "", descripcion: "" });
    setAtletasLocal([]); setAtletasVisitante([]);
    setCargandoAtletas(true);
    try {
      const [atsL, atsV] = await Promise.all([
        partido.local_club_equipo_id ? api.getAtletas(partido.local_club_equipo_id) : Promise.resolve([]),
        partido.visitante_club_equipo_id ? api.getAtletas(partido.visitante_club_equipo_id) : Promise.resolve([]),
      ]);
      setAtletasLocal(atsL); setAtletasVisitante(atsV);
      if (atsL.length > 0) setNuevoEvento(prev => ({ ...prev, atletaId: atsL[0].id }));
    } catch { setError("Error al cargar los jugadores."); }
    finally { setCargandoAtletas(false); }
  }

  function cambiarEquipo(eq: "local" | "visitante") {
    const list = eq === "local" ? atletasLocal : atletasVisitante;
    setNuevoEvento(prev => ({ ...prev, equipo: eq, atletaId: list[0]?.id ?? 0 }));
  }

  function agregarEvento() {
    if (!nuevoEvento.atletaId) { setError("Selecciona un jugador."); return; }
    setModalEventos(prev => [...prev, {
      atleta_jugador_id: nuevoEvento.atletaId,
      tipo_evento: nuevoEvento.tipo,
      minuto: nuevoEvento.minuto ? Number(nuevoEvento.minuto) : null,
      descripcion: nuevoEvento.descripcion || null,
    }]);
    // Gol → incrementa marcador automáticamente
    if (nuevoEvento.tipo === "gol") {
      if (nuevoEvento.equipo === "local") setModalLocal(v => String(Number(v || 0) + 1));
      else setModalVisitante(v => String(Number(v || 0) + 1));
    }
    setNuevoEvento(prev => ({ ...prev, minuto: "", descripcion: "" }));
  }

  function quitarEvento(idx: number) {
    const ev = modalEventos[idx];
    // Gol → decrementa marcador automáticamente
    if (ev.tipo_evento === "gol") {
      const esLocal = atletasLocal.some(a => a.id === ev.atleta_jugador_id);
      if (esLocal) setModalLocal(v => String(Math.max(0, Number(v || 0) - 1)));
      else setModalVisitante(v => String(Math.max(0, Number(v || 0) - 1)));
    }
    setModalEventos(prev => prev.filter((_, i) => i !== idx));
  }

  function nombreJugador(id: number) {
    const a = [...atletasLocal, ...atletasVisitante].find(x => x.id === id);
    return a ? `${a.nombre_completo}${a.numero_camiseta ? ` #${a.numero_camiseta}` : ""}` : `#${id}`;
  }

  async function guardarResultado() {
    if (!modalPartido) return;
    const esFut = esFutbol(modalPartido);
    let rl: number, rv: number;
    if (esFut) {
      rl = modalEventos.filter(e => e.tipo_evento === "gol" && atletasLocal.some(a => a.id === e.atleta_jugador_id)).length;
      rv = modalEventos.filter(e => e.tipo_evento === "gol" && atletasVisitante.some(a => a.id === e.atleta_jugador_id)).length;
    } else {
      if (modalLocal === "" || modalVisitante === "") { setError("Ingresa el marcador final del partido."); return; }
      rl = Number(modalLocal);
      rv = Number(modalVisitante);
      if (rl < 0 || rv < 0) { setError("El marcador no puede ser negativo."); return; }
    }

    setGuardando(true);
    try {
      await api.setResultado(modalPartido.id, { resultado_local: rl, resultado_visitante: rv, eventos: modalEventos });
      setModalPartido(null);
      await cargar();
    } catch (e) { setError(e instanceof Error ? e.message : "Error al guardar."); }
    finally { setGuardando(false); }
  }

  const torneosEnCurso = torneos.filter(t => t.estado === "en_curso");
  const pendientesCount = partidos.length;

  const jornadas = partidos.reduce<Record<string, Partido[]>>((acc, p) => {
    const key = p.ronda ?? `Jornada ${p.jornada}`;
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  const posBadge = (pos: number) =>
    pos === 1 ? "bg-amber-400 text-white ring-2 ring-amber-200"
    : pos === 2 ? "bg-gray-400 text-white"
    : pos === 3 ? "bg-orange-500 text-white"
    : "bg-gray-100 text-gray-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Resultados</h1>
          <p className="text-sm text-gray-400 mt-0.5">Selecciona un partido y registra el marcador final junto con los eventos.</p>
        </div>
        <button onClick={cargar} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-sm">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError("")} className="ml-auto"><X className="w-4 h-4 text-red-400 hover:text-red-600" /></button>
        </div>
      )}

      {torneosEnCurso.length === 0 && !cargando && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          No hay torneos en curso. El torneo debe estar en estado <strong className="mx-1">En curso</strong> para registrar resultados.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Columna partidos */}
        <div className="lg:col-span-2 space-y-4">

          {/* Selector */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={torneoId ?? ""}
              onChange={e => setTorneoId(e.target.value ? Number(e.target.value) : undefined)}
              className="flex-1 text-sm bg-transparent focus:outline-none text-gray-800 font-medium cursor-pointer"
            >
              <option value="">— Seleccionar torneo —</option>
              {torneosEnCurso.map(t => (
                <option key={t.id} value={t.id}>{t.nombre} · {t.temporada}</option>
              ))}
              {torneos.filter(t => t.estado !== "en_curso").length > 0 && (
                <optgroup label="Sin partidos activos">
                  {torneos.filter(t => t.estado !== "en_curso").map(t => (
                    <option key={t.id} value={t.id} disabled>{t.nombre} [{t.estado.replace(/_/g, " ")}]</option>
                  ))}
                </optgroup>
              )}
            </select>
            {torneoId && (
              <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${pendientesCount > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                {pendientesCount > 0 ? `${pendientesCount} pendiente${pendientesCount !== 1 ? "s" : ""}` : "✓ Al día"}
              </span>
            )}
          </div>

          {/* Lista de partidos */}
          {cargando ? (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm flex items-center justify-center h-44 text-sm text-gray-400">Cargando...</div>
          ) : !torneoId ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center h-44 gap-3 text-gray-400">
              <Swords className="w-10 h-10 text-gray-200" strokeWidth={1.5} />
              <p className="text-sm">Selecciona un torneo en curso</p>
            </div>
          ) : partidos.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col items-center justify-center h-44 gap-2">
              <CheckCircle2 className="w-9 h-9 text-green-400" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-gray-700">Todos los resultados están ingresados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(jornadas).map(([jornada, pts]) => (
                <div key={jornada} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{jornada}</span>
                    <span className="text-xs text-gray-400">{pts.length} partido{pts.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {pts.map((p, idx) => (
                      <div
                        key={p.id}
                        className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"} hover:bg-red-50/20 group`}
                      >
                        {/* Equipo local */}
                        <span className="flex-1 text-sm font-bold text-gray-800 text-right truncate">
                          {p.local_nombre}
                        </span>

                        {/* VS badge */}
                        <span className="shrink-0 text-[11px] font-black text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg tracking-widest">
                          VS
                        </span>

                        {/* Equipo visitante */}
                        <span className="flex-1 text-sm font-bold text-gray-800 text-left truncate">
                          {p.visitante_nombre}
                        </span>

                        {/* Botón */}
                        <button
                          onClick={() => abrirModal(p)}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-sm group-hover:shadow-md"
                        >
                          Registrar
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabla general */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-gray-900">Tabla general</h2>
            <BarChart3 className="w-4 h-4 text-gray-300 ml-auto" />
          </div>
          {!torneoId ? (
            <div className="px-5 py-12 text-center text-sm text-gray-400">Selecciona un torneo</div>
          ) : tabla.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-400">Sin datos aún</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {tabla.map(row => (
                <div key={row.equipo_id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/40 transition-colors">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${posBadge(row.posicion)}`}>
                    {row.posicion}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${row.posicion === 1 ? "text-amber-700" : "text-gray-900"}`}>
                      {row.nombre_equipo}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {row.partidos_jugados}PJ · {row.partidos_ganados}G {row.partidos_empatados}E {row.partidos_perdidos}P
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {row.goles_a_favor}GF {row.goles_en_contra}GC ·{" "}
                      <span className={row.diferencia_goles > 0 ? "text-emerald-600 font-semibold" : row.diferencia_goles < 0 ? "text-red-500 font-semibold" : ""}>
                        {row.diferencia_goles > 0 ? `+${row.diferencia_goles}` : row.diferencia_goles}
                      </span>
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-xl font-black leading-none ${row.posicion === 1 ? "text-amber-600" : "text-gray-800"}`}>{row.puntos}</p>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mt-0.5">pts</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────── */}
      {modalPartido && (() => {
        const esFut = esFutbol(modalPartido);

        const golesL = modalEventos.filter(e => e.tipo_evento === "gol" && atletasLocal.some(a => a.id === e.atleta_jugador_id)).length;
        const golesV = modalEventos.filter(e => e.tipo_evento === "gol" && atletasVisitante.some(a => a.id === e.atleta_jugador_id)).length;

        const tiposEvento = esFut
          ? [
              { key: "gol",              icon: "⚽", label: "Gol",     active: "bg-emerald-600 text-white border-emerald-600" },
              { key: "tarjeta_amarilla", icon: "🟨", label: "T. Amarilla", active: "bg-amber-400 text-white border-amber-400" },
              { key: "tarjeta_roja",     icon: "🟥", label: "T. Roja", active: "bg-red-600 text-white border-red-600" },
            ]
          : [{ key: "puntos", icon: "🏀", label: "Puntos", active: "bg-blue-600 text-white border-blue-600" }];

        const atletasActivos = nuevoEvento.equipo === "local" ? atletasLocal : atletasVisitante;

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-8">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {modalPartido.local_nombre} vs {modalPartido.visitante_nombre}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {modalPartido.torneo_nombre} · {modalPartido.ronda ?? `Jornada ${modalPartido.jornada}`}
                  </p>
                </div>
                <button onClick={() => setModalPartido(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5 max-h-[80vh] overflow-y-auto">

                {/* 1 · Marcador */}
                <div className="bg-gray-900 rounded-2xl px-5 py-4 flex items-center gap-3">
                  <p className="flex-1 text-sm font-bold text-white text-right truncate leading-tight">
                    {modalPartido.local_nombre}
                    <span className="block text-[10px] font-normal text-white/40 uppercase tracking-wider">Local</span>
                  </p>
                  <div className="shrink-0 flex items-center gap-2">
                    <input
                      type="number" min={0} max={99}
                      value={esFut ? Math.max(Number(modalLocal || 0), golesL) : modalLocal}
                      onChange={e => setModalLocal(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                      placeholder="0"
                      className={scoreInputCls}
                      disabled={esFut}
                    />
                    <span className="text-white/20 font-black text-2xl select-none">–</span>
                    <input
                      type="number" min={0} max={99}
                      value={esFut ? Math.max(Number(modalVisitante || 0), golesV) : modalVisitante}
                      onChange={e => setModalVisitante(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                      placeholder="0"
                      className={scoreInputCls}
                      disabled={esFut}
                    />
                  </div>
                  <p className="flex-1 text-sm font-bold text-white text-left truncate leading-tight">
                    {modalPartido.visitante_nombre}
                    <span className="block text-[10px] font-normal text-white/40 uppercase tracking-wider">Visitante</span>
                  </p>
                </div>

                {/* 2 · Eventos */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold text-gray-800">Eventos</span>
                    <span className="text-xs text-gray-400">· opcional</span>
                  </div>

                  {cargandoAtletas ? (
                    <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-xl">Cargando jugadores...</div>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">

                      {/* Equipo: 2 pills */}
                      <div className="flex gap-2">
                        {(["local", "visitante"] as const).map(eq => (
                          <button
                            key={eq}
                            onClick={() => cambiarEquipo(eq)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border-2 transition ${
                              nuevoEvento.equipo === eq
                                ? "bg-gray-900 text-white border-gray-900"
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                            }`}
                          >
                            {eq === "local" ? modalPartido.local_nombre : modalPartido.visitante_nombre}
                            <span className={`block text-[9px] uppercase tracking-widest font-semibold mt-0.5 ${nuevoEvento.equipo === eq ? "text-white/50" : "text-gray-400"}`}>
                              {eq}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Tipo: pills de iconos */}
                      <div className="flex gap-2">
                        {tiposEvento.map(t => (
                          <button
                            key={t.key}
                            onClick={() => setNuevoEvento(prev => ({ ...prev, tipo: t.key }))}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg border-2 transition flex items-center justify-center gap-1 ${
                              nuevoEvento.tipo === t.key
                                ? t.active
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                            }`}
                          >
                            <span>{t.icon}</span>
                            <span>{t.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Jugador */}
                      <select
                        value={nuevoEvento.atletaId}
                        onChange={e => setNuevoEvento(prev => ({ ...prev, atletaId: Number(e.target.value) }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
                      >
                        {atletasActivos.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.nombre_completo}{a.numero_camiseta ? ` · #${a.numero_camiseta}` : ""}{a.posicion_rol ? ` · ${a.posicion_rol}` : ""}
                          </option>
                        ))}
                        {atletasActivos.length === 0 && <option value="0">Sin jugadores registrados</option>}
                      </select>

                      {/* Minuto + descripción + agregar (una sola fila) */}
                      <div className="flex gap-2">
                        <input
                          type="number" min={1} max={120} placeholder="Min."
                          value={nuevoEvento.minuto}
                          onChange={e => setNuevoEvento(prev => ({ ...prev, minuto: e.target.value }))}
                          className="w-16 text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <input
                          type="text" maxLength={60} placeholder="Nota opcional (Ej. Tiro libre)"
                          value={nuevoEvento.descripcion}
                          onChange={e => setNuevoEvento(prev => ({ ...prev, descripcion: e.target.value }))}
                          className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
                        />
                        <button
                          onClick={agregarEvento}
                          className="shrink-0 inline-flex items-center gap-1 px-3 py-2 bg-gray-900 hover:bg-gray-700 text-white text-xs font-bold rounded-lg transition"
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3 · Lista de eventos */}
                {modalEventos.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Eventos agregados · {modalEventos.length}
                    </p>
                    {modalEventos.map((ev, idx) => {
                      const info = TIPO_INFO[ev.tipo_evento] ?? { label: ev.tipo_evento, bg: "bg-gray-400 text-white" };
                      return (
                        <div key={idx} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                          <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md ${info.bg}`}>{info.label}</span>
                          <span className="flex-1 text-xs font-semibold text-gray-900 truncate">{nombreJugador(ev.atleta_jugador_id)}</span>
                          {ev.minuto != null && <span className="text-[11px] text-gray-500 shrink-0 font-medium">{ev.minuto}&apos;</span>}
                          {ev.descripcion && <span className="text-[11px] text-gray-400 italic shrink-0 hidden sm:block">{ev.descripcion}</span>}
                          <button
                            onClick={() => quitarEvento(idx)}
                            className="shrink-0 p-1 rounded text-gray-300 hover:text-red-500 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
                <span className="text-xs text-gray-400">
                  {esFut
                    ? <span className="text-emerald-600 font-semibold">✓ {golesL} – {golesV} · {modalEventos.length} evento{modalEventos.length !== 1 ? "s" : ""}</span>
                    : (modalLocal !== "" && modalVisitante !== ""
                      ? <span className="text-emerald-600 font-semibold">✓ {modalLocal} – {modalVisitante} · {modalEventos.length} evento{modalEventos.length !== 1 ? "s" : ""}</span>
                      : "Ingresa el marcador para continuar")
                  }
                </span>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setModalPartido(null)}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                    Cancelar
                  </button>
                  <button
                    onClick={guardarResultado}
                    disabled={guardando || (!esFut && (modalLocal === "" || modalVisitante === ""))}
                    className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 rounded-lg transition inline-flex items-center gap-2 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    {guardando ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
