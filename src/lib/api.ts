import { getCookie } from './cookies';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = process.env.NEXT_PUBLIC_API_PORT || '5000';
    return process.env.NEXT_PUBLIC_API_URL || `${protocol}//${hostname}:${port}/api/v1`;
  }
  const defaultPort = process.env.NEXT_PUBLIC_API_PORT || '5000';
  return process.env.NEXT_PUBLIC_API_URL || `http://127.0.0.1:${defaultPort}/api/v1`;
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const token = typeof window !== 'undefined' ? getCookie('almas_auth_token') : undefined;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      const { useAuthStore } = await import('../store/useAuthStore');
      useAuthStore.getState().logout();
      if (!window.location.pathname.startsWith('/auth/login')) {
        window.location.href = '/auth/login';
      }
    }
  }

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `API Error: ${res.status} ${res.statusText}`);
  }

  return json.data as T;
}
