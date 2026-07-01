"use client";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import {
  Shuffle, Trash2, ChevronRight, AlertCircle, CheckCircle2, Trophy, Swords,
  Users, Play, Flag, ArrowRight, Lock, Info, CalendarDays, ListChecks,
} from "lucide-react";
import { api } from "@/lib/api";
import { SelectorTorneo } from "@/components/SelectorTorneo";
import type { Torneo, Deporte, Fixture, Inscripcion, Partido } from "@/types/api";

type State = "idle" | "loading" | "success" | "error";

const FASES_ELIM = ["Cuartos de Final", "Semifinales", "Final"];

// Etapas del ciclo de vida del torneo, para el stepper guía.
const ETAPAS = [
  { key: "inscripcion", label: "Inscripción", icon: Users },
  { key: "sorteo", label: "Sorteo", icon: Shuffle },
  { key: "en_curso", label: "En juego", icon: Play },
  { key: "finalizado", label: "Finalizado", icon: Flag },
] as const;

function etapaActual(estado: string | undefined): number {
  switch (estado) {
    case "inscripcion_abierta":
    case "inscripcion_cerrada": return 0;
    case "en_sorteo": return 1;
    case "en_curso": return 2;
    case "finalizado": return 3;
    default: return 0;
  }
}

const TONOS: Record<string, { chip: string; icon: string; ring: string }> = {
  red:    { chip: "bg-red-50 text-red-700 border-red-100",       icon: "bg-red-600",    ring: "ring-red-100" },
  purple: { chip: "bg-purple-50 text-purple-700 border-purple-100", icon: "bg-purple-600", ring: "ring-purple-100" },
  amber:  { chip: "bg-amber-50 text-amber-800 border-amber-100",  icon: "bg-amber-500",  ring: "ring-amber-100" },
  blue:   { chip: "bg-blue-50 text-blue-800 border-blue-100",     icon: "bg-blue-600",   ring: "ring-blue-100" },
  green:  { chip: "bg-green-50 text-green-800 border-green-100",  icon: "bg-green-600",  ring: "ring-green-100" },
};

