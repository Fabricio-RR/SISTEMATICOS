"use client";
import PublicPageHeader from "@/components/publico/PublicPageHeader";
import CalendarioView from "@/components/publico/CalendarioView";
import { useTorneoActual } from "@/components/publico/useTorneoActual";

// Página de calendario: partidos en vivo y próximos del torneo elegido.
export default function CalendarioPage() {
  const { torneo } = useTorneoActual();
  return (
    <>
      <PublicPageHeader eyebrow="En vivo y próximos" titulo="Calendario" />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <CalendarioView torneoId={torneo?.id} />
      </section>
    </>
  );
}
