"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Trophy, LayoutDashboard, Building2, UserPlus, Swords,
  Shuffle, BarChart3, LogOut, Users, ChevronRight, Bell, ExternalLink,
  Dumbbell, Medal, Menu, X
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
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [nombre, setNombre] = useState("Admin");
  const [listo, setListo] = useState(false);
  
  // Estados de UI
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const rol = localStorage.getItem("rol");
    if (!token) { router.replace("/login"); return; }
    if (rol !== "admin") { router.replace("/institucion"); return; }
    setNombre(localStorage.getItem("nombre") ?? "Admin");
    setListo(true);
  }, [router]);

  // Accesibilidad: Cierra el dropdown al hacer click fuera o presionar Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Función inteligente para determinar el título de la página actual
  const getPageLabel = (path: string) => {
    if (path === "/admin") return breadcrumbLabels["/admin"];
    const matchedKey = Object.keys(breadcrumbLabels).find(
      key => key !== "/admin" && path.startsWith(key)
    );
    return matchedKey ? breadcrumbLabels[matchedKey] : "Panel";
  };

  if (!listo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  async function logout() {
    await api.logout();
    router.push("/login");
  }

  const pageLabel = getPageLabel(pathname);
  const inicial = nombre.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* Overlay oscuro para móviles */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-gray-100 flex flex-col shrink-0
          transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0
        `}
      >
        {/* Logo y Botón de cierre en móvil */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
              <Trophy className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-black tracking-widest text-red-600 leading-none">OLIMPIADAS</p>
              <p className="text-[11px] font-black tracking-widest text-gray-900 leading-none mt-0.5">PERÚ</p>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            // Lógica de ruta activa inteligente
            const active = href === "/admin" 
              ? pathname === "/admin" 
              : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)} // Auto-cierre en móvil al navegar
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

        {/* Footer sidebar */}
        <div className="border-t border-gray-100 p-3 shrink-0">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            Página principal
          </a>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-100 px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Botón menú hamburguesa (Móvil) */}
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 -ml-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="font-medium text-gray-700 hidden sm:inline">Admin</span>
              <ChevronRight className="w-3.5 h-3.5 hidden sm:block" />
              <span className="text-gray-900 sm:text-gray-400 font-semibold sm:font-normal">{pageLabel}</span>
            </div>
          </div>

          {/* Right: bell + perfil */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1">
              <Bell className="w-4 h-4" />
            </button>

            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2.5 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded-full pl-2 pr-1 py-1"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 leading-none">{nombre}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-none">Administrador</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                  {inicial}
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl border border-gray-100 shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}