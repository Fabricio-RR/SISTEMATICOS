"use client";
import { useEffect, useState } from "react";
import { BarChart3, Trophy, Users, Target, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";

export default function AdminReportes() {
  const [torneos, setTorneos] = useState<any[]>([]);
  const [deportes, setDeportes] = useState<any[]>([]);
  const [torneoId, setTorneoId] = useState<number | null>(null);
  const [goleadores, setGoleadores] = useState<any[]>([]);
  const [faltas, setFaltas] = useState<any[]>([]);
  const [disciplina, setDisciplina] = useState<any[]>([]);
  const [resumenInst, setResumenInst] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getTorneos(),
      api.getDeportes(),
      api.getResumenInstituciones(),
      api.getResumen(),
    ]).then(([t, d, ri, r]) => {
      setTorneos(t);
      setDeportes(d);
      setResumenInst(ri);
      setResumen(r);
      const primerFutbol = t.find((x: any) => {
        const dep = d.find((dep: any) => dep.id === x.deporte_id);
        return (dep?.tipo_estadistica ?? "") === "futbol";
      });
      if (primerFutbol) setTorneoId(primerFutbol.id);
      else if (t.length) setTorneoId(t[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!torneoId) { setGoleadores([]); setFaltas([]); setDisciplina([]); return; }
    setLoading(true);
    Promise.all([
      api.getGoleadores(torneoId).catch(() => []),
      api.getFaltas(torneoId).catch(() => []),
      api.getDisciplina(torneoId).catch(() => []),
    ]).then(([g, f, d]) => {
      setGoleadores(g);
      setFaltas(f);
      setDisciplina(d);
    }).finally(() => setLoading(false));
  }, [torneoId]);

  const torneoActual = torneos.find(t => t.id === torneoId);
  const deporteActual = deportes.find(d => d.id === torneoActual?.deporte_id);
  const tipo: string = deporteActual?.tipo_estadistica ?? "otro";
  const maxAtletas = Math.max(...resumenInst.map(i => i.total_atletas), 1);
  const maxGoles = Math.max(...goleadores.map(g => g.goles), 1);
  const maxFaltas = Math.max(...faltas.map(f => f.faltas), 1);

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Panel de Control</p>
        <h1 className="text-4xl font-black text-gray-900 mt-1">
          Reportes y <span className="text-red-600">Estadísticas</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Visualización de indicadores del torneo — goleadores, disciplina y participantes
        </p>
      </div>

      {/* Tarjetas resumen */}
      {resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Instituciones", value: resumen.instituciones, icon: Trophy, color: "text-red-600 bg-red-50" },
            { label: "Equipos", value: resumen.equipos, icon: Users, color: "text-blue-600 bg-blue-50" },
            { label: "Atletas", value: resumen.atletas, icon: Target, color: "text-green-600 bg-green-50" },
            { label: "Partidos jugados", value: resumen.partidos_jugados, icon: BarChart3, color: "text-orange-600 bg-orange-50" },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}>
                <c.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{c.value}</p>
                <p className="text-xs text-gray-400 font-medium">{c.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Columna izquierda: Participantes por institución */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h2 className="font-black text-gray-900 text-base">Participantes por Institución</h2>
              <p className="text-xs text-gray-400 mt-0.5">Atletas registrados · ordenados por cantidad</p>
            </div>
            <div className="px-6 py-4 space-y-4">
              {resumenInst.slice(0, 8).map((inst, i) => (
                <div key={inst.institucion_id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm shrink-0">{inst.pais_emoji}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{inst.nombre_corto}</p>
                        <p className="text-[10px] text-gray-400">{inst.total_inscripciones} inscr.</p>
                      </div>
                    </div>
                    <span className={`text-sm font-black shrink-0 ml-2 ${i === 0 ? "text-red-600" : "text-gray-700"}`}>
                      {inst.total_atletas}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${i === 0 ? "bg-red-500" : "bg-gray-300"}`}
                      style={{ width: `${Math.round((inst.total_atletas / maxAtletas) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {resumenInst.length === 0 && (
                <p className="text-xs text-gray-400 py-4 text-center">Sin datos</p>
              )}
            </div>
          </div>
        </div>

        {/* Columna derecha: estadísticas por deporte */}
        <div className="lg:col-span-2 space-y-6">

          {/* Selector de torneo */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Torneo</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              value={torneoId ?? ""}
              onChange={e => setTorneoId(Number(e.target.value) || null)}
            >
              <option value="">— Seleccionar torneo —</option>
              {torneos.map(t => (
                <option key={t.id} value={t.id}>{t.nombre} ({t.temporada})</option>
              ))}
            </select>
            {deporteActual && (
              <p className="text-xs text-gray-400 mt-1.5">
                Deporte: <span className="font-semibold text-gray-600">{deporteActual.nombre}</span>
              </p>
            )}
          </div>

          {loading && <p className="text-gray-400 text-sm">Cargando estadísticas...</p>}

          {/* ── FÚTBOL: Goleadores + Disciplina ── */}
          {!loading && tipo === "futbol" && (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <h2 className="font-black text-gray-900 text-base">Tabla de Goleadores</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Top anotadores del torneo</p>
                  </div>
                  <span className="text-[10px] font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full">⚽ Estadística principal</span>
                </div>
                {goleadores.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <Target className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Sin goles registrados en este torneo</p>
                  </div>
                ) : (
                  <div className="px-6 py-4 space-y-3">
                    {goleadores.slice(0, 10).map((g, i) => (
                      <div key={g.atleta_id} className="flex items-center gap-3">
                        <span className={`text-base font-black w-6 shrink-0 ${i === 0 ? "text-red-600" : i < 3 ? "text-gray-500" : "text-gray-300"}`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="min-w-0">
                              <span className="text-sm font-bold text-gray-900 truncate block">{g.nombre}</span>
                              <span className="text-xs text-gray-400">{g.equipo}</span>
                            </div>
                            <div className="flex items-center gap-2 ml-3 shrink-0">
                              {g.tarjetas_amarillas > 0 && <span className="text-[10px] bg-yellow-100 text-yellow-700 font-bold px-1.5 py-0.5 rounded">{g.tarjetas_amarillas} 🟨</span>}
                              {g.tarjetas_rojas > 0 && <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">{g.tarjetas_rojas} 🟥</span>}
                              <span className={`text-xl font-black ${i === 0 ? "text-red-600" : "text-gray-700"}`}>{g.goles}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${i === 0 ? "bg-red-500" : i < 3 ? "bg-red-300" : "bg-gray-300"}`}
                              style={{ width: `${Math.round((g.goles / maxGoles) * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {disciplina.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <div>
                      <h2 className="font-black text-gray-900 text-base">Tabla Disciplinaria</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Jugadores con tarjetas en el torneo</p>
                    </div>
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase">#</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase">Jugador</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase">Equipo</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-yellow-500 uppercase">🟨</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-red-500 uppercase">🟥</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {disciplina.slice(0, 8).map((d, i) => (
                          <tr key={i} className="hover:bg-gray-50/50">
                            <td className="px-6 py-3 text-xs font-bold text-gray-400">{i + 1}</td>
                            <td className="px-6 py-3 font-semibold text-gray-900">{d.nombre}</td>
                            <td className="px-6 py-3 text-gray-400 text-xs">{d.equipo}</td>
                            <td className="px-6 py-3 text-center font-black text-yellow-600">{d.tarjetas_amarillas || 0}</td>
                            <td className="px-6 py-3 text-center font-black text-red-600">{d.tarjetas_rojas || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── BÁSQUET: Faltas personales ── */}
          {!loading && tipo === "basket" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h2 className="font-black text-gray-900 text-base">Faltas Personales</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Jugadores con más faltas en el torneo</p>
                </div>
                <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-3 py-1 rounded-full">🏀 Estadística principal</span>
              </div>
              {faltas.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <AlertTriangle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Sin faltas registradas en este torneo</p>
                </div>
              ) : (
                <div className="px-6 py-4 space-y-3">
                  {faltas.slice(0, 10).map((f, i) => (
                    <div key={f.atleta_id} className="flex items-center gap-3">
                      <span className={`text-base font-black w-6 shrink-0 ${i === 0 ? "text-orange-600" : i < 3 ? "text-gray-500" : "text-gray-300"}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="min-w-0">
                            <span className="text-sm font-bold text-gray-900 truncate block">{f.nombre}</span>
                            <span className="text-xs text-gray-400">{f.equipo}</span>
                          </div>
                          <span className={`text-xl font-black ml-3 shrink-0 ${i === 0 ? "text-orange-600" : "text-gray-700"}`}>{f.faltas}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${i === 0 ? "bg-orange-500" : i < 3 ? "bg-orange-300" : "bg-gray-300"}`}
                            style={{ width: `${Math.round((f.faltas / maxFaltas) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── VÓLEY / OTRO: sin tabla especial ── */}
          {!loading && (tipo === "voley" || tipo === "otro") && torneoId && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <Trophy className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">
                {tipo === "voley" ? "🏐 Vóley" : "Deporte"} — los eventos se registran por partido
              </p>
              <p className="text-xs text-gray-400 mt-1">Consulta los encuentros individuales para ver el detalle de cada set</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
