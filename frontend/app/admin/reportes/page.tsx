"use client";
import { Download, Building2, Dumbbell, Users, Trophy, Medal, BarChart3 } from "lucide-react";
import {
  useReporteResumen,
  useParticipantesPorInstitucion,
  useEquiposPorDeporte,
} from "@/lib/hooks";

/** Descarga un arreglo de objetos como CSV (con escapado de comillas). */
function descargarCSV(nombre: string, columnas: { key: string; label: string }[], filas: Record<string, unknown>[]) {
  const escapar = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columnas.map((c) => escapar(c.label)).join(",");
  const body = filas.map((f) => columnas.map((c) => escapar(f[c.key])).join(",")).join("\n");
  const csv = `${head}\n${body}`;
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function MetricCard({ icon: Icon, valor, label }: { icon: React.ElementType; valor: number; label: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-2xl font-black text-gray-900">{valor}</p>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
    </div>
  );
}

// Panel de reportes del admin: resumen general + tablas exportables a CSV.
export default function ReportesPage() {
  const resumenQ = useReporteResumen();
  const participantesQ = useParticipantesPorInstitucion();
  const equiposQ = useEquiposPorDeporte();

  const r = resumenQ.data;
  const participantes = participantesQ.data ?? [];
  const equipos = equiposQ.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-400">Resumen general y reportes exportables de la competencia.</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {resumenQ.isLoading || !r ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-100 bg-white" />
          ))
        ) : (
          <>
            <MetricCard icon={Building2} valor={r.instituciones} label="Instituciones" />
            <MetricCard icon={Dumbbell} valor={r.equipos} label="Equipos" />
            <MetricCard icon={Users} valor={r.atletas} label="Atletas" />
            <MetricCard icon={Trophy} valor={r.deportes} label="Disciplinas" />
            <MetricCard icon={Medal} valor={r.torneos} label="Torneos" />
            <MetricCard icon={BarChart3} valor={r.partidos_jugados} label="Partidos jugados" />
          </>
        )}
      </div>

      {/* Participantes por institución */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-900">Participantes por institución</h2>
          <button
            type="button"
            disabled={participantes.length === 0}
            onClick={() =>
              descargarCSV(
                "participantes_por_institucion",
                [
                  { key: "institucion", label: "Institución" },
                  { key: "equipos", label: "Equipos" },
                  { key: "atletas", label: "Atletas" },
                ],
                participantes as unknown as Record<string, unknown>[],
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-400">
                <th className="px-6 py-3 text-left">Institución</th>
                <th className="px-4 py-3 text-center">Equipos</th>
                <th className="px-4 py-3 text-center">Atletas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {participantesQ.isLoading ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">Cargando…</td></tr>
              ) : participantes.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">Sin datos</td></tr>
              ) : (
                participantes.map((p) => (
                  <tr key={p.institucion_id} className="hover:bg-gray-50/60">
                    <td className="px-6 py-3 font-medium text-gray-900">{p.institucion}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{p.equipos}</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-900">{p.atletas}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Equipos por deporte */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-900">Equipos por disciplina</h2>
          <button
            type="button"
            disabled={equipos.length === 0}
            onClick={() =>
              descargarCSV(
                "equipos_por_disciplina",
                [
                  { key: "deporte", label: "Disciplina" },
                  { key: "equipos", label: "Equipos" },
                ],
                equipos as unknown as Record<string, unknown>[],
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-400">
                <th className="px-6 py-3 text-left">Disciplina</th>
                <th className="px-4 py-3 text-center">Equipos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {equiposQ.isLoading ? (
                <tr><td colSpan={2} className="px-6 py-8 text-center text-gray-400">Cargando…</td></tr>
              ) : equipos.length === 0 ? (
                <tr><td colSpan={2} className="px-6 py-8 text-center text-gray-400">Sin datos</td></tr>
              ) : (
                equipos.map((e) => (
                  <tr key={e.deporte_id} className="hover:bg-gray-50/60">
                    <td className="px-6 py-3 font-medium text-gray-900">{e.deporte}</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-900">{e.equipos}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
