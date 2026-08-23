import axios, { type AxiosResponse } from "axios";
import { ERROR_MESSAGES } from "./errors";
import { clearSession, getSession } from "./session";
import type { ApiErrorPayload, Paginated } from "./types";

export const API_BASE_URL: string =
  import.meta.env.PUBLIC_API_URL ?? "http://localhost:3001/api";

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
});

http.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

http.interceptors.response.use(
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
      if (hadSession && typeof window !== "undefined") {
        window.location.replace("/");
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

    return Promise.reject<ApiErrorPayload>(normalized);
  },
);

export async function unwrap<T>(promise: Promise<AxiosResponse<{ data: T }>>): Promise<T> {
  const res = await promise;
  return res.data.data;
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
