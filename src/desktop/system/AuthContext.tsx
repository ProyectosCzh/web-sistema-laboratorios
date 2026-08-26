import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { logout as apiLogout } from "../../lib/queries/auth";
import { redirectToLogin } from "../../lib/session";
import type { User } from "../../lib/types";

interface AuthValue {
  user: User;
  /** FASE 4c: logout async — revoca la sesión en la API y limpia el caché local. */
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

export function AuthProvider({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  const logout = useCallback(async () => {
    await apiLogout();
    redirectToLogin();
  }, []);

  const value = useMemo(() => ({ user, logout }), [user, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
