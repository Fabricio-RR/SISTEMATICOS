import { cn } from "@/lib/cn";

/** Superficie base: tarjeta blanca con borde suave y sombra del sistema. */
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-white rounded-card border border-slate-100 shadow-card", className)}
      {...props}
    >
      {children}
    </div>
  );
}
