"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import Logo from "@/components/Logo";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/calendario", label: "Calendario" },
  { href: "/clasificacion", label: "Clasificación" },
  { href: "/brackets", label: "Llaves" },
  { href: "/resultados", label: "Resultados" },
  { href: "/noticias", label: "Noticias" },
];

// Barra de navegación del portal público. Resalta la sección activa según la
// ruta y se colapsa en un menú hamburguesa en pantallas chicas.
export default function PublicNav() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <Logo size={36} />
          <div className="leading-none">
            <div className="text-[11px] font-bold tracking-[0.2em] text-red-600">OLIMPIADAS</div>
            <div className="text-sm font-black tracking-[0.2em] text-slate-900">PERÚ</div>
          </div>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map(({ href, label }) => {
            const activo = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={activo ? "page" : undefined}
                className={
                  activo
                    ? "rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                }
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 sm:block"
          >
            Iniciar Sesión
          </Link>
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-label="Abrir menú"
            aria-expanded={abierto}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            {abierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      {abierto && (
        <div className="border-t border-slate-100 px-6 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label }) => {
              const activo = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setAbierto(false)}
                  className={
                    activo
                      ? "rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                      : "rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  }
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href="/login"
              onClick={() => setAbierto(false)}
              className="mt-1 rounded-lg bg-red-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
