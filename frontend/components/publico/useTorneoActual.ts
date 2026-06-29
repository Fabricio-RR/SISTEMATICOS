"use client";
import { useMemo } from "react";
import { useDeportes, useTorneos } from "@/lib/hooks";
import type { Deporte, Torneo } from "@/types/api";
import { useTorneoCtx } from "./TorneoContext";

/**
 * Selección de torneo compartida entre las rutas públicas.
 *
 * El torneo elegido vive en memoria (TorneoProvider + localStorage), no en la
 * URL. Si el usuario no eligió nada todavía, se resuelve al primer torneo
 * "en curso" y, en su defecto, al primero disponible.
 */
export function useTorneoActual() {
  const { torneoId, setTorneoId } = useTorneoCtx();

  const deportesQ = useDeportes();
  const torneosQ = useTorneos();

  const deportes: Deporte[] = useMemo(() => deportesQ.data ?? [], [deportesQ.data]);
  const torneos: Torneo[] = useMemo(() => torneosQ.data ?? [], [torneosQ.data]);

  const torneo: Torneo | undefined = useMemo(() => {
    if (torneos.length === 0) return undefined;
    const elegido = torneos.find((t) => t.id === torneoId);
    if (elegido) return elegido;
    return torneos.find((t) => t.estado === "en_curso") ?? torneos[0];
  }, [torneos, torneoId]);

  const deporte: Deporte | undefined = useMemo(
    () => deportes.find((d) => d.id === torneo?.deporte_id),
    [deportes, torneo],
  );

  return {
    deportes,
    torneos,
    deporte,
    torneo,
    seleccionarTorneo: setTorneoId,
    cargando: deportesQ.isLoading || torneosQ.isLoading,
  };
}
