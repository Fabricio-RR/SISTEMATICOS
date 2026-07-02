"use client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// QueryClient: el "motor" de React Query, guarda en caché los datos de las peticiones
//              (fetch/axios) que se hagan a la API (por ejemplo, a tu backend FastAPI).
// QueryClientProvider: componente de contexto que hace disponible ese motor
//              a todos los componentes hijos de la aplicación.

export default function Providers({ children }: { children: React.ReactNode }) {
  // Un único QueryClient estable por sesión de cliente (no se recrea en cada render).
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Datos "frescos" 30s: evita refetches redundantes al navegar entre pantallas.
            staleTime: 30_000,
            // Un reintento ante fallos transitorios del backend.
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
