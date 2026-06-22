"use client";
import { useEffect, useState } from "react";
import { X, Newspaper } from "lucide-react";
import { useNoticias } from "@/lib/hooks";
import type { Noticia } from "@/types/api";
import { CardsSkeleton, Vacio } from "./Estados";

function fecha(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
}

function NoticiaModal({ noticia, cerrar }: { noticia: Noticia; cerrar: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [cerrar]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={cerrar}>
      <div
        role="dialog"
        aria-modal="true"
        className="animate-rise max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {noticia.imagen_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={noticia.imagen_url} alt="" className="h-56 w-full object-cover" />
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-600">{fecha(noticia.fecha_publicacion)}</p>
              <h2 className="mt-1 font-display text-2xl font-black text-slate-900">{noticia.titulo}</h2>
            </div>
            <button type="button" onClick={cerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Texto plano (no se interpreta HTML) para evitar XSS. */}
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{noticia.contenido}</p>
        </div>
      </div>
    </div>
  );
}

function NoticiaCard({ noticia, onClick }: { noticia: Noticia; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
        {noticia.imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={noticia.imagen_url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <Newspaper className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-600">{fecha(noticia.fecha_publicacion)}</p>
        <h3 className="mt-1 font-display text-lg font-bold leading-snug text-slate-900">{noticia.titulo}</h3>
        <p className="mt-2 line-clamp-3 text-sm text-slate-500">{noticia.contenido}</p>
      </div>
    </button>
  );
}

// Grilla de noticias publicadas. Al hacer clic en una se abre el modal de lectura.
export default function NoticiasList({ limite }: { limite?: number }) {
  const { data, isLoading, isError } = useNoticias();
  const [abierta, setAbierta] = useState<Noticia | null>(null);

  if (isLoading) return <CardsSkeleton items={limite ?? 3} />;
  if (isError) return <Vacio titulo="No se pudieron cargar las noticias" />;

  const noticias = (data ?? []).filter((n) => n.esta_publicado);
  const visibles = limite ? noticias.slice(0, limite) : noticias;

  if (visibles.length === 0) {
    return <Vacio titulo="Aún no hay noticias" detalle="Las novedades de los Juegos aparecerán aquí." />;
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((n) => (
          <NoticiaCard key={n.id} noticia={n} onClick={() => setAbierta(n)} />
        ))}
      </div>
      {abierta && <NoticiaModal noticia={abierta} cerrar={() => setAbierta(null)} />}
    </>
  );
}
