import { cn } from "@/lib/cn";

/**
 * Piezas componibles para tablas admin: contenedor tipo tarjeta con scroll
 * horizontal en móvil y celdas con estilos consistentes. Reemplaza el markup
 * de tabla copy-paste en usuarios/instituciones/equipos/atletas/reportes.
 */
export function TableShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-hidden rounded-card border border-slate-100 bg-white shadow-card", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-5 py-3 text-slate-700 align-middle", className)} {...props}>
      {children}
    </td>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-slate-100 bg-slate-50/60">{children}</thead>;
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-50">{children}</tbody>;
}

export function Tr({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("transition-colors hover:bg-slate-50/70", className)} {...props}>
      {children}
    </tr>
  );
}
