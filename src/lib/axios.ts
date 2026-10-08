import axios, { AxiosError } from 'axios';
import { getCookie } from './cookies';
import { getApiBaseUrl } from './api';
import { useAuthStore, TOKEN_COOKIE } from '@/store/useAuthStore';

let cachedGps: { lat: number; lng: number } | null = null;

export const requestBrowserGeolocation = (): void => {
  if (typeof window !== 'undefined' && 'geolocation' in navigator) {
    // 1. Dapatkan posisi GPS seketika
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedGps = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        try {
          sessionStorage.setItem('almas_user_gps', JSON.stringify(cachedGps));
          localStorage.setItem('almas_user_gps', JSON.stringify(cachedGps));
        } catch (_) {}
      },
      (err) => {
        console.debug('Geolocation request:', err?.message);
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
    );

    // 2. Pantau pergerakan / koordinat GPS real-time secara berkelanjutan
    try {
      navigator.geolocation.watchPosition(
        (pos) => {
          cachedGps = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          try {
            sessionStorage.setItem('almas_user_gps', JSON.stringify(cachedGps));
            localStorage.setItem('almas_user_gps', JSON.stringify(cachedGps));
          } catch (_) {}
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    } catch (_) {}
  }
};

// Initial trigger in browser environment
if (typeof window !== 'undefined') {
  try {
    const saved = sessionStorage.getItem('almas_user_gps') || localStorage.getItem('almas_user_gps');
    if (saved) {
      cachedGps = JSON.parse(saved);
    }
  } catch (_) {}
  requestBrowserGeolocation();
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach token, GPS coordinates, and dynamic baseURL
apiClient.interceptors.request.use(
  (config) => {
    // Dynamically ensure latest baseURL in browser environment
    config.baseURL = getApiBaseUrl();
    const token = getCookie(TOKEN_COOKIE);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach GPS coordinates if available
    if (config.headers) {
      if (!cachedGps && typeof window !== 'undefined') {
        try {
          const saved = sessionStorage.getItem('almas_user_gps');
          if (saved) cachedGps = JSON.parse(saved);
        } catch (_) {}
      }

      if (cachedGps) {
        config.headers['x-latitude'] = String(cachedGps.lat);
        config.headers['x-longitude'] = String(cachedGps.lng);
        config.headers['x-client-location'] = `GPS (${cachedGps.lat.toFixed(5)}, ${cachedGps.lng.toFixed(5)})`;
      }
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
        const errorData: any = error.response?.data;
        const isConcurrent =
          errorData?.error?.code === 'CONCURRENT_LOGIN' ||
          (typeof errorData?.message === 'string' &&
            errorData.message.toLowerCase().includes('perangkat lain'));

        const reason = isConcurrent ? 'concurrent' : 'expired';
        const message =
          errorData?.message ||
          (isConcurrent
            ? 'Sesi Anda telah berakhir karena akun telah masuk di perangkat lain.'
            : 'Sesi Anda telah berakhir atau tidak valid. Silakan masuk kembali.');

        try {
          sessionStorage.setItem(
            'almas_session_expired',
            JSON.stringify({
              reason,
              message,
              timestamp: Date.now(),
            })
          );
          window.dispatchEvent(
            new CustomEvent('almas:session-expired', {
              detail: { reason, message },
            })
          );
        } catch (_) {}

        useAuthStore.getState().logout(false);
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
