"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { InstitucionSimilar } from "@/types/api";

/**
 * Consulta en vivo (con debounce) si el nombre/sigla que se está escribiendo se
 * parece a una institución ya registrada. La normalización vive en el backend
 * (`services/instituciones.py`): aquí solo consultamos, nunca recalculamos.
 *
 * - `exacto`: existe una coincidencia idéntica tras normalizar → se debe bloquear.
 * - `similares`: todas las coincidencias (exactas o parecidas) para mostrar aviso.
 */
export function useDuplicadosInstitucion(
  nombre: string,
  nombreCorto?: string,
  excluirId?: number,
) {
  const [similares, setSimilares] = useState<InstitucionSimilar[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const limpio = nombre.trim();
    if (limpio.length < 2) {
      setSimilares([]);
      return;
    }
    let cancelado = false;
    setCargando(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.getInstitucionesSimilares(limpio, nombreCorto?.trim() || undefined, excluirId);
        if (!cancelado) setSimilares(res);
      } catch {
        if (!cancelado) setSimilares([]);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }, 400);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [nombre, nombreCorto, excluirId]);

  const exacto = similares.find((s) => s.exacto) ?? null;
  return { similares, exacto, cargando };
}
