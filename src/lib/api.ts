import axios, { AxiosRequestConfig, AxiosError } from "axios";
import { getCookie } from "./cookies";
import { appConfig } from "../config/app.config";

export function getApiBaseUrl(): string {
  return appConfig.getApiBaseUrl();
}

/**
 * Axios Instance terpusat dengan base URL dinamis dan interceptor
 */
export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Otomatis sisipkan Bearer Token dari cookie
apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  const token =
    typeof window !== "undefined" ? getCookie("almas_auth_token") : undefined;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Otomatis tangani sesi expired (401) & standarisasi error
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        const { useAuthStore } = await import("../store/useAuthStore");
        useAuthStore.getState().logout(false);
        if (!window.location.pathname.startsWith("/auth/login")) {
          window.location.href = "/auth/login";
        }
      }
    }
    const message =
      error.response?.data?.message ||
      error.message ||
      "Terjadi kesalahan saat memproses permintaan API";
    return Promise.reject(new Error(message));
  }
);

/**
 * Wrapper API menggunakan Axios dengan kompatibilitas penuh untuk semua modul
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit | AxiosRequestConfig,
): Promise<T> {
  const method = (options?.method?.toLowerCase() as any) || "get";
  let bodyData: any = undefined;

  if (options && "body" in options && options.body) {
    try {
      bodyData =
        typeof options.body === "string"
          ? JSON.parse(options.body as string)
          : options.body;
    } catch {
      bodyData = options.body;
    }
  } else if (options && "data" in options) {
    bodyData = (options as AxiosRequestConfig).data;
  }

  try {
    const response = await apiClient.request({
      url: endpoint.startsWith("/") ? endpoint : `/${endpoint}`,
      method,
      data: bodyData,
      headers: (options?.headers as any) || {},
    });

    const json = response.data;
    if (json && json.success === false) {
      throw new Error(json.message || "Permintaan API gagal");
    }

    return (json?.data !== undefined ? json.data : json) as T;
  } catch (error: any) {
    throw error;
  }
}
