"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "olimpiadas:torneo";

type TorneoCtx = {
  /** Torneo elegido por el usuario; null = aún sin elección explícita. */
  torneoId: number | null;
  setTorneoId: (id: number) => void;
};

const Ctx = createContext<TorneoCtx | null>(null);

/**
 * Mantiene el torneo seleccionado en memoria (no en la URL) y lo persiste en
 * localStorage. Vive en el layout público, así que sobrevive a la navegación
 * entre /clasificacion, /brackets y /resultados sin ensuciar la URL.
 */
export function TorneoProvider({ children }: { children: React.ReactNode }) {
  const [torneoId, setId] = useState<number | null>(null);

  // Hidratar desde localStorage tras montar (evita desajustes de SSR).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const n = raw != null ? Number(raw) : NaN;
      if (Number.isInteger(n) && n > 0) setId(n);
    } catch {
      /* localStorage no disponible: se usa el torneo por defecto */
    }
  }, []);

  const setTorneoId = useCallback((id: number) => {
    setId(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      /* persistencia best-effort */
    }
  }, []);

  return <Ctx.Provider value={{ torneoId, setTorneoId }}>{children}</Ctx.Provider>;
}

export function useTorneoCtx() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTorneoCtx debe usarse dentro de <TorneoProvider>");
  return ctx;
}
