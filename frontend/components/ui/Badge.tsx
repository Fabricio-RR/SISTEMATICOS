import { cn } from "@/lib/cn";
import { TONE, type Tone } from "@/lib/estilos";

/** Etiqueta de estado coloreada por tono semántico, con punto opcional. */
export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold",
        t.badge,
        className,
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", t.dot, tone === "warning" && "animate-pulse")} />}
      {children}
    </span>
  );
}
