"use client";
import PublicPageHeader from "@/components/publico/PublicPageHeader";
import BracketView from "@/components/publico/BracketView";
import { useTorneoActual } from "@/components/publico/useTorneoActual";

// Página de llaves: muestra el cuadro eliminatorio del torneo elegido.
export default function BracketsPage() {
  const { torneo } = useTorneoActual();
  return (
    <>
      <PublicPageHeader eyebrow="Fase eliminatoria" titulo="Llaves del torneo" />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <BracketView torneoId={torneo?.id} />
      </section>
    </>
  );
}
