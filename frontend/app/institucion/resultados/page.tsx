"use client";
import { useEffect, useState } from "react";
import { BarChart3, Trophy, Target } from "lucide-react";
import { api } from "@/lib/api";

type SportCfg = { anotadoresLabel: string; unitLabel: string };

const SPORT_CFG: Record<string, SportCfg> = {
  futbol:   { anotadoresLabel: "Goleadores",   unitLabel: "goles"    },
  basket:   { anotadoresLabel: "Encestadores", unitLabel: "encestes" },
  voley:    { anotadoresLabel: "Anotadores",   unitLabel: "puntos"   },
  pingpong: { anotadoresLabel: "Anotadores",   unitLabel: "puntos"   },
  default:  { anotadoresLabel: "Anotadores",   unitLabel: "puntos"   },
};

function getSportCfg(deporteNombre: string): SportCfg {
  const n = deporteNombre.toLowerCase();
  if (n.includes("fútbol") || n.includes("futbol") || n.includes("soccer")) return SPORT_CFG.futbol;
  if (n.includes("básquet") || n.includes("basquet") || n.includes("basket")) return SPORT_CFG.basket;
  if (n.includes("vóley") || n.includes("voley") || n.includes("voleibol")) return SPORT_CFG.voley;
  if (n.includes("ping") || n.includes("tenis de mesa")) return SPORT_CFG.pingpong;
  return SPORT_CFG.default;
}

export default function InstitucionResultados() {
  const [torneos, setTorneos] = useState<any[]>([]);
  const [deportes, setDeportes] = useState<any[]>([]);
  const [torneoId, setTorneoId] = useState<number | null>(null);
  const [posiciones, setPosiciones] = useState<any[]>([]);
  const [goleadores, setGoleadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.getTorneos(), api.getDeportes()])
      .then(([t, d]) => { setTorneos(t); setDeportes(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!torneoId) { setPosiciones([]); setGoleadores([]); return; }
    setLoading(true);
    Promise.all([
      api.getPosiciones(torneoId),
      api.getGoleadores(torneoId),
    ]).then(([pos, gol]) => {
      setPosiciones(pos);
      setGoleadores(gol);
    }).finally(() => setLoading(false));
  }, [torneoId]);

  const torneoActual = torneos.find(t => t.id === torneoId);
  const deporteActual = deportes.find(d => d.id === torneoActual?.deporte_id);
  const sportCfg = deporteActual ? getSportCfg(deporteActual.nombre) : SPORT_CFG.default;

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Portal Institucional</p>
        <h1 className="text-4xl font-black text-gray-900 mt-1">
          Resultados y <span className="text-red-600">Estadísticas</span>
        </h1>
      </div>

      {/* Selector */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Seleccionar Torneo</label>
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

      {loading && <p className="text-gray-400 text-sm">Cargando...</p>}

      {torneoId && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tabla de posiciones */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-red-600" />
              <h2 className="font-black text-gray-900">Tabla de Posiciones</h2>
            </div>
            {posiciones.length === 0 ? (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">
                Sin datos aún — los partidos deben completarse primero
              </p>
            ) : (
              <>
                <div className="grid grid-cols-7 text-xs font-bold text-gray-400 uppercase tracking-wider px-6 py-3 border-b border-gray-50">
                  <span className="col-span-3">Equipo</span>
                  <span className="text-center">PJ</span>
                  <span className="text-center">PG</span>
                  <span className="text-center">PP</span>
                  <span className="text-center font-black text-gray-700">PTS</span>
                </div>
                {posiciones.map(t => (
                  <div
                    key={t.equipo_id}
                    className={`grid grid-cols-7 items-center px-6 py-3 border-b border-gray-50 last:border-0 ${
                      t.posicion === 1 ? "bg-red-50/30" : ""
                    }`}
                  >
                    <div className="col-span-3 flex items-center gap-3">
                      <span className={`text-sm font-black w-6 ${t.posicion === 1 ? "text-red-600" : t.posicion <= 4 ? "text-gray-600" : "text-gray-300"}`}>
                        {t.posicion}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-gray-900 leading-tight">{t.nombre_equipo}</p>
                        <p className="text-xs text-gray-400">
                          {t.pais_emoji} {t.pais || t.grupo}
                        </p>
                      </div>
                    </div>
                    <span className="text-center text-sm text-gray-600">{t.pj}</span>
                    <span className="text-center text-sm text-gray-600">{t.pg}</span>
                    <span className="text-center text-sm text-gray-600">{t.pp}</span>
                    <span className={`text-center text-sm font-black ${t.posicion === 1 ? "text-red-600" : "text-gray-900"}`}>
                      {t.puntos}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Anotadores */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
                <Target className="w-5 h-5 text-red-600" />
                <h2 className="font-black text-gray-900">{sportCfg.anotadoresLabel}</h2>
              </div>
              {goleadores.length === 0 ? (
                <p className="px-6 py-8 text-center text-gray-400 text-sm">Sin anotaciones registradas aún</p>
              ) : (
                <div>
                  {goleadores.map(g => (
                    <div key={g.atleta_id} className="flex items-center justify-between px-6 py-4 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-black w-6 ${g.posicion === 1 ? "text-red-600" : "text-gray-400"}`}>
                          {g.posicion}
                        </span>
                        <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center font-black text-gray-500 text-xs">
                          {g.nombre?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{g.nombre}</p>
                          <p className="text-xs text-gray-400">{g.equipo}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-2xl font-black ${g.posicion === 1 ? "text-red-600" : "text-gray-900"}`}>
                          {g.goles}
                        </span>
                        <span className="text-xs text-gray-400">{sportCfg.unitLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leyenda */}
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5" /> Leyenda
              </p>
              {[
                ["PJ", "Partidos Jugados"],
                ["PG", "Partidos Ganados"],
                ["PP", "Partidos Perdidos"],
                ["PTS", "Puntos (3 ganado, 1 empate, 0 derrota)"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center gap-3 py-1">
                  <span className="text-xs font-black text-gray-700 w-8">{key}</span>
                  <span className="text-xs text-gray-400">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
