"use client";
import { useMemo } from "react";
import { usePartidos } from "@/lib/hooks";
import type { EstadoPartido } from "@/types/api";
import { CardsSkeleton, Vacio } from "./Estados";
import PartidoCard from "./PartidoCard";

type Props = {
  torneoId?: number;
  estado: EstadoPartido;
  limite?: number;
  orden?: "asc" | "desc";
  apilado?: boolean;
  /** Si está vacío/cargando, no renderiza nada (útil para previews del inicio). */
  ocultarSiVacio?: boolean;
  vacio?: { titulo: string; detalle?: string };
};

// Grilla genérica de partidos filtrados por estado. Reutilizada para "en vivo"
// (con auto-refresco) y "próximos". Puede ocultarse si no hay datos.
export default function PartidosGrid({
  torneoId,
  estado,
  limite,
  orden = "asc",
  apilado = false,
  ocultarSiVacio = false,
  vacio,
}: Props) {
  const habilitado = torneoId != null;
  const { data, isLoading } = usePartidos(habilitado ? { torneo_id: torneoId, estado } : undefined, {
    enabled: habilitado,
    refetchInterval: estado === "en_curso" ? 15000 : undefined,
  });

  const lista = useMemo(() => {
    const sinFecha = orden === "asc" ? Infinity : 0;
    const arr = [...(data ?? [])].sort((a, b) => {
      const ta = a.fecha_hora ? new Date(a.fecha_hora).getTime() : sinFecha;
      const tb = b.fecha_hora ? new Date(b.fecha_hora).getTime() : sinFecha;
      return orden === "asc" ? ta - tb : tb - ta;
    });
    return limite ? arr.slice(0, limite) : arr;
  }, [data, orden, limite]);

  if (!habilitado || isLoading) {
    if (ocultarSiVacio) return null;
    if (!habilitado) return <Vacio titulo={vacio?.titulo ?? "Selecciona un torneo"} detalle={vacio?.detalle} />;
    return <CardsSkeleton items={limite ?? 6} columnas={!apilado} />;
  }
  if (lista.length === 0) {
    return ocultarSiVacio ? null : <Vacio titulo={vacio?.titulo ?? "Sin partidos"} detalle={vacio?.detalle} />;
  }

  return (
    <div className={apilado ? "grid gap-4" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
      {lista.map((p) => (
        <PartidoCard key={p.id} partido={p} />
      ))}
    </div>
  );
}
