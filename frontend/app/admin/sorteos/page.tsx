"use client";
import { useEffect, useState, useCallback } from "react";
import { Shuffle, Trash2, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Torneo, Fixture, Inscripcion } from "@/types/api";

type State = "idle" | "loading" | "success" | "error";

export default function SorteosPage() {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [torneoId, setTorneoId] = useState<number | null>(null);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    api.getTorneos().then(setTorneos).catch(() => {});
  }, []);

  const cargarDetalles = useCallback(async (id: number) => {
    const [insc, fix] = await Promise.all([api.getInscripciones(id), api.getFixture(id)]);
    setInscripciones(insc);
    setFixtures(fix);
  }, []);

  useEffect(() => {
    if (torneoId) cargarDetalles(torneoId);
  }, [torneoId, cargarDetalles]);

  async function generar() {
    if (!torneoId) return;
    setState("loading");
    setError("");
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
    if (!torneoId || !confirm("¿Eliminar todos los fixtures y partidos de este torneo?")) return;
    await api.deleteFixture(torneoId);
    setFixtures([]);
    setState("idle");
  }

  const aprobados = inscripciones.filter((i) => i.estado === "aprobado");
  const jornadasUnicas = Array.from(new Set(fixtures.map((f) => f.jornada))).sort((a, b) => a - b);
  const partidosPorJornada = aprobados.length > 1 ? Math.floor(aprobados.length / 2) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
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
              onChange={(e) => {
                setTorneoId(Number(e.target.value) || null);
                setState("idle");
                setError("");
                setFixtures([]);
                setInscripciones([]);
              }}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Seleccionar torneo</option>
              {torneos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre} — {t.temporada}</option>
              ))}
            </select>

            {torneoId && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
                {[
                  { label: "Equipos aprobados", valor: aprobados.length },
                  {
                    label: "Jornadas a generar",
                    valor: aprobados.length > 1
                      ? (aprobados.length % 2 === 0 ? aprobados.length - 1 : aprobados.length)
                      : "—",
                  },
                  { label: "Partidos por jornada", valor: partidosPorJornada || "—" },
                  {
                    label: "Fixture actual",
                    valor: fixtures.length > 0 ? `${fixtures.length} jornadas` : "Ninguno",
                    color: fixtures.length > 0 ? "text-green-600" : "text-gray-400",
                  },
                ].map(({ label, valor, color }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500">{label}</span>
                    <span className={`font-semibold text-gray-900 ${color ?? ""}`}>{String(valor)}</span>
                  </div>
                ))}
              </div>
            )}

            {state === "error" && (
              <div className="mt-4 flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            {state === "success" && (
              <div className="mt-4 flex gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                Fixture generado correctamente
              </div>
            )}

            <div className="mt-4 space-y-2">
              <button
                onClick={generar}
                disabled={!torneoId || state === "loading" || aprobados.length < 2}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                <Shuffle className="w-4 h-4" />
                {state === "loading" ? "Generando..." : fixtures.length > 0 ? "Regenerar fixture" : "Generar fixture"}
              </button>
              {fixtures.length > 0 && (
                <button
                  onClick={eliminar}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar fixture
                </button>
              )}
            </div>
          </div>

          {torneoId && aprobados.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Equipos aprobados ({aprobados.length})
              </h3>
              <ul className="space-y-1.5">
                {aprobados.map((insc) => (
                  <li key={insc.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <ChevronRight className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    {insc.club_equipo?.nombre_equipo ?? `Equipo #${insc.club_equipo_id}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Panel derecho - Fixture */}
        <div className="lg:col-span-2">
          {fixtures.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center bg-white border border-dashed border-gray-200 rounded-xl text-gray-300">
              <Shuffle className="w-10 h-10 mb-3" strokeWidth={1.5} />
              <p className="text-sm text-gray-400 font-medium">
                {torneoId ? "Genera el fixture para ver las jornadas" : "Selecciona un torneo primero"}
              </p>
              {torneoId && aprobados.length < 2 && (
                <p className="text-xs mt-1 text-red-400">Se necesitan al menos 2 equipos aprobados</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {jornadasUnicas.map((jornada) => {
                const jornFix = fixtures.find((f) => f.jornada === jornada);
                return (
                  <div key={jornada} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">{jornFix?.nombre_fase}</span>
                      <span className="text-xs text-gray-400">
                        {jornFix ? new Date(jornFix.fecha_generacion).toLocaleDateString("es-PE") : ""}
                      </span>
                    </div>
                    <div className="px-5 py-3 text-sm text-gray-500">
                      {partidosPorJornada} partido{partidosPorJornada !== 1 ? "s" : ""} · Ver detalle en Encuentros
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
