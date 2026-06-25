"use client";
import { useEffect, useState } from "react";
import { Radio, Users, Calendar, Building2, Shuffle, BarChart3, ArrowRight, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function AdminDashboard() {
  const [resumen, setResumen] = useState<any>(null);
  const [pendientes, setPendientes] = useState(0);
  const [vista, setVista] = useState<"vivo" | "proximos">("proximos");
  const [partidosVista, setPartidosVista] = useState<any[]>([]);

  useEffect(() => {
    api.getResumen().then(setResumen).catch(() => {});
    api.getPendientes().then((u: any[]) => setPendientes(u.length)).catch(() => {});
  }, []);

  useEffect(() => {
    if (vista === "vivo") {
      api.getEnCurso().then(setPartidosVista).catch(() => setPartidosVista([]));
    } else {
      api.getProximosPartidos(6).then(setPartidosVista).catch(() => setPartidosVista([]));
    }
  }, [vista]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">Panel de Control</p>
          <h1 className="text-4xl font-black text-gray-900 mt-1">
            Resumen <span className="text-red-600">General</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setVista("vivo")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${vista === "vivo" ? "bg-red-600 text-white shadow-md shadow-red-100" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"}`}
          >
            EN VIVO
          </button>
          <button
            onClick={() => setVista("proximos")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${vista === "proximos" ? "bg-red-600 text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"}`}
          >
            PRÓXIMOS
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {/* Partidos en curso */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" /> EN VIVO
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Partidos en Curso</p>
            <p className="text-5xl font-black text-gray-900 mt-1">
              {resumen ? resumen.partidos_en_curso : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {resumen ? `${resumen.partidos_pendientes} encuentros por disputar` : "Cargando..."}
            </p>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gray-50 rounded-full" />
        </div>

        {/* Atletas */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-gray-600" />
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Atletas Registrados</p>
            <p className="text-5xl font-black text-gray-900 mt-1">
              {resumen ? resumen.atletas : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {resumen ? `En ${resumen.equipos} equipos inscritos` : "Cargando..."}
            </p>
          </div>
        </div>

        {/* Solicitudes pendientes */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Solicitudes Pendientes</p>
            <p className="text-5xl font-black text-gray-900 mt-1">{pendientes}</p>
            <p className="text-xs text-gray-400 mt-2">
              Instituciones esperando aprobación
            </p>
          </div>
        </div>
      </div>

      {/* Stats secundarios */}
      {resumen && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Instituciones", val: resumen.instituciones, color: "text-blue-600" },
            { label: "Torneos Activos", val: resumen.torneos, color: "text-green-600" },
            { label: "Equipos", val: resumen.equipos, color: "text-purple-600" },
            { label: "Partidos Totales", val: resumen.partidos_total, color: "text-gray-600" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
              <p className={`text-2xl font-black ${color}`}>{val}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Panel EN VIVO / PRÓXIMOS */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-8 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="font-black text-gray-900 text-sm">
            {vista === "vivo" ? "⚽ Partidos en Curso" : "📅 Próximos Partidos"}
          </h2>
        </div>
        {partidosVista.length === 0 ? (
          <p className="px-6 py-6 text-sm text-gray-400 text-center">
            {vista === "vivo" ? "No hay partidos en curso en este momento" : "No hay partidos programados próximamente"}
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {partidosVista.map((p: any) => (
              <div key={p.id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-400 uppercase">{p.ronda}</span>
                  {p.fecha_hora && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(p.fecha_hora).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })} {new Date(p.fecha_hora).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                      {p.sede_nombre && <><MapPin className="w-3 h-3 ml-1" /> {p.sede_nombre}</>}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-right">
                    <p className="font-bold text-gray-900 text-sm">{p.local?.nombre ?? "—"}</p>
                    {p.local?.pais && <p className="text-xs text-gray-400">{p.local.pais_emoji} {p.local.pais}</p>}
                  </div>
                  <span className="text-lg font-black text-gray-400 min-w-[40px] text-center">
                    {p.resultado_local !== null ? `${p.resultado_local}–${p.resultado_visitante}` : "vs"}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">{p.visitante?.nombre ?? "—"}</p>
                    {p.visitante?.pais && <p className="text-xs text-gray-400">{p.visitante.pais_emoji} {p.visitante.pais}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accesos rápidos */}
      <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-4">Accesos Rápidos</p>
      <div className="grid grid-cols-3 gap-5">
        {[
          { icon: Building2, titulo: "Gestión de Instituciones", desc: "Inscribe colegios, universidades y clubes. Aprueba solicitudes.", link: "/admin/instituciones", cta: "ABRIR CONSOLA" },
          { icon: Shuffle, titulo: "Organizador de Fixtures", desc: "Emparejamientos, sorteos automatizados y gestión de horarios.", link: "/admin/sorteos", cta: "INICIAR ORGANIZADOR" },
          { icon: BarChart3, titulo: "Resultados y Estadísticas", desc: "Ingreso de puntajes en tiempo real y tablas de posiciones.", link: "/admin/resultados", cta: "VER ESTADÍSTICAS" },
          { icon: Calendar, titulo: "Gestión de Encuentros", desc: "Programa fechas, sedes y árbitros para cada partido.", link: "/admin/encuentros", cta: "VER ENCUENTROS" },
          { icon: Users, titulo: "Usuarios", desc: "Aprueba o rechaza solicitudes de acceso institucional.", link: "/admin/usuarios", cta: "GESTIONAR" },
        ].map(({ icon: Icon, titulo, desc, link, cta }) => (
          <div key={link} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center mb-4">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm leading-snug">{titulo}</h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">{desc}</p>
            <Link href={link} className="mt-4 flex items-center gap-1 text-xs font-black text-red-600 hover:text-red-700 tracking-wide">
              {cta} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
