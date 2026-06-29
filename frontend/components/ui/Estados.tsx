import { Inbox } from "lucide-react";

// Estados reutilizables (vacío / carga) para admin y público. Neutral = slate.

export function Vacio({ titulo, detalle, icon }: { titulo: string; detalle?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <p className="font-semibold text-slate-700">{titulo}</p>
      {detalle && <p className="mt-1 max-w-sm text-sm text-slate-400">{detalle}</p>}
    </div>
  );
}

/** Esqueleto de filas (lista/tabla) con brillo deslizante. */
export function TablaSkeleton({ filas = 6 }: { filas?: number }) {
  return (
    <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
      <div className="h-11 border-b border-slate-100 bg-slate-50" />
      <div className="divide-y divide-slate-50">
        {Array.from({ length: filas }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <div className="skeleton h-6 w-6 rounded" />
            <div className="skeleton h-9 w-9 rounded-lg" />
            <div className="skeleton h-4 flex-1 rounded" />
            <div className="skeleton h-6 w-10 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Esqueleto de grilla de tarjetas. */
export function CardsSkeleton({ items = 6, columnas = true }: { items?: number; columnas?: boolean }) {
  return (
    <div className={columnas ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-4"}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
          <div className="skeleton mb-4 h-3 w-24 rounded" />
          <div className="skeleton mb-3 h-5 w-full rounded" />
          <div className="skeleton h-5 w-2/3 rounded" />
        </div>
      ))}
    </div>
  );
}
