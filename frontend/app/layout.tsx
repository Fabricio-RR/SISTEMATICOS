import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Olimpiadas Perú",
  description: "Sistema de gestión para Olimpiadas Perú",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
