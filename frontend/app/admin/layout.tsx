"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Trophy, LayoutDashboard, Building2, UserPlus, Swords,
  Shuffle, BarChart3, Bell, Settings, LogOut, ChevronRight, Plus, Users
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Inicio", icon: LayoutDashboard },
  { href: "/admin/instituciones", label: "Instituciones", icon: Building2 },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/inscripciones", label: "Inscripciones", icon: UserPlus },
  { href: "/admin/encuentros", label: "Encuentros", icon: Swords },
  { href: "/admin/sorteos", label: "Sorteos", icon: Shuffle },
  { href: "/admin/resultados", label: "Resultados", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [nombre, setNombre] = useState("Admin");
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const rol = localStorage.getItem("rol");
    if (!token) {
      router.replace("/login");
      return;
    }
    if (rol !== "admin") {
      router.replace("/institucion");
      return;
    }
    setNombre(localStorage.getItem("nombre") ?? "Admin");
    setListo(true);
  }, [router]);

  if (!listo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function logout() {
    localStorage.clear();
    router.push("/login");
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col shadow-sm">
        {/* Logo top */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="leading-none">
              <p className="text-[10px] font-black tracking-widest text-red-600">OLIMPIADAS</p>
              <p className="text-sm font-black tracking-widest text-gray-900">PERÚ</p>
            </div>
          </div>
          <div className="mt-3 bg-gray-50 rounded-xl p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">
              {nombre.charAt(0)}
            </div>
            <div className="leading-none">
              <p className="text-xs font-bold text-gray-700">Panel de Admin</p>
              <p className="text-[10px] text-gray-400 mt-0.5">OLIMPIADAS PERÚ</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-red-600 text-white shadow-md shadow-red-100"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
          <Link
            href="/"
            className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-600 transition-all"
          >
            <Trophy className="w-4 h-4" />
            <span className="text-xs">Olimpiadas PERÚ</span>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-100 px-8 h-14 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-semibold text-gray-700">Panel</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Centro de Ayuda</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition">
              <Bell className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition">
              <Settings className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer">
              {nombre.charAt(0)}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>

        {/* FAB */}
        <div className="fixed bottom-6 left-64">
          <button className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-3 rounded-full shadow-lg shadow-red-200 flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" />
            CREAR NUEVO EVENTO
          </button>
        </div>
      </div>
    </div>
  );
}
