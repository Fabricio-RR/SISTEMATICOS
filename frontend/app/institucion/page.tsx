"use client";
import { useEffect, useState } from "react";
import { Trophy, Users, CalendarDays, BarChart3, Clock } from "lucide-react";
import { api } from "@/lib/api";

export default function InstitucionPage() {
  const [deportes, setDeportes] = useState<any[]>([]);
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    setNombre(localStorage.getItem("nombre") ?? "");
    api.getDeportes().then(setDeportes).catch(() => {});
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Bienvenido, {nombre.split(" ")[0]}</h1>
        <p className="text-sm text-gray-400 mt-1">Portal Institucional · Olimpiadas PERÚ 2026</p>
      </div>

      {/* Banner de estado */}
      <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-bold text-blue-900">Cuenta activa</p>
          <p className="text-sm text-blue-600 mt-0.5">
            Tu institución está participando en Olimpiadas PERÚ 2026. Inscribe tus atletas y lleva el seguimiento de tus resultados.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Atletas inscritos", value: "0", icon: Users, color: "blue" },
          { label: "Deportes disponibles", value: String(deportes.length), icon: Trophy, color: "red" },
          { label: "Próximos encuentros", value: "0", icon: CalendarDays, color: "green" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
              <div className={`w-8 h-8 rounded-xl bg-${color}-50 flex items-center justify-center`}>
                <Icon className={`w-4 h-4 text-${color}-600`} />
              </div>
            </div>
            <p className="text-3xl font-black text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Deportes disponibles */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Deportes del torneo</h2>
        {deportes.length === 0 ? (
          <p className="text-sm text-gray-400">Sin datos disponibles.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {deportes.map((d: any) => (
              <span
                key={d.id}
                className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-100"
              >
                {d.nombre}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actividad */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Actividad reciente</h2>
        <div className="flex flex-col items-center justify-center py-8 text-gray-300">
          <Clock className="w-10 h-10 mb-2" />
          <p className="text-sm">Sin actividad reciente</p>
        </div>
      </div>
    </div>
  );
}