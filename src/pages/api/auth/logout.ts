import type { APIRoute } from "astro";
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  buildUpstreamUrl,
  fetchUpstream,
  parseCookieHeader,
} from "../../../lib/server/proxy";

/**
 * Logout (FASE 4b): llama a la API /auth/logout con las cookies lm_* para que
 * se revoque la sesión del dispositivo y SIEMPRE limpia las cookies, aunque la
 * llamada upstream falle.
 */

const API_URL = import.meta.env.API_URL as string | undefined;

function rebuildAuthCookieHeader(cookieMap: Record<string, string>): string | undefined {
  const parts: string[] = [];
  if (cookieMap[ACCESS_COOKIE_NAME]) {
    parts.push(`${ACCESS_COOKIE_NAME}=${cookieMap[ACCESS_COOKIE_NAME]}`);
  }
  if (cookieMap[REFRESH_COOKIE_NAME]) {
    parts.push(`${REFRESH_COOKIE_NAME}=${cookieMap[REFRESH_COOKIE_NAME]}`);
  }
  return parts.length > 0 ? parts.join("; ") : undefined;
}

export const POST: APIRoute = async ({ cookies, request }) => {
  const cookieMap = parseCookieHeader(request.headers.get("cookie"));
  const authCookieHeader = rebuildAuthCookieHeader(cookieMap);

  if (API_URL && authCookieHeader) {
    try {
      await fetchUpstream(buildUpstreamUrl(API_URL, "auth/logout", ""), {
        method: "POST",
        headers: { accept: "application/json", cookie: authCookieHeader },
      });
    } catch {
      // La revocación upstream es best-effort: el navegador cierra igual.
    }
  }

  cookies.delete(ACCESS_COOKIE_NAME, { path: "/" });
  cookies.delete(REFRESH_COOKIE_NAME, { path: "/api/auth" });

  return new Response(null, { status: 204 });
};
