import type { AuthPayload, User } from "./types";

const SESSION_KEY = "labmanage.session";

export interface Session {
  token: string;
  user: User;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (!parsed || typeof parsed.token !== "string" || !parsed.user) return null;
    return parsed as Session;
  } catch {
    return null;
  }
}

export function setSession(payload: AuthPayload): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ token: payload.token, user: payload.user }),
  );
}

export function updateUserInSession(user: User): void {
  const current = getSession();
  if (!current || typeof window === "undefined") return;
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ token: current.token, user }),
  );
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
