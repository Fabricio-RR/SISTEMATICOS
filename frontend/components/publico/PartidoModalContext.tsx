"use client";
import { createContext, useCallback, useContext, useState } from "react";
import type { Partido } from "@/types/api";

type PartidoModalCtx = {
  partido: Partido | null;
  abrir: (p: Partido) => void;
  cerrar: () => void;
};

const Ctx = createContext<PartidoModalCtx | null>(null);

/** Estado del modal de detalle de partido, compartido por todas las tarjetas. */
export function PartidoModalProvider({ children }: { children: React.ReactNode }) {
  const [partido, setPartido] = useState<Partido | null>(null);
  const abrir = useCallback((p: Partido) => setPartido(p), []);
  const cerrar = useCallback(() => setPartido(null), []);
  return <Ctx.Provider value={{ partido, abrir, cerrar }}>{children}</Ctx.Provider>;
}

export function usePartidoModal() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePartidoModal debe usarse dentro de <PartidoModalProvider>");
  return ctx;
}
