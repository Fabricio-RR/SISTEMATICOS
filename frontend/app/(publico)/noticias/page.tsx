"use client";
import NoticiasList from "@/components/publico/NoticiasList";

// Página de noticias: novedades publicadas del evento.
export default function NoticiasPage() {
  return (
    <>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Novedades</p>
          <h1 className="mt-1 font-display text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Noticias</h1>
        </div>
      </div>
      <section className="mx-auto max-w-6xl px-6 py-10">
        <NoticiasList />
      </section>
    </>
  );
}
