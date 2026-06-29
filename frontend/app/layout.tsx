import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

// Fuentes optimizadas y autoalojadas por Next. Se exponen como variables CSS
// (--font-sans / --font-display) que consumen Tailwind y globals.css.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Olimpiadas Perú",
  description: "Sistema de gestión para Olimpiadas Perú",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${sora.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
