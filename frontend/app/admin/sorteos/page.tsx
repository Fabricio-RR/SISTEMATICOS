"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Shuffle, Trash2, ChevronRight, AlertCircle, CheckCircle2, Trophy, Swords } from "lucide-react";
import { api } from "@/lib/api";
import type { Torneo, Fixture, Inscripcion, Partido } from "@/types/api";

type State = "idle" | "loading" | "success" | "error";

export default function SorteosPage() {
  const [torneos, setTorneos]           = useState<Torneo[]>([]);
  const [torneoId, setTorneoId]         = useState<number | null>(null);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [fixtures, setFixtures]         = useState<Fixture[]>([]);
  const [partidos, setPartidos]         = useState<Partido[]>([]);
  const [state, setState]               = useState<State>("idle");
  const [error, setError]               = useState("");
  const [nClasificados, setNClasificados] = useState(4);
  const [estadoFase, setEstadoFase]     = useState<State>("idle");
  const [errorFase, setErrorFase]       = useState("");
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  useEffect(() => {
    api.getTorneos().then(setTorneos).catch(() => {});
  }, []);

  const cargarDetalles = useCallback(async (id: number) => {
    try {
      const [insc, fix, parts] = await Promise.all([
        api.getInscripciones(id),
        api.getFixture(id),
        api.getPartidos({ torneo_id: id }),
      ]);
      setInscripciones(insc);
      setFixtures(fix);
      setPartidos(parts);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "No se pudieron cargar los detalles del torneo.");
    }
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
      setFixtures([]);
      setPartidos([]);
      setEstadoFase("idle");
      setErrorFase("");
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

  const FASES_ELIM = ["Cuartos de Final", "Semifinales", "Final"];

  const torneo = torneos.find(t => t.id === torneoId) ?? null;
  const aprobados = inscripciones.filter(i => i.estado === "aprobado");
  const hayPendientes = inscripciones.length > 0 && aprobados.length === 0;

  const fixturasLiga = fixtures.filter(f => f.nombre_fase.startsWith("Jornada"));
  const fixturasElim = fixtures.filter(f => FASES_ELIM.includes(f.nombre_fase)).sort((a, b) => a.jornada - b.jornada);
  const ultimaFaseElim = fixturasElim.at(-1);

  const jornadasLiga = Array.from(new Set(fixturasLiga.map(f => f.jornada))).sort((a, b) => a - b);

  const partidosPorFixture  = partidos.reduce<Record<number, number>>((acc, p) => { acc[p.fixture_id] = (acc[p.fixture_id] ?? 0) + 1; return acc; }, {});
  const finalizadosPorFixture = partidos.reduce<Record<number, number>>((acc, p) => { if (p.estado === "finalizado") acc[p.fixture_id] = (acc[p.fixture_id] ?? 0) + 1; return acc; }, {});

  const ultimaFaseCompleta =
    ultimaFaseElim != null &&
    (partidosPorFixture[ultimaFaseElim.id] ?? 0) > 0 &&
    (finalizadosPorFixture[ultimaFaseElim.id] ?? 0) === (partidosPorFixture[ultimaFaseElim.id] ?? 0);

  const puedeGenerarSiguiente = ultimaFaseCompleta && ultimaFaseElim?.nombre_fase !== "Final";
  const torneoElimFinalizado  = ultimaFaseCompleta && ultimaFaseElim?.nombre_fase === "Final";
  const torneoTieneLiga       = fixturasLiga.length > 0;

  // Formato del torneo
  const esEliminacionSimple = torneo?.formato === "eliminacion_simple";

  // Condiciones de estado
  const estadoOk_Sorteo   = torneo?.estado === "en_sorteo";
  const estadoOk_EnCurso  = torneo?.estado === "en_curso";

  // Puede generar fase eliminatoria si: en_curso + sin fases elim + (tiene liga O es eliminación directa)
  const puedeGenerarFaseElim =
    estadoOk_EnCurso &&
    fixturasElim.length === 0 &&
    (torneoTieneLiga || esEliminacionSimple);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Sorteos y Fixtures</h1>
        <p className="text-sm text-gray-400 mt-0.5">Genera el calendario de partidos para cada torneo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel izquierdo */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Configuración</h2>

            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Torneo</label>
            <select
              value={torneoId ?? ""}
              onChange={e => {
                setTorneoId(Number(e.target.value) || null);
                setState("idle"); setError(""); setFixtures([]); setInscripciones([]);
              }}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Seleccionar torneo</option>
              {torneos.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombre} — {t.temporada} [{t.estado.replace(/_/g, " ")}]
                </option>
              ))}
            </select>

            {/* Stats del torneo */}
            {torneoId && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
                {[
                  { label: "Formato", valor: torneo?.formato?.replace(/_/g, " ") ?? "—" },
                  { label: "Equipos aprobados", valor: aprobados.length },
                  { label: "Partidos generados", valor: partidos.length > 0 ? partidos.length : "—" },
                  { label: "Jornadas", valor: fixtures.length > 0 ? fixtures.length : "—", color: fixtures.length > 0 ? "text-green-600" : "text-gray-400" },
                ].map(({ label, valor, color }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500">{label}</span>
                    <span className={`font-semibold text-gray-900 ${color ?? ""}`}>{String(valor)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Advertencia de estado */}
            {torneo && !estadoOk_Sorteo && !estadoOk_EnCurso && (
              <div className="mt-4 flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Estado actual: <strong>{torneo.estado.replace(/_/g, " ")}</strong>.{" "}
                  {esEliminacionSimple
                    ? "Avanza a En sorteo y luego a En curso para generar el bracket."
                    : "Para generar el fixture de liga avanza a En sorteo."}
                </span>
              </div>
            )}

            {/* Info para eliminacion_simple en en_sorteo */}
            {torneo && esEliminacionSimple && estadoOk_Sorteo && (
              <div className="mt-4 flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                Torneo de eliminación directa - no tiene fase de liga. Avanza a <strong>En curso</strong> en{" "}
                <Link href="/admin/torneos" className="font-bold underline">Torneos</Link> para generar el bracket eliminatorio.
              </div>
            )}

            {state === "error" && (
              <div className="mt-4 flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
              </div>
            )}
            {state === "success" && (
              <div className="mt-4 flex gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />Fixture de liga generado correctamente
              </div>
            )}

            {/* Botones liga — solo para torneos no eliminacion_simple */}
            {!esEliminacionSimple && (
              <div className="mt-4 space-y-2">
                <button
                  onClick={generar}
                  disabled={!torneoId || state === "loading" || aprobados.length < 2 || !estadoOk_Sorteo}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  <Shuffle className="w-4 h-4" />
                  {state === "loading" ? "Generando..." : fixtures.length > 0 ? "Regenerar fixture" : "Generar fixture de liga"}
                </button>
                {fixtures.length > 0 && (
                  confirmarEliminar ? (
                    <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <span className="text-xs text-red-700 font-semibold flex-1">¿Eliminar todos los fixtures?</span>
                      <button onClick={eliminar}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition">
                        Sí, eliminar
                      </button>
                      <button onClick={() => setConfirmarEliminar(false)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmarEliminar(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition">
                      <Trash2 className="w-4 h-4" />Eliminar fixture
                    </button>
                  )
                )}
              </div>
            )}

            {/* Fase Eliminatoria — controles (liga o eliminacion_simple) */}
            {torneoId && puedeGenerarFaseElim && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {esEliminacionSimple ? "Bracket eliminatorio" : "Fase Eliminatoria"}
                </p>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Clasificados</label>
                  <select
                    value={nClasificados}
                    onChange={e => setNClasificados(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value={2}>2 equipos — Final directa</option>
                    <option value={4}>4 equipos — Semifinales</option>
                    <option value={8}>8 equipos — Cuartos de Final</option>
                  </select>
                </div>
                {estadoFase === "error" && (
                  <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{errorFase}
                  </div>
                )}
                {estadoFase === "success" && (
                  <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />Fase generada correctamente
                  </div>
                )}
                <button
                  onClick={generarFaseElim}
                  disabled={estadoFase === "loading" || aprobados.length < nClasificados}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  <Trophy className="w-4 h-4" />
                  {estadoFase === "loading" ? "Generando..." : "Generar fase eliminatoria"}
                </button>
                {aprobados.length < nClasificados && (
                  <p className="text-xs text-amber-600 text-center">
                    Necesitas {nClasificados} equipos aprobados (hay {aprobados.length})
                  </p>
                )}
              </div>
            )}

            {/* Siguiente fase */}
            {torneoId && puedeGenerarSiguiente && ultimaFaseElim && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fase Eliminatoria</p>
                {estadoFase === "error" && (
                  <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{errorFase}
                  </div>
                )}
                {estadoFase === "success" && (
                  <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />Fase generada correctamente
                  </div>
                )}
                <button
                  onClick={() => generarSiguiente(ultimaFaseElim.id)}
                  disabled={estadoFase === "loading"}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  <Swords className="w-4 h-4" />
                  {estadoFase === "loading" ? "Generando..." : "Generar siguiente fase"}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  Fase actual: <span className="font-semibold text-purple-700">{ultimaFaseElim.nombre_fase}</span>
                </p>
              </div>
            )}

            {torneoId && torneoElimFinalizado && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm font-semibold text-amber-800">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Torneo eliminatorio completo
                </div>
              </div>
            )}

            {torneoId && aprobados.length === 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p>{hayPendientes ? "Hay inscripciones pendientes de aprobar." : "Sin equipos inscritos y aprobados aún."}</p>
                <Link href="/admin/inscripciones" className="mt-1 inline-flex font-semibold text-amber-900 hover:text-amber-950">
                  Ir a Inscripciones →
                </Link>
              </div>
            )}
          </div>

          {/* Equipos aprobados */}
          {torneoId && aprobados.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Equipos aprobados ({aprobados.length})</h3>
              <ul className="space-y-1.5">
                {aprobados.map(insc => (
                  <li key={insc.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <ChevronRight className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    {insc.club_equipo?.nombre_equipo ?? `Equipo #${insc.club_equipo_id}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <div className="lg:col-span-2">
          {fixtures.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center bg-white border border-dashed border-gray-200 rounded-xl text-gray-300">
              <Shuffle className="w-10 h-10 mb-3" strokeWidth={1.5} />
              <p className="text-sm text-gray-400 font-medium">
                {!torneoId ? "Selecciona un torneo primero" : "Genera el fixture para ver las jornadas"}
              </p>
              {torneoId && aprobados.length < 2 && (
                <p className="text-xs mt-1 text-red-400">Se necesitan al menos 2 equipos aprobados</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Fase de Liga */}
              {jornadasLiga.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Fase de Liga</p>
                  {jornadasLiga.map(jornada => {
                    const jornFix = fixturasLiga.find(f => f.jornada === jornada);
                    return (
                      <div key={jornada} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700">{jornFix?.nombre_fase}</span>
                          <span className="text-xs text-gray-400">
                            {jornFix ? new Date(jornFix.fecha_generacion).toLocaleDateString("es-PE") : ""}
                          </span>
                        </div>
                        <div className="px-5 py-3 text-sm text-gray-500 flex items-center justify-between">
                          <span>
                            {(() => { const n = jornFix ? (partidosPorFixture[jornFix.id] ?? 0) : 0; return `${n} partido${n !== 1 ? "s" : ""}`; })()}
                          </span>
                          <Link href={`/admin/encuentros?torneo_id=${torneoId}`}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline">
                            Ver en Encuentros →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Fase Eliminatoria */}
              {fixturasElim.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                    {esEliminacionSimple ? "Bracket Eliminatorio" : "Fase Eliminatoria"}
                  </p>
                  {fixturasElim.map(fix => {
                    const total = partidosPorFixture[fix.id] ?? 0;
                    const finalizados = finalizadosPorFixture[fix.id] ?? 0;
                    const completa = total > 0 && finalizados === total;
                    return (
                      <div key={fix.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm font-semibold text-purple-800">
                            <Trophy className="w-4 h-4" />{fix.nombre_fase}
                          </span>
                          <span className="text-xs text-purple-500">
                            {new Date(fix.fecha_generacion).toLocaleDateString("es-PE")}
                          </span>
                        </div>
                        <div className="px-5 py-3 text-sm text-gray-500 flex items-center justify-between">
                          <span>
                            {total} partido{total !== 1 ? "s" : ""} · {finalizados}/{total} finalizados
                            {completa && (
                              <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Completa
                              </span>
                            )}
                          </span>
                          <Link href={`/admin/encuentros?torneo_id=${torneoId}`}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline">
                            Ver encuentros →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                  {torneoElimFinalizado && (
                    <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-800">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      ¡La Final ha concluido! El torneo eliminatorio está completo.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
