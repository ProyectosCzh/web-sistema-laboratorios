import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import { clearSession, getSession, setSession as persistSession } from "./session";
import type { User, UserRole } from "./types";

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<{ token: string; user: User } | null>(() => getSession());

  useEffect(() => {
    const token = session?.token;
    if (!token) return;

    let cancelled = false;

    void api
      .get<{ user: User }>("/auth/me")
      .then((res) => {
        if (cancelled) return;
        persistSession(token, res.data.user);
        setSessionState({ token, user: res.data.user });
      })
      .catch(() => {
        // 401 handling is centralized in api interceptor (clear + redirect).
      });

    return () => {
      cancelled = true;
    };
  }, [session?.token]);

  const login = (token: string, user: User) => {
    persistSession(token, user);
    setSessionState({ token, user });
  };

  const logout = () => {
    clearSession();
    setSessionState(null);
  };

  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, token: session?.token ?? null, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
    }
  }, [token]);

  if (!token) return null;
  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const { user } = useAuth();

  if (!user || user.role !== role) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-gray-800">Sin permisos</p>
          <p className="mt-1 text-sm text-gray-600">Esta sección es exclusiva para encargados.</p>
          <a href="/" className="mt-4 inline-block text-blue-600 underline">
            Volver al inicio
          </a>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
