import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { redirectToLogin, clearSession } from "../../lib/session";
import type { User } from "../../lib/types";

interface AuthValue {
  user: User;
  logout: () => void;
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
  const logout = useCallback(() => {
    clearSession();
    redirectToLogin();
  }, []);

  const value = useMemo(() => ({ user, logout }), [user, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
