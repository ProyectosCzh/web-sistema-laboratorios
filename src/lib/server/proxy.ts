/**
 * Helpers PUROS del BFF (usados por pages/api): reconstrucción de URLs hacia
 * la API privada, filtrado de headers, cookies lm_* y fetch con timeout.
 * Sin estado compartido: todo entra por parámetros.
 */

/** Métodos que el proxy acepta del navegador; cualquier otro → 405. */
export const PROXY_ALLOWED_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"] as const;

export type ProxyMethod = (typeof PROXY_ALLOWED_METHODS)[number];

/** Timeout de cada llamada upstream (igual al timeout axios del front). */
export const UPSTREAM_TIMEOUT_MS = 25_000;

/** Rutas internas de la API que NUNCA se proxean al navegador (404). */
const BLOCKED_PATH_ROOTS = new Set(["docs", "openapi.json"]);

export function isBlockedProxyPath(segments: string[]): boolean {
  return segments.length > 0 && BLOCKED_PATH_ROOTS.has(segments[0]!);
}

// ---------------------------------------------------------------------------
// Cookies lm_*
// ---------------------------------------------------------------------------

export const ACCESS_COOKIE_NAME = "lm_access";
export const REFRESH_COOKIE_NAME = "lm_refresh";

/** max-age de la cookie de refresh: 7 días (REFRESH_TOKEN_TTL_DAYS de la API). */
export const REFRESH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Cookie Secure solo cuando WEB_COOKIE_SECURE=true (HTTPS/reverse proxy).
 * En dev/local queda false para poder probar sobre http://localhost.
 */
export function webCookieSecure(): boolean {
  return import.meta.env.WEB_COOKIE_SECURE === "true";
}

/**
 * Segundos del TTL del access token para el max-age de lm_access. Lee la misma
 * convención vercel/ms que la API (ACCESS_TOKEN_TTL): "900", "15m", "1h", "2d".
 * Default 900s (15m) si falta o es inválida.
 */
export function accessCookieMaxAgeSeconds(): number {
  const raw = import.meta.env.ACCESS_TOKEN_TTL as string | undefined;
  if (!raw) return 15 * 60;
  const match = /^(\d+)\s*(s|m|h|d)?$/i.exec(raw.trim());
  if (!match) return 15 * 60;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return 15 * 60;
  const unit = (match[2] ?? "s").toLowerCase();
  const multiplier = unit === "m" ? 60 : unit === "h" ? 60 * 60 : unit === "d" ? 24 * 60 * 60 : 1;
  return Math.floor(value * multiplier);
}

/** Parseo tolerante del header Cookie en un mapa nombre→valor. */
export function parseCookieHeader(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Upstream
// ---------------------------------------------------------------------------

/** `${API_URL}/${subPath}${search}` tolerando barras sobrantes. */
export function buildUpstreamUrl(apiUrl: string, subPath: string, search: string): string {
  const base = apiUrl.replace(/\/+$/, "");
  const rest = subPath.replace(/^\/+/, "");
  return `${base}/${rest}${search ?? ""}`;
}

export interface UpstreamHeaderOptions {
  original: Headers;
  method: string;
  hasBody: boolean;
  /** Header Cookie ya reconstruido por el caller (puede incluir lm_*). */
  cookieHeader?: string | null;
  /** Bearer inyectado desde lm_access; si no hay, se respeta el del navegador SOLO sin cookies lm_*. */
  bearer?: string | null;
  hasLmCookies?: boolean;
}

/**
 * Whitelist de headers reenviados upstream. La Authorization entrante se elimina
 * cuando existen cookies lm_* (la autoridad es la cookie); sin cookies lm_* se
 * deja pasar para compatibilidad con devs que llaman directo a /api con token.
 */
export function buildUpstreamHeaders(opts: UpstreamHeaderOptions): Headers {
  const headers = new Headers();

  headers.set("accept", "application/json");
  if (opts.hasBody) {
    headers.set("content-type", opts.original.get("content-type") ?? "application/json");
  }
  if (opts.cookieHeader) headers.set("cookie", opts.cookieHeader);

  if (opts.bearer) {
    headers.set("authorization", `Bearer ${opts.bearer}`);
  } else if (!opts.hasLmCookies && opts.original.get("authorization")) {
    headers.set("authorization", opts.original.get("authorization")!);
  }

  return headers;
}

/** Headers de la respuesta upstream que sí se propagan al navegador. */
export function pickResponseHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers();
  const contentType = upstreamHeaders.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const cacheControl = upstreamHeaders.get("cache-control");
  if (cacheControl) headers.set("cache-control", cacheControl);
  return headers;
}

/**
 * fetch hacia la API privada con AbortController y timeout duro
 * (UPSTREAM_TIMEOUT_MS). Lanza si vence el timeout; el caller decide el 502/504.
 */
export async function fetchUpstream(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Respuesta JSON uniforme para errores generados por el propio BFF. */
export function bffJsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
