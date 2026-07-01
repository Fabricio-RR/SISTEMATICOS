"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Trophy, LayoutDashboard, Building2, UserPlus, Swords,
  Shuffle, BarChart3, LogOut, Users, ChevronRight, Bell, ExternalLink,
  Dumbbell, Medal, PieChart,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Inicio", icon: LayoutDashboard },
  { href: "/admin/instituciones", label: "Instituciones", icon: Building2 },
  { href: "/admin/deportes", label: "Deportes", icon: Trophy },
  { href: "/admin/equipos", label: "Equipos", icon: Dumbbell },
  { href: "/admin/torneos", label: "Torneos", icon: Medal },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/inscripciones", label: "Inscripciones", icon: UserPlus },
  { href: "/admin/encuentros", label: "Encuentros", icon: Swords },
  { href: "/admin/sorteos", label: "Sorteos", icon: Shuffle },
  { href: "/admin/resultados", label: "Resultados", icon: BarChart3 },
  { href: "/admin/reportes", label: "Reportes", icon: PieChart },
];

const breadcrumbLabels: Record<string, string> = {
  "/admin": "Inicio",
  "/admin/instituciones": "Instituciones",
  "/admin/deportes": "Deportes",
  "/admin/equipos": "Equipos",
  "/admin/torneos": "Torneos",
  "/admin/usuarios": "Usuarios",
  "/admin/inscripciones": "Inscripciones",
  "/admin/encuentros": "Encuentros",
  "/admin/sorteos": "Sorteos",
  "/admin/resultados": "Resultados",
  "/admin/reportes": "Reportes",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [nombre, setNombre] = useState("Admin");
  const [listo, setListo] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const rol = localStorage.getItem("rol");
    if (!token) { router.replace("/login"); return; }
    if (rol !== "admin") { router.replace("/institucion"); return; }
    setNombre(localStorage.getItem("nombre") ?? "Admin");
    setListo(true);
  }, [router]);

  // Cierra el dropdown al hacer click fuera
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  async function logout() {
    await api.logout();
    router.push("/login");
  }

  const pageLabel = breadcrumbLabels[pathname] ?? "Panel";
  const inicial = nombre.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-slate-100 flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
              <Trophy className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-black tracking-widest text-brand-600 leading-none">OLIMPIADAS</p>
              <p className="text-[11px] font-black tracking-widest text-slate-900 leading-none mt-0.5">PERÚ</p>
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
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-brand-600 text-white font-semibold shadow-sm shadow-brand-600/30"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="border-t border-slate-100 p-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            Visitar página principal
          </a>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-100 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="font-medium text-slate-700">Admin</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>{pageLabel}</span>
          </div>

          {/* Right: bell + perfil */}
          <div className="flex items-center gap-4">
            <button
              aria-label="Notificaciones"
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Bell className="w-4 h-4" />
            </button>

            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              >
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900 leading-none">{nombre}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-none">Admin</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {inicial}
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-card border border-slate-100 shadow-pop py-1 z-50">
                  <button
                    onClick={() => { setDropdownOpen(false); logout(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Contenido de la página */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
