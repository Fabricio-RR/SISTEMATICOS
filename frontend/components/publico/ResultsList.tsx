"use client";
import { useMemo } from "react";
import { usePartidos } from "@/lib/hooks";
import { CardsSkeleton, Vacio } from "./Estados";
import PartidoCard from "./PartidoCard";

// Lista de partidos ya finalizados de un torneo, del más reciente al más antiguo.
export default function ResultsList({
  torneoId,
  limite,
  apilado = false,
}: {
  torneoId?: number;
  limite?: number;
  apilado?: boolean;
}) {
  const { data, isLoading, isError } = usePartidos(
    torneoId != null ? { torneo_id: torneoId, estado: "finalizado" } : undefined,
    { enabled: torneoId != null },
  );

  const resultados = useMemo(() => {
    const ordenados = [...(data ?? [])].sort((a, b) => {
      const ta = a.fecha_hora ? new Date(a.fecha_hora).getTime() : 0;
      const tb = b.fecha_hora ? new Date(b.fecha_hora).getTime() : 0;
      return tb - ta;
    });
    return limite ? ordenados.slice(0, limite) : ordenados;
  }, [data, limite]);

  if (torneoId == null) return <Vacio titulo="Selecciona un torneo" detalle="Elige un deporte y torneo para ver sus resultados." />;
  if (isLoading) return <CardsSkeleton items={limite ?? 6} columnas={!apilado} />;
  if (isError) return <Vacio titulo="No se pudieron cargar los resultados" detalle="Intenta nuevamente en unos momentos." />;
  if (resultados.length === 0) return <Vacio titulo="Aún no hay partidos finalizados" detalle="Los marcadores aparecerán aquí al cerrarse cada encuentro." />;

  return (
    <div className={apilado ? "grid gap-4" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
      {resultados.map((p) => (
        <PartidoCard key={p.id} partido={p} />
      ))}
    </div>
  );
}
