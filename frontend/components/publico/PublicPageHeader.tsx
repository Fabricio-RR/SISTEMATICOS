import TorneoSelector from "./TorneoSelector";

// Encabezado reutilizable de las páginas públicas: título + selector de torneo.
export default function PublicPageHeader({
  eyebrow,
  titulo,
}: {
  eyebrow: string;
  titulo: string;
}) {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">{eyebrow}</p>
        <h1 className="mt-1 font-display text-3xl font-black tracking-tight text-slate-900 md:text-4xl">{titulo}</h1>
        <div className="mt-6">
          <TorneoSelector />
        </div>
      </div>
    </div>
  );
}
