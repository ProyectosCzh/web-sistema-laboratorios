import axios from "axios";
import { ERROR_MESSAGES, type ErrorCode } from "./constants";
import { clearSession, getSession } from "./session";

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Array<{ field?: string; message: string }>;
}

export const api = axios.create({
  baseURL: import.meta.env.PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const axiosError = error as {
      response?: { status?: number; data?: { error?: ApiErrorPayload } };
      config?: { url?: string };
    };
    const status = axiosError.response?.status;
    const url = axiosError.config?.url ?? "";
    const payload = axiosError.response?.data?.error;

    if (status === 401 && !url.includes("/auth/login")) {
      const hadSession = Boolean(getSession());
      clearSession();
      if (hadSession && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject<ApiErrorPayload>(
      payload ?? {
        code: "INTERNAL_ERROR",
        message: ERROR_MESSAGES.INTERNAL_ERROR,
        details: undefined,
      },
    );
  },
);

export function apiErrorToMessage(err: unknown): string {
  const e = err as ApiErrorPayload | null | undefined;
  if (e?.code && e.code in ERROR_MESSAGES) {
    const base = ERROR_MESSAGES[e.code as ErrorCode];
    if (e.code === "VALIDATION_ERROR" && e.details?.length) {
      const detailsText = e.details.map((d) => d.message).join(" · ");
      return `${base}: ${detailsText}`;
    }
    return base;
  }
  return ERROR_MESSAGES.INTERNAL_ERROR;
}
