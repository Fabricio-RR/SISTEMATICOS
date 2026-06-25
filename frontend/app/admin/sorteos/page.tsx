"use client";
import { useEffect, useState } from "react";
import { Shuffle, Trophy, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

export default function AdminSorteos() {
  const [torneos, setTorneos] = useState<any[]>([]);
  const [torneoId, setTorneoId] = useState<number | null>(null);
  const [fixture, setFixture] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ texto: "", tipo: "ok" });

  useEffect(() => {
    api.getTorneos().then(setTorneos).catch(() => {});
  }, []);

  useEffect(() => {
    if (!torneoId) { setFixture([]); return; }
    api.getFixture(torneoId).then(setFixture).catch(() => setFixture([]));
  }, [torneoId]);

  const flash = (texto: string, tipo = "ok") => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg({ texto: "", tipo: "ok" }), 4000);
  };

  const generar = async () => {
    if (!torneoId) return;
    setLoading(true);
    try {
      const res = await api.generarSorteo(torneoId) as any;
      flash(`Sorteo generado: ${res.grupos} grupos, ${res.partidos_creados} partidos`);
      const data = await api.getFixture(torneoId);
      setFixture(data);
    } catch (e: any) {
      flash(e.message, "err");
    } finally {
      setLoading(false);
    }
  };

  const generarElim = async () => {
    if (!torneoId) return;
    setLoading(true);
    try {
      const res = await api.generarEliminatoria(torneoId) as any;
      flash(`Eliminatoria generada: ${res.partidos_creados} partidos`);
      const data = await api.getFixture(torneoId);
      setFixture(data);
    } catch (e: any) {
      flash(e.message, "err");
    } finally {
      setLoading(false);
    }
  };

  const resetear = async () => {
    if (!torneoId) return;
    if (!confirm("¿Eliminar todo el fixture? Esta acción no se puede deshacer.")) return;
    try {
      await api.eliminarFixture(torneoId);
      setFixture([]);
      flash("Fixture eliminado.");
    } catch (e: any) {
      flash(e.message, "err");
    }
  };

  const hayFaseGrupos = fixture.some(f => f.nombre_fase?.includes("Grupos"));
  const hayEliminatoria = fixture.some(f => f.nombre_fase?.includes("Final") || f.nombre_fase?.includes("Semi"));

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Panel de Control</p>
        <h1 className="text-4xl font-black text-gray-900 mt-1">
          Sorteos y <span className="text-red-600">Fixture</span>
        </h1>
      </div>

      {msg.texto && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold border ${
          msg.tipo === "err" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
        }`}>
          {msg.texto}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
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
          <div className="flex gap-2 flex-wrap">
            {!hayFaseGrupos && (
              <button onClick={generar} disabled={!torneoId || loading}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-40 transition-all">
                <Shuffle className="w-4 h-4" />
                {loading ? "Generando..." : "Generar Sorteo"}
              </button>
            )}
            {hayFaseGrupos && !hayEliminatoria && (
              <button onClick={generarElim} disabled={loading}
                className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-40 transition-all">
                <Trophy className="w-4 h-4" />
                Generar Eliminatoria
              </button>
            )}
            {fixture.length > 0 && (
              <button onClick={resetear}
                className="flex items-center gap-2 border border-gray-200 text-gray-500 px-5 py-3 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
                <Trash2 className="w-4 h-4" />
                Resetear
              </button>
            )}
          </div>
        </div>
      </div>

      {torneoId && fixture.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 shadow-sm">
          <Shuffle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No hay fixture generado</p>
          <p className="text-sm mt-1">Aprueba las inscripciones y luego genera el sorteo</p>
        </div>
      )}

      {fixture.map(f => (
        <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{f.nombre_fase}</p>
              <p className="text-sm font-black text-gray-800 mt-0.5">{f.partidos.length} partidos</p>
            </div>
            <span className="text-xs text-gray-400">Jornada {f.jornada}</span>
          </div>
          <div>
            {f.partidos.map((p: any, idx: number) => (
              <div key={p.id} className="flex items-center justify-between px-6 py-4 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-xs text-gray-400 w-5">{idx + 1}</span>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-1 text-right">
                      <p className="font-bold text-sm text-gray-900">{p.local?.nombre ?? "—"}</p>
                      {p.local?.pais && <p className="text-xs text-gray-400">{p.local.pais_emoji} {p.local.pais}</p>}
                    </div>
                    <div className="min-w-[60px] text-center">
                      {p.resultado_local !== null && p.resultado_visitante !== null ? (
                        <span className="text-lg font-black text-gray-900">{p.resultado_local} – {p.resultado_visitante}</span>
                      ) : (
                        <span className="text-xs font-bold text-gray-400">VS</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gray-900">{p.visitante?.nombre ?? "—"}</p>
                      {p.visitante?.pais && <p className="text-xs text-gray-400">{p.visitante.pais_emoji} {p.visitante.pais}</p>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {p.fecha_hora && (
                    <span className="text-xs text-gray-400">
                      {new Date(p.fecha_hora).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                      {" "}
                      {new Date(p.fecha_hora).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    p.estado === "finalizado" ? "bg-green-100 text-green-700" :
                    p.estado === "en_curso" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                  }`}>{p.estado}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
