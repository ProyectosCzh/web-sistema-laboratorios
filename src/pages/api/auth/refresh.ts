import type { APIRoute } from "astro";
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
  REFRESH_COOKIE_NAME,
  accessCookieMaxAgeSeconds,
  bffJsonError,
  buildUpstreamUrl,
  fetchUpstream,
  parseCookieHeader,
  pickResponseHeaders,
  webCookieSecure,
} from "../../../lib/server/proxy";

/**
 * Refresh (FASE 4b/7): lee lm_refresh → API /auth/refresh → rota AMBAS cookies
 * con la nueva pareja de tokens. Si la API rechaza (reuso, expiración) limpia
 * las cookies y devuelve 401 para que el front cierre sesión.
 */

const API_URL = import.meta.env.API_URL as string | undefined;

interface UpstreamRefreshBody {
  data?: {
    accessToken?: string;
    refreshToken?: string;
    user?: unknown;
  };
}

function clearAuthCookies(cookies: import("astro").AstroCookies): void {
  cookies.delete(ACCESS_COOKIE_NAME, { path: "/" });
  cookies.delete(REFRESH_COOKIE_NAME, { path: "/api/auth" });
}

export const POST: APIRoute = async ({ cookies, request }) => {
  if (!API_URL) {
    return bffJsonError(500, "BFF_MISCONFIGURED", "El BFF no tiene configurada la API");
  }

  const cookieMap = parseCookieHeader(request.headers.get("cookie"));
  const refreshToken = cookieMap[REFRESH_COOKIE_NAME];

  if (!refreshToken) {
    clearAuthCookies(cookies);
    return bffJsonError(401, "TOKEN_INVALID", "No hay sesión que refrescar");
  }

  let upstream: Response;
  try {
    upstream = await fetchUpstream(buildUpstreamUrl(API_URL, "auth/refresh", ""), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ token: refreshToken }),
    });
  } catch (e) {
    const aborted = e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError");
    return bffJsonError(aborted ? 504 : 502, "BAD_GATEWAY", "No hay conexión con la API");
  }

  if (!upstream.ok) {
    // Reuso detectado o refresh vencido: cookies fuera y 401 al navegador.
    clearAuthCookies(cookies);
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: pickResponseHeaders(upstream.headers),
    });
  }

  const body = (await upstream.json()) as UpstreamRefreshBody;
  const { accessToken, refreshToken: nextRefresh, user } = body.data ?? {};
  if (!accessToken || !nextRefresh) {
    clearAuthCookies(cookies);
    return bffJsonError(502, "BAD_GATEWAY", "Respuesta inválida de la API");
  }

  const secure = webCookieSecure();
  cookies.set(ACCESS_COOKIE_NAME, accessToken, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure,
    maxAge: accessCookieMaxAgeSeconds(),
  });
  cookies.set(REFRESH_COOKIE_NAME, nextRefresh, {
    path: "/api/auth",
    httpOnly: true,
    sameSite: "strict",
    secure,
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });

  return new Response(JSON.stringify({ data: { user: user ?? null } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
