import type { APIRoute } from "astro";
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  PROXY_ALLOWED_METHODS,
  UPSTREAM_TIMEOUT_MS,
  bffJsonError,
  buildUpstreamHeaders,
  buildUpstreamUrl,
  fetchUpstream,
  isBlockedProxyPath,
  parseCookieHeader,
  pickResponseHeaders,
} from "../../lib/server/proxy";

/**
 * BFF catch-all (FASE 4b): el navegador SOLO habla con este origen (/api/**).
 * La URL real de la API vive en API_URL (privada, sin PUBLIC_) y nunca se
 * expone. Los tokens viajan en cookies httpOnly lm_* y este proxy los inyecta
 * como Authorization hacia la API.
 */

const API_URL = import.meta.env.API_URL as string | undefined;

export const ALL: APIRoute = async ({ request, params }) => {
  const method = request.method.toUpperCase();

  // Whitelist de métodos.
  if (!(PROXY_ALLOWED_METHODS as readonly string[]).includes(method)) {
    return bffJsonError(405, "METHOD_NOT_ALLOWED", "Método no permitido");
  }

  // Documentación interna de la API: bloqueada para el navegador.
  const segments = (params.path ?? "").split("/").filter(Boolean);
  if (isBlockedProxyPath(segments)) {
    return bffJsonError(404, "NOT_FOUND", "Recurso no encontrado");
  }

  if (!API_URL) {
    return bffJsonError(500, "BFF_MISCONFIGURED", "El BFF no tiene configurada la API");
  }

  const search = new URL(request.url).search;
  const upstreamUrl = buildUpstreamUrl(API_URL, segments.join("/"), search);

  // Authorization solo server-side: si hay cookies lm_* manda lm_access;
  // cualquier Authorization del navegador se descarta en ese caso.
  const cookieMap = parseCookieHeader(request.headers.get("cookie"));
  const hasLmCookies = Boolean(cookieMap[ACCESS_COOKIE_NAME] || cookieMap[REFRESH_COOKIE_NAME]);
  const bearer = cookieMap[ACCESS_COOKIE_NAME] ?? null;

  const rawBody = method === "GET" ? undefined : await request.arrayBuffer();
  const hasBody = Boolean(rawBody && rawBody.byteLength > 0);

  const upstreamHeaders = buildUpstreamHeaders({
    original: request.headers,
    method,
    hasBody,
    cookieHeader: request.headers.get("cookie"),
    bearer,
    hasLmCookies,
  });

  let upstream: Response;
  try {
    upstream = await fetchUpstream(upstreamUrl, {
      method,
      headers: upstreamHeaders,
      ...(hasBody ? { body: rawBody! } : {}),
    });
  } catch (e) {
    const aborted = e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError");
    return bffJsonError(
      aborted ? 504 : 502,
      aborted ? "UPSTREAM_TIMEOUT" : "BAD_GATEWAY",
      aborted
        ? `La API no respondió en ${Math.round(UPSTREAM_TIMEOUT_MS / 1000)}s`
        : "No hay conexión con la API"
    );
  }

  // Status + JSON tal cual, con Set-Cookie upstream↔navegador preservado
  // (getSetCookie() evita que múltiples cookies se fusionen con ", ").
  const headers = pickResponseHeaders(upstream.headers);
  for (const cookie of upstream.headers.getSetCookie()) {
    headers.append("set-cookie", cookie);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
};
