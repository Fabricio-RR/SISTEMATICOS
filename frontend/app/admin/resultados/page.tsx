"use client";
import { BarChart3, Save, RefreshCw } from "lucide-react";

const partidos = [
  { deporte: "Fútbol Varones", cancha: "Cancha 1", hora: "14:00", localIni: "U", local: "Univ. Lima", localColor: "bg-red-600", rl: 2, rv: 1, visitanteIni: "P", visitante: "UPC", visitanteColor: "bg-blue-600" },
  { deporte: "Básquet Damas", cancha: "Coliseo A", hora: "15:30", localIni: "P", local: "PUCP", localColor: "bg-blue-700", rl: 0, rv: 0, visitanteIni: "S", visitante: "USIL", visitanteColor: "bg-green-600" },
  { deporte: "Vóley Mixto", cancha: "Cancha 2", hora: "16:45", localIni: "U", local: "UNMSM", localColor: "bg-yellow-600", rl: 0, rv: 0, visitanteIni: "R", visitante: "U. Ricardo Palma", visitanteColor: "bg-purple-600" },
];

const tabla = [
  { pos: 1, nombre: "Univ. de Lima", pj: 6, pts: 15 },
  { pos: 2, nombre: "PUCP", pj: 8, pts: 13 },
  { pos: 3, nombre: "UPC", pj: 5, pts: 11 },
  { pos: 4, nombre: "USIL", pj: 5, pts: 8 },
];

export default function ResultadosPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Portal Administrativo</p>
          <h1 className="text-4xl font-black text-gray-900 mt-1">Resultados</h1>
          <p className="text-sm text-gray-400 mt-1">Gestión de puntajes y rendimiento en tiempo real.</p>
        </div>
        <button className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-md shadow-red-100">
          <Save className="w-4 h-4" /> Guardar Cambios
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Entrada de resultados */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">HOY, 24 MAYO</p>
              <h2 className="font-black text-gray-900">Entrada de Resultados</h2>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
              FASE DE GRUPOS
            </span>
          </div>
          <div>
            <div className="grid grid-cols-4 text-xs font-bold text-gray-400 uppercase tracking-wider px-6 py-3 border-b border-gray-50">
              <span>Evento / Deporte</span>
              <span className="col-span-2 text-center">Equipo Local — Puntaje — Equipo Visitante</span>
            </div>
            {partidos.map((p, i) => (
              <div key={i} className="flex items-center px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
                <div className="w-1/4">
                  <p className="text-sm font-semibold text-gray-900">{p.deporte}</p>
                  <p className="text-xs text-gray-400">{p.cancha} • {p.hora}</p>
                </div>
                <div className="flex-1 flex items-center justify-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg ${p.localColor} flex items-center justify-center`}>
                      <span className="text-white text-xs font-bold">{p.localIni}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 hidden lg:block">{p.local}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2 border border-gray-100">
                    <span className="text-xl font-black text-gray-900">{p.rl}</span>
                    <span className="text-sm text-gray-300">—</span>
                    <span className="text-xl font-black text-gray-900">{p.rv}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 hidden lg:block">{p.visitante}</span>
                    <div className={`w-7 h-7 rounded-lg ${p.visitanteColor} flex items-center justify-center`}>
                      <span className="text-white text-xs font-bold">{p.visitanteIni}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="px-6 py-3">
              <button className="text-xs font-bold text-red-600 hover:text-red-700 tracking-wide">
                CARGAR MÁS ENCUENTROS DEL DÍA
              </button>
            </div>
          </div>
        </div>

        {/* Tabla general */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-black text-gray-900">Tabla General</h2>
              <BarChart3 className="w-4 h-4 text-gray-400" />
            </div>
            <div className="divide-y divide-gray-50">
              {tabla.map((t) => (
                <div key={t.pos} className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-black ${t.pos === 1 ? "text-red-600" : "text-gray-400"}`}>
                      {String(t.pos).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{t.nombre}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-gray-900">{t.pts}</p>
                    <p className="text-[10px] text-gray-400">{t.pj} PJ</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-50">
              <button className="text-xs font-bold text-gray-500 hover:text-gray-700">VER TABLA COMPLETA</button>
            </div>
          </div>

          {/* Estado sistema */}
          <div className="bg-gray-900 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estado del Sistema</p>
              <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <p className="text-4xl font-black">120</p>
            <p className="text-xs text-gray-400 mb-4">Partidos activos</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-400 font-semibold">98.5% Sincronización de Datos</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Última actualización: hace 2 minutos.</p>
          </div>
        </div>
      </div>
    </div>
  );
}