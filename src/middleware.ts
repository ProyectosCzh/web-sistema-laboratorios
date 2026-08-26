import { defineMiddleware } from "astro:middleware";

/**
 * Security headers en TODA respuesta (FASE 4a):
 * - Enforced: CSP mínima con frame-ancestors 'none' (anti-clickjacking).
 * - Report-Only: CSP completa para observar violaciones sin romper nada.
 * Entorno dev/local sin reverse proxy: no se fuerzan headers HTTPS aquí.
 */

const ENFORCED_CSP = "frame-ancestors 'none'";

const REPORT_ONLY_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "img-src 'self' data:",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": ENFORCED_CSP,
  "Content-Security-Policy-Report-Only": REPORT_ONLY_CSP,
};

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (!response) return response;

  // Los headers de un Response pueden ser inmutables según el runtime:
  // se reconstruye la respuesta conservando body/status.
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
