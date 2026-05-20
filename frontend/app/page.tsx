"use client";
import Link from "next/link";
import { Trophy, ArrowRight } from "lucide-react";

const tabla = [
  { rango: "01", iniciales: "LP", color: "bg-red-600", nombre: "Lima Patriots", pj: 12, g: 10, e: 2, p: 0, pts: 32, tendencia: [true, true, true] },
  { rango: "02", iniciales: "AC", color: "bg-blue-600", nombre: "Arequipa Condors", pj: 12, g: 9, e: 1, p: 2, pts: 28, tendencia: [true, true, false] },
  { rango: "03", iniciales: "CT", color: "bg-gray-700", nombre: "Cusco Titans", pj: 11, g: 8, e: 1, p: 2, pts: 25, tendencia: [true, false, true] },
];

export default function LandingPage() {
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
            <a href="#inicio" className="text-red-600 border-b-2 border-red-600 pb-0.5">Inicio</a>
            <a href="#clasificacion" className="hover:text-gray-900 transition-colors">Clasificación</a>
            <a href="#brackets" className="hover:text-gray-900 transition-colors">Brackets</a>
            <a href="#resultados" className="hover:text-gray-900 transition-colors">Resultados</a>
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
            OFFICIAL FAN PORTAL
          </span>
          <h1 className="mt-4 text-5xl md:text-6xl font-black text-white leading-tight">
            Portal del <span className="text-red-500">Aficionado</span>
          </h1>
          <p className="mt-3 text-gray-300 max-w-lg text-base">
            Sigue de cerca cada competencia, consulta las estadísticas en tiempo real y vive la pasión de las Olimpiadas.
          </p>
        </div>
      </section>

      {/* Tabla */}
      <section id="clasificacion" className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-gray-900">Tablero General de Posiciones</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg">Temporada 2026</span>
            <span className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">Fase de Grupos</span>
          </div>
        </div>
        <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="text-left px-6 py-4">Rango</th>
                <th className="text-left px-6 py-4">Equipo / Club</th>
                <th className="text-center px-4 py-4">PJ</th>
                <th className="text-center px-4 py-4">G</th>
                <th className="text-center px-4 py-4">E</th>
                <th className="text-center px-4 py-4">P</th>
                <th className="text-center px-4 py-4">PTOS</th>
                <th className="text-center px-4 py-4">Tendencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tabla.map((team) => (
                <tr key={team.rango} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-5"><span className="text-2xl font-black text-gray-200">{team.rango}</span></td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg ${team.color} flex items-center justify-center`}>
                        <span className="text-white text-xs font-bold">{team.iniciales}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{team.nombre}</span>
                    </div>
                  </td>
                  <td className="text-center px-4 py-5 text-gray-600 font-medium">{team.pj}</td>
                  <td className="text-center px-4 py-5 text-gray-600 font-medium">{team.g}</td>
                  <td className="text-center px-4 py-5 text-gray-600 font-medium">{team.e}</td>
                  <td className="text-center px-4 py-5 text-gray-600 font-medium">{team.p}</td>
                  <td className="text-center px-4 py-5">
                    <span className="bg-red-600 text-white text-sm font-black px-3 py-1.5 rounded-lg">{team.pts}</span>
                  </td>
                  <td className="text-center px-4 py-5">
                    <div className="flex justify-center gap-1">
                      {team.tendencia.map((win, i) => (
                        <span key={i} className={`w-2.5 h-2.5 rounded-full ${win ? "bg-green-500" : "bg-red-400"}`} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Llaves */}
      <section id="brackets" className="max-w-6xl mx-auto px-6 pb-16">
        <div className="mb-8">
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Road to Glory • Final Stage</p>
          <h2 className="text-3xl font-black text-gray-900 mt-1">Llaves del Torneo</h2>
        </div>
        <div className="flex gap-4 items-start overflow-x-auto pb-4">
          <div className="min-w-[200px]">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-l-4 border-red-600 pl-3">Cuartos de Final</p>
            <div className="space-y-3">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 flex justify-between"><span className="text-sm text-gray-500">Lima Patriots</span><span className="font-bold text-gray-700">3</span></div>
                <div className="border-t border-gray-200 px-4 py-3 flex justify-between bg-gray-50"><span className="text-sm font-bold">Trujillo Surfers</span><span className="font-black text-red-600 text-lg">4</span></div>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 flex justify-between bg-gray-50"><span className="text-sm font-bold">Arequipa Condors</span><span className="font-black text-red-600 text-lg">2</span></div>
                <div className="border-t border-gray-200 px-4 py-3 flex justify-between"><span className="text-sm text-gray-500">Puno Highs</span><span className="font-bold text-gray-700">1</span></div>
              </div>
            </div>
          </div>
          <div className="flex items-center pt-14"><ArrowRight className="w-5 h-5 text-gray-300" /></div>
          <div className="min-w-[220px]">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-l-4 border-red-600 pl-3">Semifinales</p>
            <div className="border-2 border-red-500 rounded-xl overflow-hidden">
              <div className="bg-red-600 text-white text-xs font-bold px-4 py-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />PRÓXIMO 15 OCT
              </div>
              <div className="px-4 py-3 flex justify-between border-b border-gray-100"><span className="text-sm font-bold">Trujillo Surfers</span><span className="text-sm text-gray-400">VS</span></div>
              <div className="px-4 py-3 flex justify-between"><span className="text-sm font-bold">Arequipa Condors</span><span className="text-xs text-gray-400">—</span></div>
            </div>
          </div>
          <div className="flex items-center pt-14"><ArrowRight className="w-5 h-5 text-gray-300" /></div>
          <div className="min-w-[200px]">
            <p className="text-xs font-black text-red-600 uppercase tracking-wider mb-4">Gran Final</p>
            <div className="bg-gray-900 text-white rounded-xl p-5 text-center">
              <Trophy className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-xs font-bold tracking-widest text-gray-400">COPA BICENTENARIO</p>
              <div className="my-3 text-sm">
                <p className="font-semibold text-gray-300">Finalista A</p>
                <p className="text-xs font-black text-gray-500 my-1">VS</p>
                <p className="font-semibold text-gray-300">Finalista B</p>
              </div>
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Estadio Nacional</p>
              <p className="text-xs text-gray-500 mt-1">25 de Noviembre • 20:00</p>
            </div>
          </div>
        </div>
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
            <a href="#" className="hover:text-gray-600">Privacidad</a>
            <a href="#" className="hover:text-gray-600">Términos y Condiciones</a>
            <a href="#" className="hover:text-gray-600">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}