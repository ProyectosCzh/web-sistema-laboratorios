import type { User } from "./types";

const SESSION_KEY = "labmanage.session";

/**
 * FASE 4c: la sesión local ya NO guarda tokens (viven en cookies httpOnly
 * lm_* que maneja el BFF). localStorage conserva solo el usuario como caché
 * visual para el primer render; la autoridad siempre es la API.
 */
export interface Session {
  user: User;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    // Nota: sesiones legacy con {token, user} siguen siendo legibles; el token
    // sobrante se descarta y se reemplaza en la próxima escritura.
    if (!parsed || !parsed.user || typeof parsed.user !== "object") return null;
    return { user: parsed.user };
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ user: session.user }));
}

export function updateUserInSession(user: User): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ user }));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  window.location.replace("/");
}

export function redirectToDesktop(): void {
  if (typeof window === "undefined") return;
  window.location.replace("/escritorio");
}
