"use client";
import { useEffect, useState } from "react";
import { Radio, Users, Calendar, Building2, Shuffle, BarChart3, CheckCircle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

const actividadReciente = [
  { icon: CheckCircle, color: "text-green-500", titulo: "Nuevo resultado: Fútbol", sub: "Institución A vs Institución B (2 – 1)", usuario: "Carlos G.", estado: "Verificado", estadoColor: "bg-gray-100 text-gray-600" },
  { icon: Users, color: "text-blue-500", titulo: "Institución U inscribió 5 jugadores", sub: "Básquet Categoría Sub-17", usuario: "Ana M.", estado: "EN PROCESO", estadoColor: "bg-yellow-50 text-yellow-600 border border-yellow-200" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({ deportes: 0, instituciones: 0, equipos: 0 });
  const [vista, setVista] = useState<"vivo" | "proximos">("vivo");

  useEffect(() => {
    Promise.all([api.getDeportes(), api.getInstituciones(), api.getEquipos()])
      .then(([deportes, instituciones, equipos]) => {
        setStats({ deportes: deportes.length, instituciones: instituciones.length, equipos: equipos.length });
      })
      .catch(() => {});
  }, []);

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
        {/* Partidos */}
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
            <p className="text-5xl font-black text-gray-900 mt-1">12</p>
            <p className="text-xs text-gray-400 mt-2">Competiciones activas en 4 sedes deportivas distintas.</p>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gray-50 rounded-full" />
        </div>

        {/* Atletas */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-gray-600" />
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Atletas</p>
            <p className="text-5xl font-black text-gray-900 mt-1">{stats.equipos > 0 ? `${stats.equipos * 12}` : "—"}</p>
            <p className="text-xs text-gray-400 mt-2">Jugadores registrados en el sistema</p>
          </div>
        </div>

        {/* Pendientes */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-gray-600" />
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pendientes</p>
            <p className="text-5xl font-black text-gray-900 mt-1">184</p>
            <p className="text-xs text-gray-400 mt-2">Encuentros por disputar</p>
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-4">Accesos Rápidos</p>
      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          { icon: Building2, titulo: "Gestión de Instituciones", desc: "Inscribe colegios, universidades y clubes. Gestiona los rosters.", link: "/admin/instituciones", cta: "ABRIR CONSOLA" },
          { icon: Shuffle, titulo: "Organizador de Fixtures", desc: "Emparejamientos, sorteos automatizados y gestión de horarios.", link: "/admin/sorteos", cta: "INICIAR ORGANIZADOR" },
          { icon: BarChart3, titulo: "Resultados y Estadísticas", desc: "Ingreso de puntajes en tiempo real y tablas de posiciones.", link: "/admin/resultados", cta: "VER ESTADÍSTICAS" },
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

      {/* Actividad reciente */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-5 border-b border-gray-50">
          <h2 className="font-black text-gray-900 text-lg">Actividad Reciente</h2>
        </div>
        <div>
          <div className="grid grid-cols-3 text-xs font-bold text-gray-400 uppercase tracking-wider px-6 py-3 border-b border-gray-50">
            <span>Actividad</span>
            <span>Usuario</span>
            <span>Estado</span>
          </div>
          {actividadReciente.map((item, i) => (
            <div key={i} className="grid grid-cols-3 items-center px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.titulo}</p>
                  <p className="text-xs text-gray-400">{item.sub}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                  {item.usuario.charAt(0)}
                </div>
                <span className="text-sm text-gray-600">{item.usuario}</span>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg w-fit ${item.estadoColor}`}>
                {item.estado}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}