import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { ERROR_MESSAGES } from "./errors";
import { clearSession, getSession } from "./session";
import type { ApiErrorPayload, Paginated } from "./types";

/**
 * FASE 4c: el navegador SOLO habla con el BFF mismo origen ('/api').
 * La Authorization ya no se setea acá: vive en cookies httpOnly lm_* que el
 * BFF convierte en Authorization hacia la API privada.
 */
export const API_BASE_URL = "/api";

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
  withCredentials: true,
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Single-flight: ante N respuestas 401 simultáneas, una sola llamada refresh.
let refreshing: Promise<boolean> | null = null;

function triggerRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = axios
      .post("/api/auth/refresh", null, { timeout: 25000 })
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosError = error as {
      response?: { status?: number; data?: { error?: ApiErrorPayload } };
      config?: RetriableConfig;
    };
    const status = axiosError.response?.status;
    const url = axiosError.config?.url ?? "";
    const payload = axiosError.response?.data?.error;

    if (status === 401 && !url.includes("/auth/login") && !url.includes("/auth/refresh")) {
      const config = axiosError.config;

      if (!config?._retry && typeof window !== "undefined") {
        const refreshed = await triggerRefresh();
        if (refreshed && config) {
          config._retry = true;
          // Reintenta la petición original con la cookie rotada.
          return http.request(config);
        }

        const hadSession = Boolean(getSession());
        clearSession();
        if (hadSession) window.location.replace("/");
      }
    }

    const normalized: ApiErrorPayload =
      payload ??
      (status === undefined
        ? {
            code: "NETWORK_ERROR",
            message: "No hay conexión con el servidor de la API.",
          }
        : {
            code: "INTERNAL_ERROR",
            message: ERROR_MESSAGES.INTERNAL_ERROR,
          });

    throw normalized;
  },
);

export async function unwrap<T>(promise: Promise<AxiosResponse<{ data: T }>>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

export async function unwrapWrapped<K extends string, T>(
  promise: Promise<AxiosResponse<{ data: Record<K, T> }>>,
  key: K,
): Promise<T> {
  const res = await promise;
  return res.data.data[key];
}

export async function unwrapPage<T>(
  promise: Promise<AxiosResponse<Paginated<T>>>,
): Promise<Paginated<T>> {
  const res = await promise;
  return res.data;
}

export interface PageParams {
  page?: number;
  pageSize?: number;
}
