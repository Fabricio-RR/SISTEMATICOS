/**
 * Encabezado estándar de página admin: eyebrow + título + subtítulo y un slot
 * de acciones a la derecha. Unifica el header repetido en todas las pantallas.
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow = "Administración",
  actions,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
