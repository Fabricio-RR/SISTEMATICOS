"use client";
import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";
import { useDeportes, useEquipos, usePartidos } from "@/lib/hooks";
import TorneoSelector from "@/components/publico/TorneoSelector";
import StandingsTable from "@/components/publico/StandingsTable";
import GoleadoresTable from "@/components/publico/GoleadoresTable";
import ResultsList from "@/components/publico/ResultsList";
import NoticiasList from "@/components/publico/NoticiasList";
import PartidosGrid from "@/components/publico/PartidosGrid";
import PartidoCard from "@/components/publico/PartidoCard";
import { useTorneoActual } from "@/components/publico/useTorneoActual";

function Metrica({ valor, etiqueta }: { valor: number | string; etiqueta: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-black text-white md:text-4xl">{valor}</div>
      <div className="mt-0.5 text-xs font-medium uppercase tracking-wider text-slate-400">{etiqueta}</div>
    </div>
  );
}

function SeccionHeader({ titulo, href, accion }: { titulo: string; href: string; accion: string }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="font-display text-xl font-bold text-slate-900">{titulo}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700">
        {accion} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

// Portada del portal: hero con métricas, partidos en vivo, próximos, tabla,
// goleadores, últimos resultados y noticias del torneo seleccionado.
export default function InicioPage() {
  const { torneo } = useTorneoActual();

  // Métricas globales para el hero.
  const deportesQ = useDeportes();
  const equiposQ = useEquipos();
  const finalizadosQ = usePartidos({ estado: "finalizado" });

  // Partidos en vivo del torneo actual (para mostrar la franja solo si hay).
  const vivoQ = usePartidos(torneo ? { torneo_id: torneo.id, estado: "en_curso" } : undefined, {
    enabled: torneo != null,
    refetchInterval: 15000,
  });
  const enVivo = vivoQ.data ?? [];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(60% 80% at 50% 0%, rgba(220,38,38,0.35) 0%, transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-24">
          <span className="inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
            Portal oficial
          </span>
          <h1 className="mt-5 max-w-3xl font-display text-4xl font-black leading-[1.05] text-white md:text-6xl">
            Vive las <span className="text-red-500">Olimpiadas Perú</span> en tiempo real
          </h1>
          <p className="mt-4 max-w-xl text-base text-slate-300 md:text-lg">
            Sigue la clasificación, las llaves de cada disciplina y los marcadores finales de todas las competencias.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/calendario"
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Ver agenda <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/clasificacion"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Clasificación
            </Link>
          </div>

          {/* Métricas reales */}
          <div className="mt-12 flex flex-wrap gap-x-12 gap-y-6 border-t border-white/10 pt-8">
            <Metrica valor={deportesQ.data?.length ?? "—"} etiqueta="Disciplinas" />
            <Metrica valor={equiposQ.data?.length ?? "—"} etiqueta="Equipos" />
            <Metrica valor={finalizadosQ.data?.length ?? "—"} etiqueta="Partidos jugados" />
          </div>
        </div>
      </section>

      {/* Selector */}
      <section className="mx-auto max-w-6xl px-6 pt-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <TorneoSelector />
        </div>
      </section>

      {/* En vivo (solo si hay) */}
      {enVivo.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pt-12">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-slate-900">
            <Radio className="h-5 w-5 text-red-600" /> En vivo
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">{enVivo.length}</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enVivo.map((p) => (
              <PartidoCard key={p.id} partido={p} />
            ))}
          </div>
        </section>
      )}

      {/* Próximos */}
      <section className="mx-auto max-w-6xl px-6 pt-12">
        <SeccionHeader titulo="Próximos partidos" href="/calendario" accion="Ver agenda" />
        <PartidosGrid
          torneoId={torneo?.id}
          estado="programado"
          limite={3}
          orden="asc"
          vacio={{ titulo: "No hay partidos programados", detalle: "Aparecerán aquí en cuanto se agenden." }}
        />
      </section>

      {/* Tabla + goleadores */}
      <section className="mx-auto max-w-6xl px-6 pt-12">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SeccionHeader titulo="Tabla de posiciones" href="/clasificacion" accion="Ver completa" />
            <StandingsTable torneoId={torneo?.id} compacto />
          </div>
          <div>
            <SeccionHeader titulo="Goleadores" href="/clasificacion" accion="Ver todos" />
            <GoleadoresTable torneoId={torneo?.id} limit={5} />
          </div>
        </div>
      </section>

      {/* Últimos resultados */}
      <section className="mx-auto max-w-6xl px-6 pt-12">
        <SeccionHeader titulo="Últimos resultados" href="/resultados" accion="Ver todos" />
        <ResultsList torneoId={torneo?.id} limite={3} />
      </section>

      {/* Noticias */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <SeccionHeader titulo="Noticias" href="/noticias" accion="Ver todas" />
        <NoticiasList limite={3} />
      </section>
    </>
  );
}