export default function SorteosPage() {
  const [torneos, setTorneos]             = useState<Torneo[]>([]);
  const [deportes, setDeportes]           = useState<Deporte[]>([]);
  const [torneoId, setTorneoId]           = useState<number | null>(null);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [fixtures, setFixtures]           = useState<Fixture[]>([]);
  const [partidos, setPartidos]           = useState<Partido[]>([]);
  const [state, setState]                 = useState<State>("idle");
  const [error, setError]                 = useState("");
  const [nClasificados, setNClasificados] = useState(4);
  const [estadoFase, setEstadoFase]       = useState<State>("idle");
  const [errorFase, setErrorFase]         = useState("");
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  useEffect(() => {
    api.getTorneos().then(setTorneos).catch(() => {});
    // Incluimos inactivos para poder mostrar el nombre del deporte de cualquier torneo.
    api.getDeportes(true).then(setDeportes).catch(() => {});
  }, []);

  function seleccionarTorneo(id: number | null) {
    setTorneoId(id);
    setState("idle"); setError(""); setEstadoFase("idle"); setErrorFase("");
    setFixtures([]); setInscripciones([]); setPartidos([]); setConfirmarEliminar(false);
  }

  const cargarDetalles = useCallback(async (id: number) => {
    const [insc, fix, parts] = await Promise.all([
      api.getInscripciones(id),
      api.getFixture(id),
      api.getPartidos({ torneo_id: id }),
    ]);
    setInscripciones(insc);
    setFixtures(fix);
    setPartidos(parts);
  }, []);

  useEffect(() => {
    if (!torneoId) return;
    cargarDetalles(torneoId).catch((e) => {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los detalles del torneo.");
      setState("error");
    });
  }, [torneoId, cargarDetalles]);

  async function generar() {
    if (!torneoId) return;
    setState("loading"); setError("");
    try {
      const result = await api.generarFixture(torneoId, fixtures.length > 0);
      setFixtures(result);
      await cargarDetalles(torneoId);
      setState("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al generar fixture");
      setState("error");
    }
  }

  async function eliminar() {
    if (!torneoId) return;
    setState("loading"); setError(""); setConfirmarEliminar(false);
    try {
      await api.deleteFixture(torneoId);
      setFixtures([]); setPartidos([]);
      setEstadoFase("idle"); setErrorFase("");
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el fixture.");
      setState("error");
    }
  }

  async function generarFaseElim() {
    if (!torneoId) return;
    setEstadoFase("loading"); setErrorFase("");
    try {
      await api.generarFaseEliminatoria(torneoId, nClasificados);
      await cargarDetalles(torneoId);
      setEstadoFase("success");
    } catch (e) {
      setErrorFase(e instanceof Error ? e.message : "Error al generar fase eliminatoria");
      setEstadoFase("error");
    }
  }

  async function generarSiguiente(fixtureId: number) {
    if (!torneoId) return;
    setEstadoFase("loading"); setErrorFase("");
    try {
      await api.generarSiguienteFase(torneoId, fixtureId);
      await cargarDetalles(torneoId);
      setEstadoFase("success");
    } catch (e) {
      setErrorFase(e instanceof Error ? e.message : "Error al generar siguiente fase");
      setEstadoFase("error");
    }
  }

  // ── Datos derivados ────────────────────────────────────────────────────────
  const torneo = torneos.find(t => t.id === torneoId) ?? null;
  const aprobados = inscripciones.filter(i => i.estado === "aprobado");
  const hayPendientes = inscripciones.length > 0 && aprobados.length === 0;

  const fixturasLiga = fixtures.filter(f => f.nombre_fase.startsWith("Jornada"));
  const fixturasElim = fixtures.filter(f => FASES_ELIM.includes(f.nombre_fase)).sort((a, b) => a.jornada - b.jornada);
  const ultimaFaseElim = fixturasElim.at(-1);
  const jornadasLiga = Array.from(new Set(fixturasLiga.map(f => f.jornada))).sort((a, b) => a - b);

  const partidosPorFixture = partidos.reduce<Record<number, number>>((acc, p) => { acc[p.fixture_id] = (acc[p.fixture_id] ?? 0) + 1; return acc; }, {});
  const finalizadosPorFixture = partidos.reduce<Record<number, number>>((acc, p) => { if (p.estado === "finalizado") acc[p.fixture_id] = (acc[p.fixture_id] ?? 0) + 1; return acc; }, {});

  const ultimaFaseCompleta =
    ultimaFaseElim != null &&
    (partidosPorFixture[ultimaFaseElim.id] ?? 0) > 0 &&
    (finalizadosPorFixture[ultimaFaseElim.id] ?? 0) === (partidosPorFixture[ultimaFaseElim.id] ?? 0);

  const puedeGenerarSiguiente = ultimaFaseCompleta && ultimaFaseElim?.nombre_fase !== "Final";
  const torneoElimFinalizado  = ultimaFaseCompleta && ultimaFaseElim?.nombre_fase === "Final";
  const torneoTieneLiga       = fixturasLiga.length > 0;
  const esEliminacionSimple   = torneo?.formato === "eliminacion_simple";
  const estadoOk_Sorteo       = torneo?.estado === "en_sorteo";
  const estadoOk_EnCurso      = torneo?.estado === "en_curso";
  const puedeGenerarFaseElim  = estadoOk_EnCurso && fixturasElim.length === 0 && (torneoTieneLiga || esEliminacionSimple);

  const paso = etapaActual(torneo?.estado);
  const suspendido = torneo?.estado === "suspendido";

  const deporteNombre = (id: number) => deportes.find(d => d.id === id)?.nombre ?? "Deporte";

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Administración</p>
        <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">Sorteos y Fixtures</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Arma el calendario de cada torneo paso a paso: sorteo de liga y/o llaves eliminatorias.
        </p>
      </div>

      {/* Selector de torneo */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-5">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Torneo a gestionar
        </label>
        {torneos.length === 0 ? (
          <p className="py-2 text-sm text-slate-400">
            No hay torneos creados.{" "}
            <Link href="/admin/torneos" className="font-semibold text-red-600 hover:text-red-700">Crear uno →</Link>
          </p>
        ) : (
          <SelectorTorneo
            torneos={torneos}
            deporteNombre={deporteNombre}
            value={torneoId}
            onChange={seleccionarTorneo}
          />
        )}
      </div>

      {!torneoId ? (
        <EmptyState />
      ) : (
        <>
          {/* Stepper del proceso */}
          {suspendido ? (
            <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-800">
              <AlertCircle className="w-4 h-4" />
              Este torneo está suspendido. Reactívalo en{" "}
              <Link href="/admin/torneos" className="underline">Torneos</Link> para continuar.
            </div>
          ) : (
            <Stepper paso={paso} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna principal: acción + fixtures */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tarjeta de acción recomendada */}
              {!suspendido && renderAccion()}

              {/* Fixtures generados */}
              {fixtures.length > 0 && (
                <div className="space-y-5">
                  {jornadasLiga.length > 0 && (
                    <section>
                      <SectionTitle icon={<CalendarDays className="w-4 h-4 text-slate-400" />}>
                        Fase de Liga · {jornadasLiga.length} jornada{jornadasLiga.length !== 1 ? "s" : ""}
                      </SectionTitle>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {jornadasLiga.map(jornada => {
                          const fix = fixturasLiga.find(f => f.jornada === jornada);
                          const total = fix ? (partidosPorFixture[fix.id] ?? 0) : 0;
                          const fin = fix ? (finalizadosPorFixture[fix.id] ?? 0) : 0;
                          return (
                            <FixtureCard
                              key={jornada}
                              titulo={fix?.nombre_fase ?? `Jornada ${jornada}`}
                              tone="gray"
                              total={total}
                              finalizados={fin}
                              torneoId={torneoId}
                            />
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {fixturasElim.length > 0 && (
                    <section>
                      <SectionTitle icon={<Trophy className="w-4 h-4 text-purple-400" />}>
                        {esEliminacionSimple ? "Bracket Eliminatorio" : "Fase Eliminatoria"}
                      </SectionTitle>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {fixturasElim.map(fix => (
                          <FixtureCard
                            key={fix.id}
                            titulo={fix.nombre_fase}
                            tone="purple"
                            total={partidosPorFixture[fix.id] ?? 0}
                            finalizados={finalizadosPorFixture[fix.id] ?? 0}
                            torneoId={torneoId}
                          />
                        ))}
                      </div>
                      {torneoElimFinalizado && (
                        <div className="mt-3 flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-sm font-semibold text-green-800">
                          <Trophy className="w-5 h-5 text-green-600" />
                          ¡La Final concluyó! El torneo eliminatorio está completo.
                        </div>
                      )}
                    </section>
                  )}
                </div>
              )}
            </div>

            {/* Columna lateral: resumen + equipos */}
            <aside className="space-y-6">
              <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Resumen</h3>
                <dl className="space-y-2.5 text-sm">
                  <ResumenRow label="Formato" value={(torneo?.formato ?? "—").replace(/_/g, " ")} />
                  <ResumenRow label="Equipos aprobados" value={String(aprobados.length)} />
                  <ResumenRow label="Jornadas de liga" value={jornadasLiga.length > 0 ? String(jornadasLiga.length) : "—"} />
                  <ResumenRow label="Fases eliminatorias" value={fixturasElim.length > 0 ? String(fixturasElim.length) : "—"} />
                  <ResumenRow label="Partidos generados" value={partidos.length > 0 ? String(partidos.length) : "—"} highlight={partidos.length > 0} />
                </dl>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Equipos aprobados</h3>
                  <span className="text-xs font-semibold text-slate-400">{aprobados.length}</span>
                </div>
                {aprobados.length === 0 ? (
                  <div className="text-sm text-slate-400">
                    <p>{hayPendientes ? "Hay inscripciones pendientes de aprobar." : "Aún no hay equipos aprobados."}</p>
                    <Link href="/admin/inscripciones" className="mt-2 inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-700">
                      Ir a Inscripciones <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {aprobados.map(insc => (
                      <li key={insc.id} className="flex items-center gap-2 text-sm text-slate-600">
                        <ChevronRight className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate">{insc.club_equipo?.nombre_equipo ?? `Equipo #${insc.club_equipo_id}`}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );

  // ── Render de la "acción recomendada" según el estado del torneo ───────────
  function renderAccion(): ReactNode {
    // 1) Sin equipos aprobados → no se puede sortear nada.
    if (aprobados.length === 0) {
      return (
        <ActionShell tone="amber" icon={<Users className="w-5 h-5 text-white" />} titulo="Primero aprueba equipos"
          descripcion={hayPendientes
            ? "Hay inscripciones pendientes. Apruébalas para poder sortear."
            : "Aún no hay equipos inscritos y aprobados en este torneo."}>
          <LinkBtn href="/admin/inscripciones">Ir a Inscripciones</LinkBtn>
        </ActionShell>
      );
    }

    // 2) Torneo aún en fase de inscripción → hay que avanzarlo.
    if (!estadoOk_Sorteo && !estadoOk_EnCurso) {
      return (
        <ActionShell tone="blue" icon={<Lock className="w-5 h-5 text-white" />} titulo="Avanza el torneo para sortear"
          descripcion={esEliminacionSimple
            ? "La eliminación directa arma el bracket cuando el torneo está «En curso». Avánzalo desde Torneos."
            : "El sorteo de liga se genera con el torneo en estado «En sorteo». Avánzalo desde Torneos."}>
          <LinkBtn href="/admin/torneos">Ir a Torneos</LinkBtn>
        </ActionShell>
      );
    }

    // 3) En sorteo.
    if (estadoOk_Sorteo) {
      if (esEliminacionSimple) {
        return (
          <ActionShell tone="blue" icon={<Play className="w-5 h-5 text-white" />} titulo="Avanza a «En curso»"
            descripcion="Este torneo es de eliminación directa: el bracket se genera cuando el torneo está en curso.">
            <LinkBtn href="/admin/torneos">Ir a Torneos</LinkBtn>
          </ActionShell>
        );
      }
      const pocos = aprobados.length < 2;
      return (
        <ActionShell tone="red" icon={<Shuffle className="w-5 h-5 text-white" />}
          titulo={fixtures.length > 0 ? "Fixture de liga generado" : "Genera el fixture de liga"}
          descripcion={fixtures.length > 0
            ? "Ya existe un calendario. Puedes regenerarlo (se borran los partidos actuales) o eliminarlo."
            : "Se creará el calendario todos-contra-todos con los equipos aprobados."}>
          <Banner state={state} error={error} okMsg="Fixture de liga generado correctamente." />
          {pocos && <Hint>Se necesitan al menos 2 equipos aprobados (hay {aprobados.length}).</Hint>}
          <div className="flex flex-wrap gap-2 mt-1">
            <button onClick={generar} disabled={state === "loading" || pocos}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50">
              <Shuffle className="w-4 h-4" />
              {state === "loading" ? "Generando…" : fixtures.length > 0 ? "Regenerar fixture" : "Generar fixture de liga"}
            </button>
            {fixtures.length > 0 && (confirmarEliminar ? (
              <span className="inline-flex items-center gap-2">
                <button onClick={eliminar} className="px-3 py-2.5 text-sm font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition">Sí, eliminar</button>
                <button onClick={() => setConfirmarEliminar(false)} className="px-3 py-2.5 text-sm font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Cancelar</button>
              </span>
            ) : (
              <button onClick={() => setConfirmarEliminar(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition">
                <Trash2 className="w-4 h-4" /> Eliminar fixture
              </button>
            ))}
          </div>
        </ActionShell>
      );
    }

    // 4) En curso.
    if (torneoElimFinalizado) {
      return (
        <ActionShell tone="green" icon={<Trophy className="w-5 h-5 text-white" />} titulo="Torneo eliminatorio completo"
          descripcion="Todas las llaves se jugaron. Revisa los resultados finales en Encuentros.">
          <LinkBtn href={`/admin/encuentros?torneo_id=${torneoId}`}>Ver encuentros</LinkBtn>
        </ActionShell>
      );
    }
    if (puedeGenerarSiguiente && ultimaFaseElim) {
      return (
        <ActionShell tone="purple" icon={<Swords className="w-5 h-5 text-white" />} titulo="Genera la siguiente fase"
          descripcion={`La fase «${ultimaFaseElim.nombre_fase}» terminó. Crea la siguiente llave con los ganadores.`}>
          <Banner state={estadoFase} error={errorFase} okMsg="Fase generada correctamente." />
          <button onClick={() => generarSiguiente(ultimaFaseElim.id)} disabled={estadoFase === "loading"}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition disabled:opacity-50">
            <Swords className="w-4 h-4" />
            {estadoFase === "loading" ? "Generando…" : "Generar siguiente fase"}
          </button>
        </ActionShell>
      );
    }
    if (puedeGenerarFaseElim) {
      const faltan = aprobados.length < nClasificados;
      return (
        <ActionShell tone="purple" icon={<Trophy className="w-5 h-5 text-white" />}
          titulo={esEliminacionSimple ? "Genera el bracket eliminatorio" : "Genera la fase eliminatoria"}
          descripcion="Elige cuántos equipos clasifican; se sembrarán por su posición en la tabla.">
          <Banner state={estadoFase} error={errorFase} okMsg="Fase generada correctamente." />
          <div className="flex flex-wrap items-end gap-2 mt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Clasificados</label>
              <select value={nClasificados} onChange={e => setNClasificados(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value={2}>2 — Final directa</option>
                <option value={4}>4 — Semifinales</option>
                <option value={8}>8 — Cuartos de Final</option>
              </select>
            </div>
            <button onClick={generarFaseElim} disabled={estadoFase === "loading" || faltan}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition disabled:opacity-50">
              <Trophy className="w-4 h-4" />
              {estadoFase === "loading" ? "Generando…" : "Generar fase"}
            </button>
          </div>
          {faltan && <Hint>Necesitas {nClasificados} equipos aprobados (hay {aprobados.length}).</Hint>}
        </ActionShell>
      );
    }
    // En curso, liga en juego, fase eliminatoria a mitad o sin opción todavía.
    return (
      <ActionShell tone="green" icon={<Play className="w-5 h-5 text-white" />} titulo="Torneo en curso"
        descripcion={fixturasElim.length > 0
          ? "Juega y registra los resultados de la fase actual en Encuentros. Al completarla podrás generar la siguiente."
          : "El calendario está armado. Registra los resultados en Encuentros."}>
        <LinkBtn href={`/admin/encuentros?torneo_id=${torneoId}`}>Ir a Encuentros</LinkBtn>
      </ActionShell>
    );
  }
}

// ── Subcomponentes de presentación ──────────────────────────────────────────

function Stepper({ paso }: { paso: number }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm px-5 py-4">
      <div className="flex items-center">
        {ETAPAS.map((e, i) => {
          const Icon = e.icon;
          const completado = i < paso;
          const actual = i === paso;
          return (
            <div key={e.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-white transition ${
                  actual ? "bg-red-600 text-white shadow"
                  : completado ? "bg-green-500 text-white"
                  : "bg-slate-100 text-slate-400"}`}>
                  {completado ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-[11px] font-semibold whitespace-nowrap ${
                  actual ? "text-red-600" : completado ? "text-green-600" : "text-slate-400"}`}>
                  {e.label}
                </span>
              </div>
              {i < ETAPAS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 mb-5 rounded ${i < paso ? "bg-green-300" : "bg-slate-100"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionShell({ tone, icon, titulo, descripcion, children }: {
  tone: keyof typeof TONOS; icon: ReactNode; titulo: string; descripcion: string; children?: ReactNode;
}) {
  const t = TONOS[tone];
  return (
    <div className={`bg-white border rounded-xl shadow-sm p-5 ${t.chip.split(" ").slice(-1)}`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-4 ${t.icon} ${t.ring}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-slate-900">{titulo}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{descripcion}</p>
          {children && <div className="mt-3 space-y-2">{children}</div>}
        </div>
      </div>
    </div>
  );
}

function FixtureCard({ titulo, tone, total, finalizados, torneoId }: {
  titulo: string; tone: "gray" | "purple"; total: number; finalizados: number; torneoId: number | null;
}) {
  const completa = total > 0 && finalizados === total;
  const pct = total > 0 ? Math.round((finalizados / total) * 100) : 0;
  const purple = tone === "purple";
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
      <div className={`px-4 py-2.5 border-b flex items-center justify-between ${purple ? "bg-purple-50 border-purple-100" : "bg-slate-50 border-slate-100"}`}>
        <span className={`flex items-center gap-1.5 text-sm font-semibold ${purple ? "text-purple-800" : "text-slate-700"}`}>
          {purple && <Trophy className="w-3.5 h-3.5" />}{titulo}
        </span>
        {completa && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completa
          </span>
        )}
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>{total} partido{total !== 1 ? "s" : ""}</span>
          <span className="font-semibold">{finalizados}/{total}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${completa ? "bg-green-500" : purple ? "bg-purple-500" : "bg-red-500"}`}
            style={{ width: `${pct}%` }} />
        </div>
        <Link href={`/admin/encuentros?torneo_id=${torneoId}`}
          className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700">
          Ver en Encuentros <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white border border-dashed border-slate-200 rounded-xl px-6 py-12">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <Shuffle className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Selecciona un torneo para comenzar</h2>
        <p className="text-sm text-slate-500 mt-1">
          Aquí armas el calendario de partidos. El proceso es guiado: te diremos qué hacer en cada etapa.
        </p>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          {[
            { icon: Users, t: "1. Equipos", d: "Aprueba inscripciones." },
            { icon: Shuffle, t: "2. Sorteo", d: "Genera el fixture." },
            { icon: ListChecks, t: "3. Juego", d: "Resultados y llaves." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <Icon className="w-4 h-4 text-red-500" />
              <p className="mt-1.5 text-xs font-semibold text-slate-700">{t}</p>
              <p className="text-[11px] text-slate-400">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
      {icon}{children}
    </h3>
  );
}

function ResumenRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-semibold ${highlight ? "text-green-600" : "text-slate-900"}`}>{value}</dd>
    </div>
  );
}

function LinkBtn({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href}
      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
      {children} <ArrowRight className="w-4 h-4" />
    </Link>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-amber-700">
      <Info className="w-3.5 h-3.5 shrink-0" />{children}
    </p>
  );
}

function Banner({ state, error, okMsg }: { state: State; error: string; okMsg: string }) {
  if (state === "error") {
    return (
      <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
      </div>
    );
  }
  if (state === "success") {
    return (
      <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />{okMsg}
      </div>
    );
  }
  return null;
}
