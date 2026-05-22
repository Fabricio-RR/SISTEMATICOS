"use client";
import { useEffect, useState } from "react";
import {
  Radio, Users, Calendar, Building2, Shuffle,
  BarChart3, Clock, ArrowRight, Trophy, Dumbbell,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

interface Stats {
  deportes: number;
  instituciones: number;
  equipos: number;
  enCurso: number;
  programados: number;
  atletas: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    deportes: 0, instituciones: 0, equipos: 0,
    enCurso: 0, programados: 0, atletas: 0,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.getDeportes(),
      api.getInstituciones(),
      api.getEquipos(),
      api.getPartidos({ estado: "en_curso" }),
      api.getPartidos({ estado: "programado" }),
      api.getAtletas(),
    ])
      .then(([deportes, instituciones, equipos, enCurso, programados, atletas]) => {
        setStats({
          deportes: deportes.length,
          instituciones: instituciones.length,
          equipos: equipos.length,
          enCurso: enCurso.length,
          programados: programados.length,
          atletas: atletas.length,
        });
      })
      .catch(() =>
        setError("No se pudo conectar con el servidor. Verifica que el backend esté activo.")
      );
  }, []);

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Panel de control</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Resumen general</h1>
        </div>
        <Link
          href="/admin/encuentros"
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Nuevo evento
        </Link>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-500">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              EN VIVO
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.enCurso}</p>
          <p className="text-sm font-medium text-gray-500 mt-1">Partidos en curso</p>
          <p className="text-xs text-gray-300 mt-0.5">Activos en este momento</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="mb-4">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.atletas}</p>
          <p className="text-sm font-medium text-gray-500 mt-1">Atletas registrados</p>
          <p className="text-xs text-gray-300 mt-0.5">En el sistema</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="mb-4">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-gray-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.programados}</p>
          <p className="text-sm font-medium text-gray-500 mt-1">Encuentros pendientes</p>
          <p className="text-xs text-gray-300 mt-0.5">Por disputar</p>
        </div>
      </div>

      {/* Stats secundarias */}
      <div className="grid grid-cols-3 gap-5">
        <Link href="/admin/deportes" className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stats.deportes}</p>
              <p className="text-xs text-gray-400">Deportes activos</p>
            </div>
          </div>
        </Link>
        <Link href="/admin/instituciones" className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stats.instituciones}</p>
              <p className="text-xs text-gray-400">Instituciones</p>
            </div>
          </div>
        </Link>
        <Link href="/admin/equipos" className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stats.equipos}</p>
              <p className="text-xs text-gray-400">Equipos</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Accesos rápidos */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">Accesos rápidos</p>
        <div className="grid grid-cols-3 gap-5">
          {[
            {
              icon: Building2,
              titulo: "Gestión de Instituciones",
              desc: "Inscribe colegios, universidades y clubes. Gestiona los rosters.",
              link: "/admin/instituciones",
              cta: "Abrir consola",
            },
            {
              icon: Shuffle,
              titulo: "Organizador de Fixtures",
              desc: "Emparejamientos, sorteos automatizados y gestión de horarios.",
              link: "/admin/sorteos",
              cta: "Iniciar organizador",
            },
            {
              icon: BarChart3,
              titulo: "Resultados y Estadísticas",
              desc: "Ingreso de puntajes en tiempo real y tablas de posiciones.",
              link: "/admin/resultados",
              cta: "Ver estadísticas",
            },
          ].map(({ icon: Icon, titulo, desc, link, cta }) => (
            <Link
              key={link}
              href={link}
              className="group bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-4 h-4 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{titulo}</h3>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{desc}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 group-hover:gap-2 transition-all">
                {cta}
                <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Actividad reciente</h2>
          <span className="text-xs text-gray-400">Hoy</span>
        </div>
        <div className="flex flex-col items-center justify-center py-14">
          <Clock className="w-8 h-8 text-gray-200 mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-gray-400">Sin actividad reciente</p>
          <p className="text-xs text-gray-300 mt-1">El log de auditoría estará disponible próximamente</p>
        </div>
      </div>
    </div>
  );
}
