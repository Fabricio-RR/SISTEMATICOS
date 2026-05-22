"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Trophy, LayoutDashboard, UserPlus, CalendarDays,
  BarChart3, LogOut, ChevronRight, Bell, ExternalLink,
} from "lucide-react";

const navItems = [
  { href: "/institucion", label: "Resumen", icon: LayoutDashboard },
  { href: "/institucion/inscripciones", label: "Inscripciones", icon: UserPlus },
  { href: "/institucion/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/institucion/resultados", label: "Resultados", icon: BarChart3 },
];

const breadcrumbLabels: Record<string, string> = {
  "/institucion": "Resumen",
  "/institucion/inscripciones": "Inscripciones",
  "/institucion/calendario": "Calendario",
  "/institucion/resultados": "Resultados",
};

export default function InstitucionLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [nombre, setNombre] = useState("");
  const [listo, setListo] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const rol = localStorage.getItem("rol");
    if (!token) { router.replace("/login"); return; }
    if (rol === "admin") { router.replace("/admin"); return; }
    setNombre(localStorage.getItem("nombre") ?? "Institución");
    setListo(true);
  }, [router]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!listo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function logout() {
    localStorage.clear();
    router.push("/login");
  }

  const inicial = nombre.charAt(0).toUpperCase();
  const pageLabel = breadcrumbLabels[pathname] ?? "Portal";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
              <Trophy className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-black tracking-widest text-red-600 leading-none">OLIMPIADAS</p>
              <p className="text-[11px] font-black tracking-widest text-gray-900 leading-none mt-0.5">PERÚ</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-red-600 text-white font-semibold"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 p-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            Visitar página principal
          </a>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-100 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="font-medium text-gray-700">Portal Institucional</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>{pageLabel}</span>
          </div>

          <div className="flex items-center gap-4">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <Bell className="w-4 h-4" />
            </button>

            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900 leading-none">{nombre}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-none">Institución</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {inicial}
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl border border-gray-100 shadow-lg py-1 z-50">
                  <button
                    onClick={() => { setDropdownOpen(false); logout(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
