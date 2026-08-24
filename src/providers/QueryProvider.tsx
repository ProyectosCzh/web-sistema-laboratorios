import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRef, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<QueryClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
          staleTime: 30 * 1000,
        },
        mutations: {
          retry: false,
        },
      },
    });
  }
  return <QueryClientProvider client={clientRef.current}>{children}</QueryClientProvider>;
}
