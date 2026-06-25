"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Clock } from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error("error");
  return res.json();
}

export default function LandingPage() {
  const [torneos, setTorneos] = useState<any[]>([]);
  const [torneoId, setTorneoId] = useState<number | null>(null);
  const [posiciones, setPosiciones] = useState<any[]>([]);
  const [partidos, setPartidos] = useState<any[]>([]);
  const [proximos, setProximos] = useState<any[]>([]);
  const [activeNav, setActiveNav] = useState("inicio");

  useEffect(() => {
    fetchPublic<any[]>("/api/torneos/").then(data => {
      setTorneos(data);
      if (data.length > 0) setTorneoId(data[0].id);
    }).catch(() => {});
    fetchPublic<any[]>("/api/partidos/proximos?limit=5").then(setProximos).catch(() => {});
  }, []);

  useEffect(() => {
    if (!torneoId) return;
    fetchPublic<any[]>(`/api/estadisticas/torneo/${torneoId}/posiciones`).then(setPosiciones).catch(() => setPosiciones([]));
    fetchPublic<any[]>(`/api/partidos/torneo/${torneoId}`).then(setPartidos).catch(() => setPartidos([]));
  }, [torneoId]);

  const finalizados = partidos.filter(p => p.estado === "finalizado").slice(-8).reverse();

  const navLinks = [
    { id: "inicio", label: "Inicio" },
    { id: "clasificacion", label: "Clasificación" },
    { id: "resultados", label: "Resultados" },
    { id: "proximos", label: "Próximos" },
  ];

  const scrollTo = (id: string) => {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white border-b border-gray-100 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="leading-none">
              <div className="text-xs font-bold text-red-600 tracking-widest">OLIMPIADAS</div>
              <div className="text-sm font-black text-gray-900 tracking-widest">PERÚ</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            {navLinks.map(n => (
              <button key={n.id} onClick={() => scrollTo(n.id)}
                className={`transition-colors ${activeNav === n.id ? "text-red-600 border-b-2 border-red-600 pb-0.5" : "hover:text-gray-900"}`}>
                {n.label}
              </button>
            ))}
          </div>
          <Link href="/login" className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
            Iniciar Sesión
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section id="inicio" className="relative pt-16 h-[520px] flex items-end pb-16"
        style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #1a0a0a 40%, #2d0808 70%, #0a0a0a 100%)" }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-72 opacity-20"
            style={{ background: "radial-gradient(ellipse, #60a5fa 0%, transparent 70%)" }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-48 opacity-30"
            style={{ background: "radial-gradient(ellipse, #93c5fd 0%, transparent 60%)" }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-6">
          <span className="text-xs font-bold tracking-widest text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-3 py-1 rounded-full">
            PORTAL OFICIAL
          </span>
          <h1 className="mt-4 text-5xl md:text-6xl font-black text-white leading-tight">
            Portal del <span className="text-red-500">Aficionado</span>
          </h1>
          <p className="mt-3 text-gray-300 max-w-lg text-base">
            Sigue de cerca cada competencia, consulta las estadísticas en tiempo real y vive la pasión de las Olimpiadas.
          </p>
          {proximos.length > 0 && (
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> PRÓXIMO
              </span>
              <span className="text-sm font-semibold text-white">
                {proximos[0].local?.nombre ?? "—"} vs {proximos[0].visitante?.nombre ?? "—"}
              </span>
              {proximos[0].fecha_hora && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(proximos[0].fecha_hora).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Clasificación */}
      <section id="clasificacion" className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h2 className="text-3xl font-black text-gray-900">Tabla de Posiciones</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {torneos.map(t => (
              <button key={t.id} onClick={() => setTorneoId(t.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                  torneoId === t.id
                    ? "bg-red-600 text-white border-red-600"
                    : "border-gray-200 text-gray-500 hover:border-gray-400"
                }`}>
                {t.nombre.replace("Olimpiadas PERÚ 2026 – ", "").replace(" (2026)", "")}
              </button>
            ))}
          </div>
        </div>

        {posiciones.length === 0 ? (
          <div className="border border-gray-100 rounded-2xl p-12 text-center text-gray-400 shadow-sm">
            <p className="font-semibold">Sin datos de posiciones aún</p>
            <p className="text-sm mt-1">Los resultados aparecerán aquí conforme se jueguen los partidos</p>
          </div>
        ) : (
          <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-6 py-4">#</th>
                  <th className="text-left px-6 py-4">Equipo</th>
                  <th className="text-center px-4 py-4">PJ</th>
                  <th className="text-center px-4 py-4">PG</th>
                  <th className="text-center px-4 py-4">PE</th>
                  <th className="text-center px-4 py-4">PP</th>
                  <th className="text-center px-4 py-4">PTOS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {posiciones.map(t => (
                  <tr key={t.equipo_id} className={`hover:bg-gray-50/50 transition-colors ${t.posicion === 1 ? "bg-red-50/20" : ""}`}>
                    <td className="px-6 py-4">
                      <span className={`text-xl font-black ${t.posicion === 1 ? "text-red-600" : "text-gray-200"}`}>
                        {String(t.posicion).padStart(2, "0")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-bold">
                            {t.nombre_equipo?.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{t.nombre_equipo}</p>
                          {t.pais && <p className="text-xs text-gray-400">{t.pais_emoji} {t.pais}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-4 py-4 text-gray-600 font-medium text-sm">{t.pj}</td>
                    <td className="text-center px-4 py-4 text-gray-600 font-medium text-sm">{t.pg}</td>
                    <td className="text-center px-4 py-4 text-gray-600 font-medium text-sm">{t.pe ?? 0}</td>
                    <td className="text-center px-4 py-4 text-gray-600 font-medium text-sm">{t.pp}</td>
                    <td className="text-center px-4 py-4">
                      <span className={`text-sm font-black px-3 py-1.5 rounded-lg ${t.posicion === 1 ? "bg-red-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                        {t.puntos}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Resultados */}
      <section id="resultados" className="bg-gray-50 py-14">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-black text-gray-900 mb-6">Últimos Resultados</h2>
          {finalizados.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay resultados registrados aún.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {finalizados.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-3">{p.ronda}</p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex-1 text-right">
                      <p className="font-bold text-gray-900 text-sm leading-tight">{p.local?.nombre ?? "—"}</p>
                      {p.local?.pais && <p className="text-xs text-gray-400">{p.local.pais_emoji} {p.local.pais}</p>}
                    </div>
                    <div className="text-center min-w-[70px]">
                      <span className="text-2xl font-black text-gray-900">
                        {p.resultado_local} – {p.resultado_visitante}
                      </span>
                      <p className="text-xs font-bold text-green-600 mt-0.5">FIN</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm leading-tight">{p.visitante?.nombre ?? "—"}</p>
                      {p.visitante?.pais && <p className="text-xs text-gray-400">{p.visitante.pais_emoji} {p.visitante.pais}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Próximos */}
      <section id="proximos" className="max-w-6xl mx-auto px-6 py-14">
        <h2 className="text-3xl font-black text-gray-900 mb-6">Próximos Encuentros</h2>
        {proximos.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay partidos programados próximamente.</p>
        ) : (
          <div className="space-y-3">
            {proximos.map(p => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm px-6 py-4 flex items-center gap-4">
                {p.fecha_hora && (
                  <div className="text-center min-w-[60px] shrink-0">
                    <p className="text-lg font-black text-gray-900">
                      {new Date(p.fecha_hora).toLocaleDateString("es-PE", { day: "2-digit" })}
                    </p>
                    <p className="text-xs font-bold text-gray-400 uppercase">
                      {new Date(p.fecha_hora).toLocaleDateString("es-PE", { month: "short" })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(p.fecha_hora).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 text-right">
                    <p className="font-bold text-gray-900 text-sm">{p.local?.nombre ?? "—"}</p>
                    {p.local?.pais && <p className="text-xs text-gray-400">{p.local.pais_emoji} {p.local.pais}</p>}
                  </div>
                  <span className="text-sm font-black text-gray-400 min-w-[30px] text-center">VS</span>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">{p.visitante?.nombre ?? "—"}</p>
                    {p.visitante?.pais && <p className="text-xs text-gray-400">{p.visitante.pais_emoji} {p.visitante.pais}</p>}
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-400 shrink-0">{p.ronda}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs text-gray-500">© 2026 Olimpiadas PERÚ. Todos los derechos reservados.</span>
          </div>
          <div className="flex gap-6 text-xs text-gray-400">
            <Link href="/login" className="hover:text-gray-600">Portal Institucional</Link>
            <Link href="/solicitar" className="hover:text-gray-600">Solicitar Acceso</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
