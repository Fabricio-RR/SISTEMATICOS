"use client";
import { useMemo } from "react";
import { Radio } from "lucide-react";
import { usePartidos } from "@/lib/hooks";
import { CardsSkeleton, Vacio } from "./Estados";
import PartidoCard from "./PartidoCard";

// Agenda del torneo: partidos en vivo (arriba) y próximos por fecha.
export default function CalendarioView({ torneoId }: { torneoId?: number }) {
  const habilitado = torneoId != null;

  // Los partidos en vivo se refrescan solos cada 15s.
  const vivoQ = usePartidos(
    habilitado ? { torneo_id: torneoId, estado: "en_curso" } : undefined,
    { enabled: habilitado, refetchInterval: 15000 },
  );
  const proxQ = usePartidos(
    habilitado ? { torneo_id: torneoId, estado: "programado" } : undefined,
    { enabled: habilitado },
  );

  const enVivo = vivoQ.data ?? [];
  const proximos = useMemo(
    () =>
      [...(proxQ.data ?? [])].sort((a, b) => {
        const ta = a.fecha_hora ? new Date(a.fecha_hora).getTime() : Infinity;
        const tb = b.fecha_hora ? new Date(b.fecha_hora).getTime() : Infinity;
        return ta - tb;
      }),
    [proxQ.data],
  );

  if (!habilitado) return <Vacio titulo="Selecciona un torneo" detalle="Elige un deporte y torneo para ver su agenda." />;

  const cargando = vivoQ.isLoading || proxQ.isLoading;

  return (
    <div className="space-y-12">
      {/* En vivo */}
      {enVivo.length > 0 && (
        <div>
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-slate-900">
            <Radio className="h-5 w-5 text-red-600" />
            En vivo
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">{enVivo.length}</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enVivo.map((p) => (
              <PartidoCard key={p.id} partido={p} />
            ))}
          </div>
        </div>
      )}

      {/* Próximos */}
      <div>
        <h2 className="mb-4 font-display text-xl font-bold text-slate-900">Próximos partidos</h2>
        {cargando ? (
          <CardsSkeleton items={6} />
        ) : proximos.length === 0 ? (
          <Vacio
            titulo="No hay partidos programados"
            detalle="Cuando se programen nuevos encuentros aparecerán aquí con su fecha y sede."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proximos.map((p) => (
              <PartidoCard key={p.id} partido={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
