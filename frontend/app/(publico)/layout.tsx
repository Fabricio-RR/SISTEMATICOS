import Link from "next/link";
import Logo from "@/components/Logo";
import PublicNav from "@/components/publico/PublicNav";
import { TorneoProvider } from "@/components/publico/TorneoContext";
import { PartidoModalProvider } from "@/components/publico/PartidoModalContext";
import PartidoDetalle from "@/components/publico/PartidoDetalle";

// Layout del portal público: navbar, footer y los providers (torneo elegido y
// modal de detalle de partido) que comparten todas las páginas públicas.
export default function PublicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <TorneoProvider>
      <PartidoModalProvider>
        <div className="flex min-h-screen flex-col bg-slate-50">
          <PublicNav />
          <main className="flex-1">{children}</main>

          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
              <div className="flex items-center gap-3">
                <Logo size={28} />
                <span className="text-sm text-slate-500">© 2026 Olimpiadas Perú. Todos los derechos reservados.</span>
              </div>
              <div className="flex gap-6 text-sm text-slate-400">
                <Link href="/login" className="transition-colors hover:text-slate-700">
                  Acceso instituciones
                </Link>
              </div>
            </div>
          </footer>
        </div>
        <PartidoDetalle />
      </PartidoModalProvider>
    </TorneoProvider>
  );
}
