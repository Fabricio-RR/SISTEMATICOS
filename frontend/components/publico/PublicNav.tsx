"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
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
  const [sesion, setSesion] = useState<{ nombre: string; rol: string } | null>(null);
  const [menuUsuario, setMenuUsuario] = useState(false);

  useEffect(() => {
    const nombre = localStorage.getItem("nombre");
    const rol = localStorage.getItem("rol");
    if (nombre && rol) setSesion({ nombre, rol });
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    localStorage.removeItem("nombre");
    setSesion(null);
    setMenuUsuario(false);
  };

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
          {sesion ? (
            <div className="relative hidden sm:block">
              <button
                onClick={() => setMenuUsuario(o => !o)}
                className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white">
                  {sesion.nombre.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[100px] truncate">{sesion.nombre}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
              {menuUsuario && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg z-50">
                  <div className="border-b border-slate-50 px-3 py-2 mb-1">
                    <p className="truncate text-xs font-bold text-slate-900">{sesion.nombre}</p>
                    <p className="text-xs text-slate-400">{sesion.rol === "admin" ? "Administrador" : "Institución"}</p>
                  </div>
                  <Link
                    href={sesion.rol === "admin" ? "/admin" : "/institucion"}
                    onClick={() => setMenuUsuario(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <LayoutDashboard className="h-4 w-4 text-slate-400" />
                    Ir al panel
                  </Link>
                  <button
                    onClick={cerrarSesion}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 sm:block"
            >
              Iniciar Sesión
            </Link>
          )}
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
            {sesion ? (
              <>
                <Link
                  href={sesion.rol === "admin" ? "/admin" : "/institucion"}
                  onClick={() => setAbierto(false)}
                  className="mt-1 flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white">
                    {sesion.nombre.charAt(0).toUpperCase()}
                  </div>
                  {sesion.nombre}
                </Link>
                <button
                  onClick={() => { cerrarSesion(); setAbierto(false); }}
                  className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setAbierto(false)}
                className="mt-1 rounded-lg bg-red-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
