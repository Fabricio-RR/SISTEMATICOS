import { AlertTriangle, Ban } from "lucide-react";
import type { InstitucionSimilar } from "@/types/api";

const MOTIVO_LABEL: Record<InstitucionSimilar["motivo"], string> = {
  exacto: "Idéntica",
  sigla: "Misma sigla",
  parecido: "Nombre parecido",
};

/**
 * Banner que avisa de posibles instituciones duplicadas. Rojo y "duro" cuando
 * hay una coincidencia exacta (no se debe crear), ámbar e informativo cuando solo
 * hay parecidos. Reutilizado por el form de admin, el portal público y la
 * pantalla de aprobación.
 */
export function AvisoDuplicados({ similares }: { similares: InstitucionSimilar[] }) {
  if (similares.length === 0) return null;
  const exacto = similares.some((s) => s.exacto);

  const estilo = exacto
    ? "bg-red-50 border-red-200 text-red-700"
    : "bg-amber-50 border-amber-200 text-amber-800";

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${estilo}`}>
      <div className="flex items-center gap-2 font-semibold">
        {exacto ? <Ban className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
        {exacto
          ? "Esta institución ya parece estar registrada"
          : "Posible duplicado: revisa antes de continuar"}
      </div>
      <ul className="mt-2 space-y-1">
        {similares.slice(0, 4).map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <span className="inline-flex shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold">
              {MOTIVO_LABEL[s.motivo]}
            </span>
            <span className="truncate">
              <span className="font-medium">{s.nombre}</span>
              <span className="opacity-70"> · {s.nombre_corto} · {s.ciudad}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
