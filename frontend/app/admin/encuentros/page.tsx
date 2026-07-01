"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar, RefreshCw, AlertCircle, RotateCcw, Pencil, X, Plus, Trash2, ClipboardList, Save, ChevronDown,
  MapPin, AlertTriangle, Search, Clock, CalendarClock, ClipboardCheck, Trophy, CalendarOff,
  LayoutList, GitFork
} from "lucide-react";
import { api } from "@/lib/api";
import type { Partido, Torneo, Deporte, EstadoPartido, PartidoUpdate, Sede, AtletaJugador, EventoPartidoCreate } from "@/types/api";

const ESTADO_LABEL: Record<EstadoPartido, string> = {
  programado: "Programado",
  en_curso: "En curso",
  finalizado: "Finalizado",
};

const ESTADO_BADGE: Record<EstadoPartido, { cls: string; dot: string }> = {
  programado: { cls: "bg-blue-50 text-blue-700 border-blue-100", dot: "bg-blue-500" },
  en_curso:   { cls: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500 animate-pulse" },
  finalizado: { cls: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
};

const TIPO_INFO: Record<string, { label: string; bg: string }> = {
  gol:              { label: "GOL", bg: "bg-emerald-500 text-white" },
  puntos:           { label: "PTS", bg: "bg-blue-500 text-white"   },
  tarjeta_amarilla: { label: "TA",  bg: "bg-amber-400 text-white"  },
  tarjeta_roja:     { label: "TR",  bg: "bg-red-600 text-white"    },
};

const scoreInputCls =
  "w-14 h-14 text-center text-3xl font-black text-slate-900 bg-white rounded-xl border-0 " +
  "focus:outline-none focus:ring-4 focus:ring-red-300 transition shadow " +
  "disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed disabled:shadow-none " +
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

type EditModal = { partido: Partido; form: PartidoUpdate; fechaOriginal: string | null };
type CorreccionModal = { partido: Partido; local: string; visitante: string };
type RegistroModal = { partido: Partido; local: string; visitante: string };
type VistaTipo = "lista" | "mapa";

function fmtFecha(iso: string | null): string {
  if (!iso) return "Por programar";
  return new Date(iso).toLocaleString("es-PE", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function PartidoBracket({ p, onRegistrar, onCorregir, onEditar }: {
  p: Partido;
  onRegistrar: () => void;
  onCorregir: () => void;
  onEditar: () => void;
}) {
  const jugado = p.estado !== "programado";
  const rl = p.resultado_local ?? (jugado ? 0 : "-");
  const rv = p.resultado_visitante ?? (jugado ? 0 : "-");
  
  const isFinal = p.ronda?.toLowerCase().includes("final") && !p.ronda?.toLowerCase().includes("cuarto") && !p.ronda?.toLowerCase().includes("octavo");
  const isPending = p.estado === "programado" && !p.fecha_hora;

  const cardCls = isFinal 
    ? "relative bg-white border-[3px] border-slate-900 rounded-xl w-72 shadow-[6px_6px_0px_0px_#0f172a] flex flex-col overflow-hidden z-10" 
    : isPending
    ? "relative bg-white border-[3px] border-red-500 rounded-xl w-64 shadow-[6px_6px_0px_0px_#ef4444] flex flex-col overflow-hidden z-10"
    : "relative bg-white border-[3px] border-slate-900 rounded-xl w-64 shadow-[4px_4px_0px_0px_#0f172a] flex flex-col overflow-hidden z-10";

  return (
    <div className={cardCls}>
      <div className="p-3 flex-1 flex flex-col justify-center gap-2">
        {isFinal && (
          <div className="text-center pb-2 mb-2 border-b-2 border-slate-100 flex flex-col items-center">
            <Trophy className="w-6 h-6 text-red-600 mb-1" />
            <span className="font-black text-slate-900 uppercase tracking-wide text-sm">COPA BICENTENARIO</span>
          </div>
        )}

        <div className="flex justify-between items-center bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
          <span className={`font-bold text-xs truncate max-w-[140px] uppercase ${isPending ? 'text-slate-900 flex items-center gap-2' : 'text-slate-900'}`}>
            {isPending && <span className="w-2 h-2 rounded-full bg-red-500 block" />}
            {p.local_nombre || "POR DEFINIR"}
          </span>
          <span className="bg-slate-900 text-white font-black text-xs px-2 py-1 rounded shadow-sm">
            {rl}
          </span>
        </div>

        {isFinal && <div className="text-center text-red-600 font-black text-sm my-1">VS</div>}

        <div className="flex justify-between items-center bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
          <span className="font-bold text-slate-500 text-xs truncate max-w-[140px] uppercase">
            {p.visitante_nombre || "POR DEFINIR"}
          </span>
          <span className="bg-slate-200 text-slate-600 font-black text-xs px-2 py-1 rounded shadow-sm">
            {rv}
          </span>
        </div>
      </div>

      <div className="p-2 bg-slate-50 border-t-2 border-slate-200 flex justify-between items-center">
        {p.estado === "programado" ? (
          <div className="w-full">
            {p.fecha_hora ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 bg-white px-2 py-1 border border-slate-200 rounded">
                  {fmtFecha(p.fecha_hora)}
                </span>
                <button onClick={onRegistrar} className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1.5 rounded hover:bg-slate-800 flex items-center gap-1">
                  <ClipboardCheck className="w-3 h-3" /> RESULTADO
                </button>
              </div>
            ) : (
              <button onClick={onEditar} className="w-full bg-slate-900 text-white text-xs font-black uppercase py-2 rounded hover:bg-slate-800 transition shadow-[2px_2px_0px_0px_#000]">
                PROGRAMAR FECHA
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Clock className="w-3 h-3" /> FINALIZADO
            </span>
            <div className="flex gap-1">
              <button onClick={onCorregir} className="p-1.5 bg-amber-100 text-amber-700 rounded hover:bg-amber-200" title="Corregir">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {isFinal && !p.sede_nombre && (
        <div className="p-2 bg-white">
          <button onClick={onEditar} className="w-full bg-red-600 text-white text-xs font-black uppercase py-2 rounded hover:bg-red-700 transition shadow-[2px_2px_0px_0px_#7f1d1d]">
            DEFINIR SEDE FINAL
          </button>
        </div>
      )}
    </div>
  );
}

function FilaPartido({ p, onRegistrar, onCorregir, onEditar }: {
  p: Partido;
  onRegistrar: () => void;
  onCorregir: () => void;
  onEditar: () => void;
}) {
  const jugado = p.estado !== "programado";
  const rl = p.resultado_local ?? 0;
  const rv = p.resultado_visitante ?? 0;
  const ganaLocal = jugado && rl > rv;
  const ganaVisita = jugado && rv > rl;
  const badge = ESTADO_BADGE[p.estado];
  const scoreBg = p.estado === "en_curso" ? "bg-amber-500" : "bg-slate-900";

  const nombreCls = (gana: boolean, pierde: boolean) =>
    gana ? "font-bold text-slate-900" : pierde ? "text-slate-400" : "font-semibold text-slate-700";

  return (
    <div className="px-4 sm:px-5 py-3 hover:bg-slate-50/60 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0">
          <span className={`flex-1 text-right text-sm truncate ${nombreCls(ganaLocal, jugado && ganaVisita)}`}>
            {p.local_nombre}
          </span>
          {jugado ? (
            <div className={`shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-white ${scoreBg}`}>
              <span className="text-base font-black tabular-nums w-5 text-center">{rl}</span>
              <span className="opacity-40 text-xs">–</span>
              <span className="text-base font-black tabular-nums w-5 text-center">{rv}</span>
            </div>
          ) : (
            <span className="shrink-0 text-xs font-bold text-slate-300 px-3 select-none">VS</span>
          )}
          <span className={`flex-1 text-left text-sm truncate ${nombreCls(ganaVisita, jugado && ganaLocal)}`}>
            {p.visitante_nombre}
          </span>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {(p.estado === "programado" || p.estado === "en_curso") && (
            <button onClick={onRegistrar}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition">
              <ClipboardCheck className="w-3.5 h-3.5" /><span className="hidden sm:inline">Registrar</span>
            </button>
          )}
          {p.estado === "finalizado" && (
            <button onClick={onCorregir}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-100 transition">
              <Pencil className="w-3.5 h-3.5" /><span className="hidden sm:inline">Corregir</span>
            </button>
          )}
          <button onClick={onEditar} title="Programar fecha, sede o estado"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <CalendarClock className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex items-center flex-wrap gap-x-2.5 gap-y-1 text-[11px]">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-semibold ${badge.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />{ESTADO_LABEL[p.estado]}
        </span>
        <span className="inline-flex items-center gap-1 text-slate-500">
          {p.fecha_hora ? <Clock className="w-3 h-3" /> : <CalendarOff className="w-3 h-3 text-slate-300" />}
          {fmtFecha(p.fecha_hora)}
        </span>
        {p.sede_nombre && (
          <span className="inline-flex items-center gap-1 text-slate-500">
            <MapPin className="w-3 h-3" />{p.sede_nombre}
          </span>
        )}
        {p.es_walkover && <span className="font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Walkover</span>}
        {p.reprogramado_en && (
          <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
            <RotateCcw className="w-3 h-3" />Reprogramado
          </span>
        )}
      </div>
    </div>
  );
}

export default function EncuentrosPage() {
  const searchParams = useSearchParams();
  const [vista, setVista] = useState<VistaTipo>("lista");
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [deporteFiltro, setDeporteFiltro] = useState<number | undefined>();
  const [torneoFiltro, setTorneoFiltro] = useState<number | undefined>(
    () => { const v = searchParams.get("torneo_id"); return v ? Number(v) : undefined; }
  );
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoPartido | "">("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [editModal, setEditModal] = useState<EditModal | null>(null);
  const [errorEdicion, setErrorEdicion] = useState("");
  const [correccionModal, setCorreccionModal] = useState<CorreccionModal | null>(null);
  const [registroModal, setRegistroModal] = useState<RegistroModal | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const [modalEventos, setModalEventos] = useState<EventoPartidoCreate[]>([]);
  const [atletasLocal, setAtletasLocal] = useState<AtletaJugador[]>([]);
  const [atletasVisitante, setAtletasVisitante] = useState<AtletaJugador[]>([]);
  const [cargandoAtletasModal, setCargandoAtletasModal] = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState<{
    equipoSelect: "local" | "visitante";
    atletaId: number;
    tipo: string;
    minuto: string;
    descripcion: string;
  }>({ equipoSelect: "local", atletaId: 0, tipo: "gol", minuto: "", descripcion: "" });

  const depMap = new Map(deportes.map(d => [d.id, d]));

  function esFutbolDelPartido(partido: Partido): boolean {
    const t = torneos.find(tor => tor.nombre === partido.torneo_nombre);
    if (!t) return false;
    const dep = depMap.get(t.deporte_id);
    if (!dep) return false;
    const name = dep.nombre.toLowerCase();
    return name.includes("fútbol") || name.includes("futbol");
  }

  async function cargarAtletasParaModal(p: Partido) {
    setAtletasLocal([]); setAtletasVisitante([]);
    setCargandoAtletasModal(true);
    try {
      const [atsL, atsV] = await Promise.all([
        p.local_club_equipo_id ? api.getAtletas(p.local_club_equipo_id) : Promise.resolve([]),
        p.visitante_club_equipo_id ? api.getAtletas(p.visitante_club_equipo_id) : Promise.resolve([]),
      ]);
      setAtletasLocal(atsL); setAtletasVisitante(atsV);
      if (atsL.length > 0) setNuevoEvento(prev => ({ ...prev, atletaId: atsL[0].id }));
    } catch { alert("Error al cargar los integrantes de los equipos."); }
    finally { setCargandoAtletasModal(false); }
  }

  async function abrirCorreccionModal(p: Partido) {
    setCorreccionModal({ partido: p, local: String(p.resultado_local ?? ""), visitante: String(p.resultado_visitante ?? "") });
    setModalEventos(p.eventos?.map(e => ({ atleta_jugador_id: e.atleta_jugador_id ?? 0, tipo_evento: e.tipo_evento, minuto: e.minuto || undefined, descripcion: e.descripcion || undefined })) ?? []);
    setNuevoEvento({ equipoSelect: "local", atletaId: 0, tipo: "gol", minuto: "", descripcion: "" });
    await cargarAtletasParaModal(p);
  }

  async function abrirRegistroModal(p: Partido) {
    setRegistroModal({ partido: p, local: "", visitante: "" });
    setModalEventos([]);
    setNuevoEvento({ equipoSelect: "local", atletaId: 0, tipo: "gol", minuto: "", descripcion: "" });
    await cargarAtletasParaModal(p);
  }

  function handleEquipoSelectChange(eq: "local" | "visitante") {
    const list = eq === "local" ? atletasLocal : atletasVisitante;
    setNuevoEvento(prev => ({ ...prev, equipoSelect: eq, atletaId: list.length > 0 ? list[0].id : 0 }));
  }

  function agregarEvento() {
    if (nuevoEvento.atletaId === 0) { alert("Por favor, selecciona un jugador."); return; }
    setModalEventos(prev => [...prev, { atleta_jugador_id: nuevoEvento.atletaId, tipo_evento: nuevoEvento.tipo, minuto: nuevoEvento.minuto ? Number(nuevoEvento.minuto) : null, descripcion: nuevoEvento.descripcion || null }]);
    if (nuevoEvento.tipo === "gol" && registroModal) {
      if (nuevoEvento.equipoSelect === "local") setRegistroModal(m => m ? { ...m, local: String(Number(m.local || 0) + 1) } : null);
      else setRegistroModal(m => m ? { ...m, visitante: String(Number(m.visitante || 0) + 1) } : null);
    }
    setNuevoEvento(prev => ({ ...prev, minuto: "", descripcion: "" }));
  }

  function eliminarEvento(index: number) {
    const ev = modalEventos[index];
    if (ev.tipo_evento === "gol" && registroModal) {
      const esLocal = atletasLocal.some(a => a.id === ev.atleta_jugador_id);
      if (esLocal) setRegistroModal(m => m ? { ...m, local: String(Math.max(0, Number(m.local || 0) - 1)) } : null);
      else setRegistroModal(m => m ? { ...m, visitante: String(Math.max(0, Number(m.visitante || 0) - 1)) } : null);
    }
    setModalEventos(prev => prev.filter((_, i) => i !== index));
  }

  function getNombreJugador(atletaId: number): string {
    const a = [...atletasLocal, ...atletasVisitante].find(item => item.id === atletaId);
    return a ? `${a.nombre_completo} (#${a.numero_camiseta ?? "—"})` : `Jugador #${atletaId}`;
  }

  const cargar = useCallback(async () => {
    setCargando(true); setError("");
    try {
      const [p, t, dep, s] = await Promise.all([
        api.getPartidos({ torneo_id: torneoFiltro, deporte_id: !torneoFiltro ? deporteFiltro : undefined }),
        api.getTorneos(), api.getDeportes(), api.getSedes(),
      ]);
      setPartidos(p); setTorneos(t); setDeportes(dep); setSedes(s);
    } catch { setError("No se pudo cargar los encuentros."); }
    finally { setCargando(false); }
  }, [torneoFiltro, deporteFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardarEdicion() {
    if (!editModal) return;
    setErrorEdicion("");
    const estaReprogramando = editModal.fechaOriginal && editModal.form.fecha_hora && editModal.form.fecha_hora.slice(0, 16) !== editModal.fechaOriginal.slice(0, 16);
    if (estaReprogramando && !editModal.form.motivo_reprogramacion?.trim()) {
      setErrorEdicion("Indica el motivo de la reprogramación: se avisará a las instituciones participantes.");
      return;
    }
    if (editModal.form.motivo_reprogramacion && editModal.form.motivo_reprogramacion.length > 500) {
      setErrorEdicion("El motivo no puede superar los 500 caracteres.");
      return;
    }
    setGuardando(true);
    try { await api.updatePartido(editModal.partido.id, editModal.form); setEditModal(null); await cargar(); }
    catch (e) { setErrorEdicion(e instanceof Error ? e.message : "No se pudo guardar el partido."); }
    finally { setGuardando(false); }
  }

  async function guardarCorreccion() {
    if (!correccionModal) return;
    const rl = Number(correccionModal.local), rv = Number(correccionModal.visitante);
    if (!Number.isInteger(rl) || !Number.isInteger(rv) || rl < 0 || rv < 0 || correccionModal.local === "" || correccionModal.visitante === "") { alert("Ingresa marcadores válidos (números enteros ≥ 0)."); return; }
    setGuardando(true);
    try { await api.setResultado(correccionModal.partido.id, { resultado_local: rl, resultado_visitante: rv, eventos: modalEventos }); setCorreccionModal(null); await cargar(); }
    catch (e) { alert(e instanceof Error ? e.message : "Error al corregir resultado"); }
    finally { setGuardando(false); }
  }

  async function guardarRegistro() {
    if (!registroModal) return;
    const esFut = esFutbolDelPartido(registroModal.partido);
    let rl: number, rv: number;
    if (esFut) {
      rl = modalEventos.filter(e => e.tipo_evento === "gol" && atletasLocal.some(a => a.id === e.atleta_jugador_id)).length;
      rv = modalEventos.filter(e => e.tipo_evento === "gol" && atletasVisitante.some(a => a.id === e.atleta_jugador_id)).length;
    } else {
      if (registroModal.local === "" || registroModal.visitante === "") { alert("Ingresa el marcador final del partido."); return; }
      rl = Number(registroModal.local);
      rv = Number(registroModal.visitante);
      if (rl < 0 || rv < 0) { alert("El marcador no puede ser negativo."); return; }
    }
    setGuardando(true);
    try { await api.setResultado(registroModal.partido.id, { resultado_local: rl, resultado_visitante: rv, eventos: modalEventos }); setRegistroModal(null); await cargar(); }
    catch (e) { alert(e instanceof Error ? e.message : "Error al guardar resultado"); }
    finally { setGuardando(false); }
  }

  const torneosFiltrados = deporteFiltro ? torneos.filter(t => t.deporte_id === deporteFiltro) : torneos;

  const torneosSuspendidosIds = new Set(torneos.filter(t => t.estado === "suspendido").map(t => t.id));
  const partidosBase = partidos.filter(p => {
    const torneo = torneos.find(t => t.nombre === p.torneo_nombre);
    return torneo && !torneosSuspendidosIds.has(torneo.id);
  });

  const cuenta = {
    todos: partidosBase.length,
    programado: partidosBase.filter(p => p.estado === "programado").length,
    en_curso: partidosBase.filter(p => p.estado === "en_curso").length,
    finalizado: partidosBase.filter(p => p.estado === "finalizado").length,
  };

  const term = busqueda.trim().toLowerCase();
  const partidosFiltrados = partidosBase.filter(p =>
    (!estadoFiltro || p.estado === estadoFiltro) &&
    (!term || p.local_nombre.toLowerCase().includes(term) || p.visitante_nombre.toLowerCase().includes(term))
  );

  const chips: { key: EstadoPartido | ""; label: string; n: number; active: string }[] = [
    { key: "",            label: "Todos",        n: cuenta.todos,      active: "bg-slate-900 text-white border-slate-900" },
    { key: "programado",  label: "Programados",  n: cuenta.programado, active: "bg-blue-600 text-white border-blue-600" },
    { key: "en_curso",    label: "En curso",     n: cuenta.en_curso,   active: "bg-amber-500 text-white border-amber-500" },
    { key: "finalizado",  label: "Finalizados",  n: cuenta.finalizado, active: "bg-emerald-600 text-white border-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Administración</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">Encuentros</h1>
          <p className="text-sm text-slate-400 mt-0.5">Programación, registro de resultados y seguimiento de partidos.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setVista("lista")}
              className={`px-3 py-1.5 flex items-center gap-1.5 rounded-md text-sm font-semibold transition ${
                vista === "lista" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <LayoutList className="w-4 h-4" /> Lista
            </button>
            <button
              onClick={() => setVista("mapa")}
              className={`px-3 py-1.5 flex items-center gap-1.5 rounded-md text-sm font-semibold transition ${
                vista === "mapa" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <GitFork className="w-4 h-4" /> Mapa
            </button>
          </div>
          <button onClick={cargar} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
            <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {chips.map(c => {
          const sel = estadoFiltro === c.key;
          return (
            <button key={c.key || "todos"} onClick={() => setEstadoFiltro(c.key)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${sel ? c.active : "bg-white border-slate-100 hover:border-slate-200 shadow-sm"}`}>
              <span className={`text-xs font-semibold ${sel ? "" : "text-slate-500"}`}>{c.label}</span>
              <span className={`text-xl font-black tabular-nums ${sel ? "" : "text-slate-900"}`}>{c.n}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por equipo…"
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-700" />
        </div>
        <select value={deporteFiltro ?? ""} onChange={e => { setDeporteFiltro(e.target.value ? Number(e.target.value) : undefined); setTorneoFiltro(undefined); }}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-slate-700">
          <option value="">Todos los deportes</option>
          {deportes.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
        <select value={torneoFiltro ?? ""} onChange={e => setTorneoFiltro(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-slate-700">
          <option value="">Todos los torneos</option>
          {torneosFiltrados.filter(t => t.estado !== "suspendido").map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        {(busqueda || estadoFiltro || deporteFiltro || torneoFiltro) && (
          <button onClick={() => { setBusqueda(""); setEstadoFiltro(""); setDeporteFiltro(undefined); setTorneoFiltro(undefined); }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
            <X className="w-3.5 h-3.5" />Limpiar
          </button>
        )}
        {!cargando && <span className="ml-auto text-xs text-slate-400">{partidosFiltrados.length} encuentro{partidosFiltrados.length !== 1 ? "s" : ""}</span>}
      </div>

      {cargando ? (
        <div className="flex items-center justify-center h-40 text-sm text-slate-400">Cargando...</div>
      ) : partidosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-44 text-slate-300 gap-2 bg-white rounded-xl border border-dashed border-slate-200">
          <Calendar className="w-9 h-9" strokeWidth={1.5} />
          <p className="text-sm text-slate-400">Sin partidos para los filtros seleccionados</p>
        </div>
      ) : (() => {
        const porTorneo = new Map<string, Partido[]>();
        for (const p of partidosFiltrados) {
          const k = p.torneo_nombre ?? "—";
          if (!porTorneo.has(k)) porTorneo.set(k, []);
          porTorneo.get(k)!.push(p);
        }
        const soloUnTorneo = porTorneo.size === 1;

        return (
          <div className="space-y-3">
            {Array.from(porTorneo.entries()).map(([torneoNombre, ps]) => {
              const abierto = soloUnTorneo || expandidos.has(torneoNombre);
              const progCount = ps.filter(p => p.estado === "programado").length;
              const cursoCount = ps.filter(p => p.estado === "en_curso").length;
              const finCount = ps.filter(p => p.estado === "finalizado").length;
              const pct = ps.length ? Math.round((finCount / ps.length) * 100) : 0;

              const porRonda = new Map<string, Partido[]>();
              for (const p of ps) {
                const k = p.ronda ?? `Jornada ${p.jornada}`;
                if (!porRonda.has(k)) porRonda.set(k, []);
                porRonda.get(k)!.push(p);
              }

              return (
                <div key={torneoNombre} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => {
                      if (soloUnTorneo) return;
                      setExpandidos(prev => {
                        const n = new Set(prev);
                        if (n.has(torneoNombre)) n.delete(torneoNombre);
                        else n.add(torneoNombre);
                        return n;
                      });
                    }}
                    className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${soloUnTorneo ? "" : "hover:bg-slate-50/80 cursor-pointer"}`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                      <Trophy className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{torneoNombre}</p>
                      <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                        <span className="text-[11px] text-slate-400">{ps.length} partido{ps.length !== 1 ? "s" : ""}</span>
                        {finCount > 0 && <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">{finCount} finalizado{finCount !== 1 ? "s" : ""}</span>}
                        {cursoCount > 0 && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full animate-pulse">{cursoCount} en curso</span>}
                        {progCount > 0 && <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">{progCount} programado{progCount !== 1 ? "s" : ""}</span>}
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[11px] font-semibold text-slate-500 tabular-nums">{finCount}/{ps.length} jugados</span>
                      <div className="h-1.5 w-28 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    {!soloUnTorneo && (
                      <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`} />
                    )}
                  </button>

                  {abierto && (
                    <div className="border-t border-slate-100 bg-slate-50/30">
                      
                      {vista === "lista" ? (
                        <div>
                          {Array.from(porRonda.entries()).map(([ronda, rps]) => (
                            <div key={ronda}>
                              <div className="flex items-center gap-2 px-5 pt-3 pb-1 bg-slate-50/80">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0">{ronda}</span>
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-[10px] text-slate-400 shrink-0">{rps.length}</span>
                              </div>
                              <div className="divide-y divide-slate-100">
                                {rps.map(p => (
                                  <FilaPartido
                                    key={p.id}
                                    p={p}
                                    onRegistrar={() => abrirRegistroModal(p)}
                                    onCorregir={() => abrirCorreccionModal(p)}
                                    onEditar={() => { setErrorEdicion(""); setEditModal({ partido: p, form: { sede_id: p.sede_id ?? undefined, fecha_hora: p.fecha_hora ?? undefined, estado: p.estado }, fechaOriginal: p.fecha_hora }); }}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="overflow-x-auto p-8 relative flex gap-12 bg-slate-50/50 min-h-[500px]">
                          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>
                          
                          {Array.from(porRonda.entries()).map(([ronda, rps], colIndex, arr) => {
                            const isLast = colIndex === arr.length - 1;
                            return (
                              <div key={ronda} className="relative flex flex-col items-center flex-shrink-0 gap-8 min-w-[260px] z-10">
                                <div className="bg-slate-900 text-white text-xs font-black uppercase px-4 py-1.5 rounded-full shadow-sm mb-2">
                                  {ronda}
                                </div>
                                
                                <div className="flex flex-col gap-10 flex-1 justify-around w-full items-center">
                                  {rps.map((p, i) => (
                                    <div key={p.id} className="relative w-full flex justify-center group">
                                      <PartidoBracket
                                        p={p}
                                        onRegistrar={() => abrirRegistroModal(p)}
                                        onCorregir={() => abrirCorreccionModal(p)}
                                        onEditar={() => { setErrorEdicion(""); setEditModal({ partido: p, form: { sede_id: p.sede_id ?? undefined, fecha_hora: p.fecha_hora ?? undefined, estado: p.estado }, fechaOriginal: p.fecha_hora }); }}
                                      />
                                      {!isLast && (
                                        <div className="hidden md:block absolute top-1/2 -right-6 w-6 border-t-[3px] border-r-[3px] border-slate-300 h-[calc(50%+20px)] rounded-tr-lg translate-y-[-50%] group-last:border-r-0 group-last:border-b-[3px] group-last:rounded-tr-none group-last:rounded-br-lg group-last:translate-y-[-100%]" />
                                      )}
                                      {colIndex !== 0 && (
                                        <div className="hidden md:block absolute top-1/2 -left-6 w-6 border-t-[3px] border-slate-300 h-0" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* MODAL EDICIÓN */}
      {editModal && (() => {
        const fechaVal = editModal.form.fecha_hora ? editModal.form.fecha_hora.slice(0, 16) : "";
        const fechaOrig = editModal.fechaOriginal ? editModal.fechaOriginal.slice(0, 16) : "";
        const esNuevo = !fechaOrig;
        const esReprog = !!fechaOrig && !!fechaVal && fechaVal !== fechaOrig;
        const enPasado = !!fechaVal && new Date(fechaVal).getTime() < Date.now();
        const motivoLen = editModal.form.motivo_reprogramacion?.length ?? 0;
        const update = (cambio: Partial<PartidoUpdate>) =>
          setEditModal(m => m ? { ...m, form: { ...m.form, ...cambio } } : null);
        return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{esNuevo ? "Programar partido" : "Editar partido"}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{editModal.partido.local_nombre} vs {editModal.partido.visitante_nombre}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-400 mb-4">Todos los campos son opcionales: completa lo que ya sepas del encuentro.</p>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Fecha y hora
                </label>
                <input
                  type="datetime-local"
                  value={fechaVal}
                  onChange={e => update({ fecha_hora: e.target.value || undefined })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                {enPasado ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> La fecha elegida ya pasó. Verifica que sea correcta.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">Cuándo inicia el encuentro. Déjalo vacío si está «por confirmar».</p>
                )}
              </div>

              {esReprog && (
                <div>
                  <label className="block text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1.5">
                    Motivo de reprogramación <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editModal.form.motivo_reprogramacion ?? ""}
                    onChange={e => update({ motivo_reprogramacion: e.target.value })}
                    maxLength={500} rows={3}
                    placeholder="Ej. Cambio de instalación por mantenimiento…"
                    className="w-full px-3 py-2.5 text-sm border border-amber-200 rounded-lg bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-amber-600">Se notificará a las instituciones participantes.</span>
                    <span className="text-slate-400">{motivoLen}/500</span>
                  </div>
                </div>
              )}

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Sede / Ubicación <span className="text-slate-300 normal-case font-normal tracking-normal">(opcional)</span>
                </label>
                <select
                  value={editModal.form.sede_id ?? ""}
                  onChange={e => update({ sede_id: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Sin sede asignada</option>
                  {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre_sede} — {s.ciudad}</option>)}
                </select>
                <p className="mt-1 text-xs text-slate-400">Dónde se jugará el partido.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Estado</label>
                <select
                  value={editModal.form.estado ?? "programado"}
                  onChange={e => update({ estado: e.target.value as EstadoPartido })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {(["programado", "en_curso"] as EstadoPartido[]).map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  «Programado»: aún no empieza · «En curso»: en juego. Para finalizar, usa «Registrar resultado» en la lista.
                </p>
              </div>

              {editModal.partido.reprogramado_en && editModal.partido.motivo_reprogramacion && (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500">
                  <p className="font-semibold text-slate-600 mb-0.5">Última reprogramación</p>
                  <p>{editModal.partido.motivo_reprogramacion}</p>
                </div>
              )}

              {errorEdicion && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{errorEdicion}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition">Cancelar</button>
              <button onClick={guardarEdicion} disabled={guardando} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50">
                {guardando ? "Guardando…" : esNuevo ? "Programar partido" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* MODAL CORRECCIÓN */}
      {correccionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Corregir Resultado</h3>
                <p className="text-xs text-slate-400 mt-0.5">{correccionModal.partido.torneo_nombre} · {correccionModal.partido.ronda ?? `Jornada ${correccionModal.partido.jornada}`}</p>
              </div>
              <button onClick={() => setCorreccionModal(null)} className="text-slate-400 hover:text-slate-600 transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Al guardar se revertirán los puntos anteriores y se recalcularán automáticamente.
              </p>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/50 flex items-center justify-center gap-6">
                <div className="text-right flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{correccionModal.partido.local_nombre}</p>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Local</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <input type="number" min={0} max={99} value={correccionModal.local}
                    onChange={e => setCorreccionModal(m => m ? { ...m, local: e.target.value } : null)}
                    className="w-14 text-center text-xl font-bold text-slate-900 border border-slate-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  <span className="text-slate-300 font-bold text-xl">—</span>
                  <input type="number" min={0} max={99} value={correccionModal.visitante}
                    onChange={e => setCorreccionModal(m => m ? { ...m, visitante: e.target.value } : null)}
                    className="w-14 text-center text-xl font-bold text-slate-900 border border-slate-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{correccionModal.partido.visitante_nombre}</p>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Visitante</p>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-amber-600" />Eventos ({modalEventos.length})
                </h4>
                {cargandoAtletasModal ? (
                  <div className="text-center py-4 text-sm text-slate-400">Cargando plantillas...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">Equipo</label>
                      <select value={nuevoEvento.equipoSelect} onChange={e => handleEquipoSelectChange(e.target.value as "local" | "visitante")}
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                        <option value="local">{correccionModal.partido.local_nombre}</option>
                        <option value="visitante">{correccionModal.partido.visitante_nombre}</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">Jugador</label>
                      <select value={nuevoEvento.atletaId} onChange={e => setNuevoEvento(prev => ({ ...prev, atletaId: Number(e.target.value) }))}
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                        {(nuevoEvento.equipoSelect === "local" ? atletasLocal : atletasVisitante).map(a => (
                          <option key={a.id} value={a.id}>{a.nombre_completo} {a.numero_camiseta ? `(#${a.numero_camiseta})` : ""}</option>
                        ))}
                        {(nuevoEvento.equipoSelect === "local" ? atletasLocal : atletasVisitante).length === 0 && <option value="0">Sin jugadores</option>}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">Tipo</label>
                      <select value={nuevoEvento.tipo} onChange={e => setNuevoEvento(prev => ({ ...prev, tipo: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                        {esFutbolDelPartido(correccionModal.partido) ? (
                          <><option value="gol">Gol</option><option value="tarjeta_amarilla">Tarjeta Amarilla</option><option value="tarjeta_roja">Tarjeta Roja</option></>
                        ) : (
                          <option value="puntos">Puntos anotados</option>
                        )}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">Minuto</label>
                      <input type="number" min={1} max={120} placeholder="Ej. 45" value={nuevoEvento.minuto}
                        onChange={e => setNuevoEvento(prev => ({ ...prev, minuto: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase">Descripción</label>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Ej. Penal / Falta fuerte" maxLength={100} value={nuevoEvento.descripcion}
                          onChange={e => setNuevoEvento(prev => ({ ...prev, descripcion: e.target.value }))}
                          className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        <button type="button" onClick={agregarEvento}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition">
                          <Plus className="w-3.5 h-3.5" />Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {modalEventos.length === 0 ? (
                  <div className="text-center py-5 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">Sin eventos registrados</div>
                ) : (
                  <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50 shadow-sm">
                    {modalEventos.map((ev, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50/50 transition">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ev.tipo_evento === "gol" || ev.tipo_evento === "puntos" ? "bg-green-100 text-green-700" : ev.tipo_evento === "tarjeta_amarilla" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                            {ev.tipo_evento === "gol" ? "GOL" : ev.tipo_evento === "puntos" ? "PTS" : ev.tipo_evento === "tarjeta_amarilla" ? "TA" : "TR"}
                          </span>
                          <span className="font-semibold text-slate-900">{getNombreJugador(ev.atleta_jugador_id)}</span>
                          {ev.minuto != null && <span className="text-slate-400">{ev.minuto}&apos;</span>}
                          {ev.descripcion && <span className="text-slate-400 italic">({ev.descripcion})</span>}
                        </div>
                        <button type="button" onClick={() => eliminarEvento(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
              <button type="button" onClick={() => setCorreccionModal(null)} className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-lg text-sm hover:bg-slate-100 transition">Cancelar</button>
              <button type="button" onClick={guardarCorreccion} disabled={guardando || correccionModal.local === "" || correccionModal.visitante === ""}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white font-semibold rounded-lg text-sm transition inline-flex items-center gap-1.5">
                <Save className="w-4 h-4" />{guardando ? "Guardando..." : "Confirmar corrección"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRO */}
      {registroModal && (() => {
        const esFut = esFutbolDelPartido(registroModal.partido);
        const golesL = modalEventos.filter(e => e.tipo_evento === "gol" && atletasLocal.some(a => a.id === e.atleta_jugador_id)).length;
        const golesV = modalEventos.filter(e => e.tipo_evento === "gol" && atletasVisitante.some(a => a.id === e.atleta_jugador_id)).length;
        const tiposEvento = esFut
          ? [
              { key: "gol",              icon: "⚽", label: "Gol",       active: "bg-emerald-600 text-white border-emerald-600" },
              { key: "tarjeta_amarilla", icon: "🟨", label: "T. Amarilla", active: "bg-amber-400 text-white border-amber-400" },
              { key: "tarjeta_roja",     icon: "🟥", label: "T. Roja", active: "bg-red-600 text-white border-red-600" },
            ]
          : [{ key: "puntos", icon: "🏀", label: "Puntos", active: "bg-blue-600 text-white border-blue-600" }];
        const atletasActivos = nuevoEvento.equipoSelect === "local" ? atletasLocal : atletasVisitante;

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-8">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {registroModal.partido.local_nombre} vs {registroModal.partido.visitante_nombre}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {registroModal.partido.torneo_nombre} · {registroModal.partido.ronda ?? `Jornada ${registroModal.partido.jornada}`}
                  </p>
                </div>
                <button onClick={() => setRegistroModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
                <div className="bg-slate-900 rounded-2xl px-5 py-4 flex items-center gap-3">
                  <p className="flex-1 text-sm font-bold text-white text-right truncate leading-tight">
                    {registroModal.partido.local_nombre}
                    <span className="block text-[10px] font-normal text-white/40 uppercase tracking-wider">Local</span>
                  </p>
                  <div className="shrink-0 flex items-center gap-2">
                    <input
                      type="number" min={0} max={99}
                      value={esFut ? Math.max(Number(registroModal.local || 0), golesL) : registroModal.local}
                      onChange={e => setRegistroModal(m => m ? { ...m, local: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) } : null)}
                      placeholder="0"
                      className={scoreInputCls}
                      disabled={esFut}
                    />
                    <span className="text-white/20 font-black text-2xl select-none">–</span>
                    <input
                      type="number" min={0} max={99}
                      value={esFut ? Math.max(Number(registroModal.visitante || 0), golesV) : registroModal.visitante}
                      onChange={e => setRegistroModal(m => m ? { ...m, visitante: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) } : null)}
                      placeholder="0"
                      className={scoreInputCls}
                      disabled={esFut}
                    />
                  </div>
                  <p className="flex-1 text-sm font-bold text-white text-left truncate leading-tight">
                    {registroModal.partido.visitante_nombre}
                    <span className="block text-[10px] font-normal text-white/40 uppercase tracking-wider">Visitante</span>
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold text-slate-800">Eventos</span>
                    <span className="text-xs text-slate-400">· opcional</span>
                  </div>
                  {cargandoAtletasModal ? (
                    <div className="text-center py-6 text-sm text-slate-400 bg-slate-50 rounded-xl">Cargando jugadores...</div>
                  ) : (
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                      <div className="flex gap-2">
                        {(["local", "visitante"] as const).map(eq => (
                          <button
                            key={eq}
                            onClick={() => handleEquipoSelectChange(eq)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg border-2 transition ${
                              nuevoEvento.equipoSelect === eq
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                            }`}
                          >
                            {eq === "local" ? registroModal.partido.local_nombre : registroModal.partido.visitante_nombre}
                            <span className={`block text-[9px] uppercase tracking-widest font-semibold mt-0.5 ${nuevoEvento.equipoSelect === eq ? "text-white/50" : "text-slate-400"}`}>
                              {eq}
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        {tiposEvento.map(t => (
                          <button
                            key={t.key}
                            onClick={() => setNuevoEvento(prev => ({ ...prev, tipo: t.key }))}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg border-2 transition flex items-center justify-center gap-1 ${
                              nuevoEvento.tipo === t.key
                                ? t.active
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                            }`}
                          >
                            <span>{t.icon}</span>
                            <span>{t.label}</span>
                          </button>
                        ))}
                      </div>
                      <select
                        value={nuevoEvento.atletaId}
                        onChange={e => setNuevoEvento(prev => ({ ...prev, atletaId: Number(e.target.value) }))}
                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        {atletasActivos.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.nombre_completo}{a.numero_camiseta ? ` · #${a.numero_camiseta}` : ""}{a.posicion_rol ? ` · ${a.posicion_rol}` : ""}
                          </option>
                        ))}
                        {atletasActivos.length === 0 && <option value="0">Sin jugadores registrados</option>}
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="number" min={1} max={120} placeholder="Min."
                          value={nuevoEvento.minuto}
                          onChange={e => setNuevoEvento(prev => ({ ...prev, minuto: e.target.value }))}
                          className="w-16 text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <input
                          type="text" maxLength={60} placeholder="Nota opcional (Ej. Tiro libre)"
                          value={nuevoEvento.descripcion}
                          onChange={e => setNuevoEvento(prev => ({ ...prev, descripcion: e.target.value }))}
                          className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                        <button
                          onClick={agregarEvento}
                          className="shrink-0 inline-flex items-center gap-1 px-3 py-2 bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition"
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {modalEventos.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Eventos agregados · {modalEventos.length}
                    </p>
                    {modalEventos.map((ev, idx) => {
                      const info = TIPO_INFO[ev.tipo_evento] ?? { label: ev.tipo_evento, bg: "bg-slate-400 text-white" };
                      return (
                        <div key={idx} className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition">
                          <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md ${info.bg}`}>{info.label}</span>
                          <span className="flex-1 text-xs font-semibold text-slate-900 truncate">{getNombreJugador(ev.atleta_jugador_id)}</span>
                          {ev.minuto != null && <span className="text-[11px] text-slate-500 shrink-0 font-medium">{ev.minuto}&apos;</span>}
                          {ev.descripcion && <span className="text-[11px] text-slate-400 italic shrink-0 hidden sm:block">{ev.descripcion}</span>}
                          <button
                            onClick={() => eliminarEvento(idx)}
                            className="shrink-0 p-1 rounded text-slate-300 hover:text-red-500 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  {esFut
                    ? <span className="text-emerald-600 font-semibold">✓ {golesL} – {golesV} · {modalEventos.length} evento{modalEventos.length !== 1 ? "s" : ""}</span>
                    : (registroModal.local !== "" && registroModal.visitante !== ""
                      ? <span className="text-emerald-600 font-semibold">✓ {registroModal.local} – {registroModal.visitante} · {modalEventos.length} evento{modalEventos.length !== 1 ? "s" : ""}</span>
                      : "Ingresa el marcador para continuar")
                  }
                </span>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setRegistroModal(null)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                    Cancelar
                  </button>
                  <button
                    onClick={guardarRegistro}
                    disabled={guardando || (!esFut && (registroModal.local === "" || registroModal.visitante === ""))}
                    className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg transition inline-flex items-center gap-2 shadow-sm"
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