import type { APIRoute } from "astro";
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
  REFRESH_COOKIE_NAME,
  accessCookieMaxAgeSeconds,
  bffJsonError,
  buildUpstreamUrl,
  fetchUpstream,
  pickResponseHeaders,
  webCookieSecure,
} from "../../../lib/server/proxy";

/**
 * Login server-to-server (FASE 4b): la API devuelve {accessToken, refreshToken,
 * user}; aquí SOLO los tokens se guardan en cookies httpOnly SameSite=Strict y
 * al navegador sale únicamente {user}. Los tokens jamás tocan localStorage.
 */

const API_URL = import.meta.env.API_URL as string | undefined;

interface UpstreamLoginBody {
  data?: {
    accessToken?: string;
    refreshToken?: string;
    user?: unknown;
  };
}

export const POST: APIRoute = async ({ cookies, request }) => {
  if (!API_URL) {
    return bffJsonError(500, "BFF_MISCONFIGURED", "El BFF no tiene configurada la API");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return bffJsonError(400, "VALIDATION_ERROR", "Cuerpo JSON inválido");
  }

  let upstream: Response;
  try {
    upstream = await fetchUpstream(buildUpstreamUrl(API_URL, "auth/login", ""), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    const aborted = e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError");
    return bffJsonError(aborted ? 504 : 502, "BAD_GATEWAY", "No hay conexión con la API");
  }

  if (!upstream.ok) {
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: pickResponseHeaders(upstream.headers),
    });
  }

  const body = (await upstream.json()) as UpstreamLoginBody;
  const { accessToken, refreshToken, user } = body.data ?? {};
  if (!accessToken || !refreshToken || !user) {
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
  cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
    // Solo visible para el BFF de auth (login/refresh/logout).
    path: "/api/auth",
    httpOnly: true,
    sameSite: "strict",
    secure,
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });

  return new Response(JSON.stringify({ data: { user } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
