"use client";
import PublicPageHeader from "@/components/publico/PublicPageHeader";
import StandingsTable from "@/components/publico/StandingsTable";
import GoleadoresTable from "@/components/publico/GoleadoresTable";
import { useTorneoActual } from "@/components/publico/useTorneoActual";

// Página de clasificación: tabla de posiciones + goleadores del torneo elegido.
export default function ClasificacionPage() {
  const { torneo } = useTorneoActual();
  return (
    <>
      <PublicPageHeader eyebrow="Tabla de posiciones" titulo="Clasificación" />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <h2 className="mb-4 font-display text-xl font-bold text-slate-900">Posiciones</h2>
            <StandingsTable torneoId={torneo?.id} />
          </div>
          <div>
            <h2 className="mb-4 font-display text-xl font-bold text-slate-900">Goleadores</h2>
            <GoleadoresTable torneoId={torneo?.id} />
          </div>
        </div>
      </section>
    </>
  );
}
