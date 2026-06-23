"use client";
import { useEffect, useState } from "react";
import { Trophy, Users, CalendarDays, Clock } from "lucide-react";
import { api } from "@/lib/api";
import type { Deporte } from "@/types/api";

export default function InstitucionPage() {
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [nombre, setNombre] = useState("");
  const [atletas, setAtletas] = useState(0);
  const [proximos, setProximos] = useState(0);

  useEffect(() => {
    setNombre(localStorage.getItem("nombre") ?? "");

    Promise.all([
      api.me(),
      api.getDeportes(),
      api.getAtletas(),
      api.getPartidos({ estado: "programado" }),
    ]).then(([me, deps, ats, partidos]) => {
      setDeportes(deps);
      api.getEquipos().then((equipos) => {
        const misEquipos = new Set(
          equipos.filter((e) => e.institucion_id === me.institucion_id).map((e) => e.id)
        );
        setAtletas(ats.filter((a) => misEquipos.has(a.club_equipo_id)).length);
      }).catch(() => setAtletas(ats.length));
      setProximos(partidos.length);
    }).catch(() => {});
  }, []);

  const primerNombre = nombre.split(" ")[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Portal institucional</p>
        <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">Bienvenido, {primerNombre}</h1>
        <p className="text-sm text-slate-400 mt-0.5">Olimpiadas PERÚ 2026</p>
      </div>

      {/* Banner */}
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-4">
        <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
          <Trophy className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-red-900">Cuenta activa</p>
          <p className="text-xs text-red-600 mt-0.5">
            Tu institución está participando en Olimpiadas PERÚ 2026. Inscribe tus atletas y lleva el seguimiento de tus resultados.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Atletas inscritos", value: atletas, icon: Users },
          { label: "Deportes disponibles", value: deportes.length, icon: Trophy },
          { label: "Próximos encuentros", value: proximos, icon: CalendarDays },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-slate-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Deportes disponibles */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Deportes del torneo</h2>
        {deportes.length === 0 ? (
          <p className="text-sm text-slate-400">Sin datos disponibles.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {deportes.map((d) => (
              <span
                key={d.id}
                className="px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full border border-red-100"
              >
                {d.nombre}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actividad reciente */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Actividad reciente</h2>
          <span className="text-xs text-slate-400">Hoy</span>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <Clock className="w-8 h-8 text-slate-200 mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-slate-400">Sin actividad reciente</p>
          <p className="text-xs text-slate-300 mt-1">El historial estará disponible próximamente</p>
        </div>
      </div>
    </div>
  );
}
