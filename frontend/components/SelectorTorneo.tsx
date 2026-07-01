"use client";
import { useEffect, useRef, useState } from "react";
import { Trophy, ChevronDown, Search, Check } from "lucide-react";
import type { Torneo } from "@/types/api";

/**
 * Combobox de torneo reutilizable: disparador con el torneo elegido + desplegable
 * con buscador y lista de altura acotada (scroll). Escala con cualquier cantidad
 * de torneos sin ocupar toda la pantalla. Cierra con clic-fuera o Escape.
 *
 * Compartido por las pantallas de Sorteos y Resultados (una sola fuente de verdad).
 */
export function SelectorTorneo({
  torneos,
  deporteNombre,
  value,
  onChange,
  placeholder = "Seleccionar torneo…",
}: {
  torneos: Torneo[];
  deporteNombre: (id: number) => string;
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const seleccionado = torneos.find(t => t.id === value) ?? null;
  const term = q.trim().toLowerCase();
  const filtrados = term
    ? torneos.filter(t =>
        t.nombre.toLowerCase().includes(term) ||
        t.temporada.toLowerCase().includes(term) ||
        deporteNombre(t.deporte_id).toLowerCase().includes(term))
    : torneos;

  return (
    <div ref={ref} className="relative">
      {/* Disparador */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        {seleccionado ? (
          <>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-red-600 shrink-0">
              <Trophy className="w-3.5 h-3.5 text-white" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block font-semibold text-slate-900 truncate">{seleccionado.nombre}</span>
              <span className="block text-xs text-slate-500 truncate capitalize">
                {deporteNombre(seleccionado.deporte_id)} · {seleccionado.temporada}
              </span>
            </span>
            <EstadoBadge estado={seleccionado.estado} />
          </>
        ) : (
          <span className="flex-1 text-left text-slate-400">{placeholder}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Desplegable */}
      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar por nombre, deporte o temporada…"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            {filtrados.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-400">Sin resultados</li>
            ) : filtrados.map(t => {
              const sel = t.id === value;
              return (
                <li key={t.id} role="option" aria-selected={sel}>
                  <button
                    type="button"
                    onClick={() => { onChange(t.id); setOpen(false); setQ(""); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition ${sel ? "bg-red-50" : "hover:bg-slate-50"}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900 truncate">{t.nombre}</span>
                      <span className="block text-xs text-slate-500 truncate capitalize">
                        {deporteNombre(t.deporte_id)} · {t.temporada}
                      </span>
                    </span>
                    <EstadoBadge estado={t.estado} />
                    {sel && <Check className="w-4 h-4 text-red-600 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    inscripcion_abierta: "bg-blue-50 text-blue-700",
    inscripcion_cerrada: "bg-indigo-50 text-indigo-700",
    en_sorteo: "bg-red-50 text-red-700",
    en_curso: "bg-green-50 text-green-700",
    finalizado: "bg-slate-100 text-slate-600",
    suspendido: "bg-amber-50 text-amber-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${map[estado] ?? "bg-slate-100 text-slate-600"}`}>
      {estado.replace(/_/g, " ")}
    </span>
  );
}
