import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:   "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
  secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
  ghost:     "text-slate-500 hover:text-slate-900 hover:bg-slate-100",
  danger:    "bg-red-600 text-white hover:bg-red-700 shadow-sm",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

/**
 * Botón base del sistema. Variantes coherentes, estado `loading`, foco visible
 * accesible y desactivado uniforme. Reemplaza los botones inline copy-paste.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-lg transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
