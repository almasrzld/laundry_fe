import Cookies from 'js-cookie';

export interface CookieOptions {
  expires?: number | Date; // in days or Date object (default: 7 days)
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none' | 'Lax' | 'Strict' | 'None';
  secure?: boolean;
}

export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  Cookies.set(name, value, {
    expires: options.expires ?? 7,
    path: options.path || '/',
    sameSite: (options.sameSite?.toLowerCase() as 'lax' | 'strict' | 'none') || 'lax',
    secure: options.secure ?? isHttps,
  });
}

export function getCookie(name: string): string | undefined {
  return Cookies.get(name);
}

export function removeCookie(name: string, path: string = '/'): void {
  Cookies.remove(name, { path });
}

export function setCookieJson(name: string, value: unknown, options?: CookieOptions): void {
  try {
    const jsonStr = JSON.stringify(value);
    setCookie(name, jsonStr, options);
  } catch (err) {
    console.error('Failed to stringify cookie value in setCookieJson:', err);
  }
}

export function getCookieJson<T>(name: string): T | null {
  const val = Cookies.get(name);
  if (!val) return null;
  try {
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

export { Cookies };
export default Cookies;

