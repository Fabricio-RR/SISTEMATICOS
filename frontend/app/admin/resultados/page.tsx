"use client";
import { useState } from "react";
import { BarChart3, RefreshCw, AlertCircle, Trophy, Users, Swords, Medal } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTorneos, useDeportes, useTabla, useGoleadores, usePartidos } from "@/lib/hooks";
import { SelectorTorneo } from "@/components/SelectorTorneo";
import type { Torneo } from "@/types/api";

type Tab = "tabla" | "goleadores" | "partidos";

export default function ResultadosPage() {
  const queryClient = useQueryClient();
  const [torneoId, setTorneoId] = useState<number | undefined>();
  const [tab, setTab] = useState<Tab>("tabla");

  const torneosQ = useTorneos();
  const deportesQ = useDeportes();
  const torneos = torneosQ.data ?? [];
  const deportes = deportesQ.data ?? [];

  const tablaQ = useTabla(torneoId);
  const goleadoresQ = useGoleadores(torneoId);
  const partidosQ = usePartidos(torneoId ? { torneo_id: torneoId } : undefined, { enabled: !!torneoId });
  const tabla = tablaQ.data ?? [];
  const goleadores = goleadoresQ.data ?? [];
  const partidos = (partidosQ.data ?? []).filter(p => p.estado === "finalizado");

  const cargando =
    torneosQ.isLoading || deportesQ.isLoading ||
    (!!torneoId && (tablaQ.isLoading || goleadoresQ.isLoading || partidosQ.isLoading));
  const errorMostrado =
    torneosQ.isError || deportesQ.isError
      ? "No se pudo cargar los torneos."
      : torneoId && (tablaQ.isError || goleadoresQ.isError || partidosQ.isError)
        ? "No se pudieron cargar las estadísticas."
        : "";
  const recargar = () => queryClient.invalidateQueries();

  const depMap = new Map(deportes.map(d => [d.id, d]));
  const deporteNombre = (id: number) => depMap.get(id)?.nombre ?? "Deporte";

  function esFutbol(torneo: Torneo | undefined): boolean {
    if (!torneo) return false;
    const dep = depMap.get(torneo.deporte_id);
    if (!dep) return false;
    const n = dep.nombre.toLowerCase();
    return n.includes("fútbol") || n.includes("futbol");
  }

  const torneoSeleccionado = torneos.find(t => t.id === torneoId);
  const esFut = esFutbol(torneoSeleccionado);

  // Métricas de resumen del torneo seleccionado.
  const golesTotales = tabla.reduce((acc, f) => acc + (f.goles_a_favor ?? 0), 0);
  const lider = tabla[0];
  const topGoleador = goleadores[0];

  const posBadge = (pos: number) =>
    pos === 1 ? "bg-amber-400 text-white ring-2 ring-amber-200"
    : pos === 2 ? "bg-slate-400 text-white"
    : pos === 3 ? "bg-orange-500 text-white"
    : "bg-slate-100 text-slate-500";

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "tabla", label: "Tabla de posiciones", icon: <Trophy className="w-4 h-4" /> },
    { key: "goleadores", label: esFut ? "Goleadores" : "Anotadores", icon: <Users className="w-4 h-4" /> },
    { key: "partidos", label: "Partidos finalizados", icon: <Swords className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Administración</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">Resultados</h1>
          <p className="text-sm text-slate-400 mt-0.5">Consulta tablas de posiciones, goleadores e historial de partidos.</p>
        </div>
        <button onClick={recargar} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {errorMostrado && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errorMostrado}
        </div>
      )}

      {/* Selector de torneo */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-5">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Torneo a consultar</label>
        {torneos.length === 0 ? (
          <p className="py-2 text-sm text-slate-400">No hay torneos disponibles.</p>
        ) : (
          <SelectorTorneo
            torneos={torneos.filter(t => t.estado !== "suspendido")}
            deporteNombre={deporteNombre}
            value={torneoId ?? null}
            onChange={(id) => { setTorneoId(id ?? undefined); setTab("tabla"); }}
            placeholder="— Seleccionar torneo —"
          />
        )}
      </div>

      {!torneoId ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
          <BarChart3 className="w-12 h-12 text-slate-200" strokeWidth={1.5} />
          <p className="text-sm">Selecciona un torneo para ver las estadísticas</p>
        </div>
      ) : cargando ? (
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm flex items-center justify-center h-64 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            Cargando...
          </div>
        </div>
      ) : (
        <>
          {/* Resumen del torneo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Users className="w-4 h-4" />} tone="blue" label="Equipos" value={String(tabla.length)} />
            <StatCard icon={<Swords className="w-4 h-4" />} tone="emerald" label="Partidos jugados" value={String(partidos.length)} />
            <StatCard
              icon={<Trophy className="w-4 h-4" />} tone="amber"
              label="Líder" value={lider?.nombre_equipo ?? "—"}
              sub={lider ? `${lider.puntos} pts` : undefined}
            />
            <StatCard
              icon={<Medal className="w-4 h-4" />} tone="red"
              label={esFut ? "Goleador" : "Anotador"} value={topGoleador?.nombre_completo ?? "—"}
              sub={topGoleador ? `${topGoleador.goles} ${topGoleador.etiqueta.toLowerCase()}` : `${golesTotales} ${esFut ? "goles" : "puntos"} en total`}
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition ${
                  tab === t.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Contenido */}
          {tab === "tabla" && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-bold text-slate-900">Tabla de posiciones</h2>
                </div>
                <span className="text-xs text-slate-400">{tabla.length} equipos</span>
              </div>
              {tabla.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-slate-400">Sin datos aún</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        {["Pos", "Equipo", "PJ", "G", "E", "P", "GF", "GC", "DIF", "PTS"].map((h) => (
                          <th
                            key={h}
                            className={`py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider ${h === "Equipo" ? "text-left px-4" : "text-center px-3"}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {tabla.map((fila) => (
                        <tr key={fila.equipo_id} className={`transition-colors ${fila.posicion === 1 ? "bg-amber-50/40 hover:bg-amber-50/70" : "hover:bg-slate-50/50"}`}>
                          <td className="text-center px-3 py-3">
                            {fila.posicion === 1
                              ? <Trophy className="w-4 h-4 text-yellow-500 mx-auto" />
                              : <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-black ${posBadge(fila.posicion)}`}>{fila.posicion}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">{fila.nombre_equipo}</td>
                          <td className="text-center px-3 py-3 text-sm text-slate-600">{fila.partidos_jugados}</td>
                          <td className="text-center px-3 py-3 text-sm font-medium text-green-600">{fila.partidos_ganados}</td>
                          <td className="text-center px-3 py-3 text-sm text-slate-500">{fila.partidos_empatados}</td>
                          <td className="text-center px-3 py-3 text-sm font-medium text-red-500">{fila.partidos_perdidos}</td>
                          <td className="text-center px-3 py-3 text-sm text-slate-600">{fila.goles_a_favor}</td>
                          <td className="text-center px-3 py-3 text-sm text-slate-600">{fila.goles_en_contra}</td>
                          <td className={`text-center px-3 py-3 text-sm font-semibold ${
                            fila.diferencia_goles > 0 ? "text-green-600" : fila.diferencia_goles < 0 ? "text-red-500" : "text-slate-400"}`}>
                            {fila.diferencia_goles > 0 ? `+${fila.diferencia_goles}` : fila.diferencia_goles}
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">{fila.puntos}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "goleadores" && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <h2 className="text-sm font-bold text-slate-900">{esFut ? "Goleadores" : "Anotadores"}</h2>
                </div>
                <span className="text-xs text-slate-400">Top {goleadores.length}</span>
              </div>
              {goleadores.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-slate-400">Sin estadísticas individuales aún</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {goleadores.map((g) => (
                    <div key={g.atleta_id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/40 transition-colors">
                      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-black shrink-0 ${posBadge(g.posicion)}`}>{g.posicion}</span>
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{g.nombre_completo}</p>
                        <p className="text-xs text-slate-400 truncate">{g.nombre_equipo}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-lg font-bold text-red-600">{g.goles}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{g.etiqueta.toLowerCase()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "partidos" && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-emerald-500" />
                  <h2 className="text-sm font-bold text-slate-900">Partidos finalizados</h2>
                </div>
                <span className="text-xs text-slate-400">{partidos.length} partidos</span>
              </div>
              {partidos.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-slate-400">Sin partidos finalizados aún</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {partidos.map((p) => {
                    const jornada = p.ronda ?? `Jornada ${p.jornada}`;
                    return (
                      <div key={p.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/40 transition-colors">
                        <span className="w-24 shrink-0 text-[10px] font-bold text-slate-400 uppercase truncate">{jornada}</span>
                        <span className="flex-1 text-right text-sm font-semibold text-slate-800 truncate">{p.local_nombre}</span>
                        <div className="shrink-0 flex items-center gap-1 bg-slate-900 rounded-md px-3 py-1">
                          <span className="text-sm font-black text-white tabular-nums w-5 text-center">{p.resultado_local ?? 0}</span>
                          <span className="text-slate-600 text-[10px]">—</span>
                          <span className="text-sm font-black text-white tabular-nums w-5 text-center">{p.resultado_visitante ?? 0}</span>
                        </div>
                        <span className="flex-1 text-left text-sm font-semibold text-slate-800 truncate">{p.visitante_nombre}</span>
                        {p.fecha_hora && (
                          <span className="shrink-0 text-[11px] text-slate-400 hidden lg:block">
                            {new Date(p.fecha_hora).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const STAT_TONOS: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
};

function StatCard({ icon, tone, label, value, sub }: {
  icon: React.ReactNode;
  tone: keyof typeof STAT_TONOS;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-4">
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${STAT_TONOS[tone]}`}>{icon}</span>
      <p className="mt-3 text-lg font-bold text-slate-900 truncate" title={value}>{value}</p>
      <p className="text-xs font-medium text-slate-500 truncate">
        {label}{sub ? <span className="text-slate-400"> · {sub}</span> : null}
      </p>
    </div>
  );
}
