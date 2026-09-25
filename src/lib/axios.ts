import axios, { AxiosError } from 'axios';
import { getApiBaseUrl } from './api';
import { getCookie } from './cookies';
import { useAuthStore, TOKEN_COOKIE } from '../store/useAuthStore';

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach token or dynamic baseURL update if needed
apiClient.interceptors.request.use(
  (config) => {
    // Dynamically ensure latest baseURL in browser environment
    config.baseURL = getApiBaseUrl();
    const token = getCookie(TOKEN_COOKIE);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: extract response body and format error messages
apiClient.interceptors.response.use(
  (response) => {
    // If backend returns standard { success: true, data: ... }
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data.data;
    }
    return response.data;
  },
  (error: AxiosError<any>) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        useAuthStore.getState().logout();
        if (!window.location.pathname.startsWith('/auth/login')) {
          window.location.href = '/auth/login';
        }
      }
    }

    const serverMessage =
      error.response?.data?.message ||
      error.message ||
      'Terjadi kesalahan pada server';
    const customErr: any = new Error(serverMessage);
    customErr.response = error.response;
    customErr.data = error.response?.data;
    customErr.error = error.response?.data?.error;
    customErr.status = error.response?.status;
    return Promise.reject(customErr);
  }
);

export default apiClient;

