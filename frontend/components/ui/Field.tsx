import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

const controlCls =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 " +
  "placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent " +
  "disabled:opacity-60 disabled:cursor-not-allowed";

const errorCls = "border-red-300 bg-red-50 focus:ring-red-400";

/** Envoltura de campo con etiqueta, ayuda y error accesibles. */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label} {required && <span className="text-brand-600">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(controlCls, invalid && errorCls, className)} {...props} />;
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(controlCls, "resize-none", invalid && errorCls, className)} {...props} />;
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(controlCls, "cursor-pointer", invalid && errorCls, className)} {...props}>
      {children}
    </select>
  );
});

/** Genera un id estable para enlazar label↔control cuando no se provee uno. */
export function useFieldId(provided?: string): string {
  const auto = useId();
  return provided ?? auto;
}
