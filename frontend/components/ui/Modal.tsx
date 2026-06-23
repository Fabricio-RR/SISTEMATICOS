"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type Size = "sm" | "md" | "lg" | "xl";
const SIZES: Record<Size, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
};

/**
 * Diálogo modal accesible: backdrop con blur, cierre por Escape y clic-fuera,
 * bloqueo del scroll de fondo y foco inicial. Slots header/body/footer.
 * Centraliza el patrón de modal repetido en cada pantalla.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  size?: Size;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "animate-rise my-8 w-full overflow-hidden rounded-2xl bg-white shadow-pop outline-none flex flex-col max-h-[90vh]",
          SIZES[size],
        )}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div className="min-w-0">
              {title && <h2 className="text-lg font-bold text-slate-900">{title}</h2>}
              {subtitle && <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
