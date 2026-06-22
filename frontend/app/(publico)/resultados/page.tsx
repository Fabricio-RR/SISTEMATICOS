"use client";
import PublicPageHeader from "@/components/publico/PublicPageHeader";
import ResultsList from "@/components/publico/ResultsList";
import { useTorneoActual } from "@/components/publico/useTorneoActual";

// Página de resultados: marcadores finales del torneo elegido.
export default function ResultadosPage() {
  const { torneo } = useTorneoActual();
  return (
    <>
      <PublicPageHeader eyebrow="Marcadores finales" titulo="Resultados" />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <ResultsList torneoId={torneo?.id} />
      </section>
    </>
  );
}
