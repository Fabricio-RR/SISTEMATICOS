"use client";
import { useEffect, useState, useCallback } from "react";
import { BarChart3, RefreshCw, Save, Filter, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Partido, Torneo, ClubEquipo } from "@/types/api";

type ResultadoForm = { local: string; visitante: string };

export default function ResultadosPage() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [equipos, setEquipos] = useState<ClubEquipo[]>([]);
  const [torneoId, setTorneoId] = useState<number | undefined>();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [formas, setFormas] = useState<Record<number, ResultadoForm>>({});
  const [guardando, setGuardando] = useState<number | null>(null);
  const [guardados, setGuardados] = useState<Set<number>>(new Set());

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [p, t, eq] = await Promise.all([
        api.getPartidos({ torneo_id: torneoId, estado: "programado" }),
        api.getTorneos(),
        api.getEquipos(),
      ]);
      setPartidos(p);
      setTorneos(t);
      setEquipos(eq);
      setFormas({});
      setGuardados(new Set());
    } catch {
      setError("No se pudo cargar los resultados.");
    } finally {
      setCargando(false);
    }
  }, [torneoId]);

  useEffect(() => { cargar(); }, [cargar]);

  function setForma(id: number, campo: keyof ResultadoForm, valor: string) {
    setFormas((f) => ({ ...f, [id]: { ...(f[id] ?? { local: "", visitante: "" }), [campo]: valor } }));
  }

  async function guardar(partido: Partido) {
    const forma = formas[partido.id];
    if (!forma || forma.local === "" || forma.visitante === "") return;
    const rl = Number(forma.local);
    const rv = Number(forma.visitante);
    if (!Number.isInteger(rl) || !Number.isInteger(rv) || rl < 0 || rv < 0) return;

    setGuardando(partido.id);
    try {
      await api.setResultado(partido.id, { resultado_local: rl, resultado_visitante: rv, estado: "finalizado" });
      setGuardados((g) => new Set(g).add(partido.id));
      await cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar resultado");
    } finally {
      setGuardando(null);
    }
  }

  const tablaEquipos = [...equipos]
    .filter((e) => e.partidos_jugados > 0)
    .sort((a, b) => b.puntos - a.puntos || b.partidos_ganados - a.partidos_ganados);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Administración</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Resultados</h1>
          <p className="text-sm text-gray-400 mt-0.5">Ingresa los marcadores de los partidos programados.</p>
        </div>
        <button
          onClick={cargar}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Partidos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative w-fit">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={torneoId ?? ""}
              onChange={(e) => setTorneoId(e.target.value ? Number(e.target.value) : undefined)}
              className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Todos los torneos</option>
              {torneos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Partidos programados</h2>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                {partidos.length} partido{partidos.length !== 1 ? "s" : ""}
              </span>
            </div>

            {cargando ? (
              <div className="flex items-center justify-center h-40 text-sm text-gray-400">Cargando...</div>
            ) : partidos.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                No hay partidos programados
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {partidos.map((p) => {
                  const forma = formas[p.id] ?? { local: "", visitante: "" };
                  const yaGuardado = guardados.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center px-6 py-4 gap-4 transition ${
                        yaGuardado ? "bg-green-50/50" : "hover:bg-gray-50/50"
                      }`}
                    >
                      <div className="w-1/4 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.torneo_nombre}</p>
                        <p className="text-xs text-gray-400">Jornada {p.jornada}</p>
                      </div>
                      <div className="flex flex-1 items-center justify-center gap-3">
                        <span className="text-sm font-semibold text-gray-800 text-right truncate flex-1">
                          {p.local_nombre}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number" min={0} max={99}
                            value={forma.local}
                            onChange={(e) => setForma(p.id, "local", e.target.value)}
                            disabled={yaGuardado}
                            className="w-12 text-center text-base font-bold text-gray-900 border border-gray-200 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-400"
                          />
                          <span className="text-gray-300 font-bold text-sm">—</span>
                          <input
                            type="number" min={0} max={99}
                            value={forma.visitante}
                            onChange={(e) => setForma(p.id, "visitante", e.target.value)}
                            disabled={yaGuardado}
                            className="w-12 text-center text-base font-bold text-gray-900 border border-gray-200 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-400"
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-800 text-left truncate flex-1">
                          {p.visitante_nombre}
                        </span>
                      </div>
                      <button
                        onClick={() => guardar(p)}
                        disabled={guardando === p.id || yaGuardado || forma.local === "" || forma.visitante === ""}
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition disabled:opacity-40 ${
                          yaGuardado
                            ? "text-green-600 bg-green-50"
                            : "text-white bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        <Save className="w-3.5 h-3.5" />
                        {yaGuardado ? "Guardado" : guardando === p.id ? "..." : "Guardar"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tabla de posiciones */}
        <div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Tabla general</h2>
              <BarChart3 className="w-4 h-4 text-gray-400" />
            </div>
            {tablaEquipos.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">Sin datos aún</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {tablaEquipos.slice(0, 10).map((eq, i) => (
                  <div key={eq.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold w-5 text-right ${i === 0 ? "text-red-600" : "text-gray-300"}`}>
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{eq.nombre_equipo}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{eq.puntos} pts</p>
                      <p className="text-xs text-gray-400">{eq.partidos_jugados} PJ</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
