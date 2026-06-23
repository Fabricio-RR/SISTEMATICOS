import type { Config } from "tailwindcss";

/**
 * Design tokens del sistema. Los colores se definen como canales RGB en CSS
 * variables (ver app/globals.css) para soportar opacidad (`bg-brand-600/40`) y
 * dejar preparado un futuro tema oscuro sin reescribir clases.
 */
const brand = (shade: number) => `rgb(var(--brand-${shade}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Color de marca (rojo Olimpiadas) — usar `brand-600` como acento principal.
        brand: {
          50: brand(50),
          100: brand(100),
          200: brand(200),
          300: brand(300),
          400: brand(400),
          500: brand(500),
          600: brand(600),
          700: brand(700),
          800: brand(800),
          900: brand(900),
          DEFAULT: brand(600),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      borderRadius: {
        card: "0.875rem", // 14px — radio estándar de tarjetas/superficies
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        pop: "0 10px 30px -12px rgb(15 23 42 / 0.25)",
      },
      ringColor: {
        brand: brand(500),
      },
    },
  },
  plugins: [],
};
export default config;
