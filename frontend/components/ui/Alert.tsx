import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/estilos";

const STYLE: Partial<Record<Tone, { box: string; icon: React.ReactNode }>> = {
  danger:  { box: "bg-red-50 border-red-200 text-red-700",          icon: <AlertCircle className="h-4 w-4 shrink-0" /> },
  success: { box: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: <CheckCircle2 className="h-4 w-4 shrink-0" /> },
  warning: { box: "bg-amber-50 border-amber-200 text-amber-700",     icon: <AlertTriangle className="h-4 w-4 shrink-0" /> },
  info:    { box: "bg-blue-50 border-blue-200 text-blue-700",        icon: <Info className="h-4 w-4 shrink-0" /> },
};

/** Banner de mensaje (error/éxito/aviso) consistente. */
export function Alert({ tone = "danger", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  const s = STYLE[tone] ?? STYLE.danger!;
  return (
    <div className={cn("flex items-center gap-2 rounded-card border px-4 py-3 text-sm", s.box, className)}>
      {s.icon}
      <span className="min-w-0">{children}</span>
    </div>
  );
}
