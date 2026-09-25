import { create } from 'zustand';
import { apiFetch } from '../lib/api';
import { Role } from '../types';
import {
  setCookie,
  getCookie,
  removeCookie,
  setCookieJson,
  getCookieJson,
} from '../lib/cookies';

export const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 60 Menit
export const LAST_ACTIVITY_COOKIE = 'almas_last_activity';
export const AUTH_COOKIE = 'almas_is_authenticated';
export const TOKEN_COOKIE = 'almas_auth_token';
export const USER_COOKIE = 'almas_user_info';

export interface AuthUser {
  name: string;
  email: string;
  role: string;
}

export interface AuthState {
  isHydrated: boolean;
  isAuthenticated: boolean;
  token: string | null;
  currentRole: string;
  currentRoleName: string;
  adminName: string;
  adminEmail: string;
  availableRoles: Role[];
  lastActivity: number;
  initAuth: () => void;
  fetchRoles: () => Promise<void>;
  ensureSession: () => Promise<void>;
  setRole: (roleCode: string, roleName?: string) => void;
  login: (userData?: { name?: string; email?: string; role?: string; token?: string }) => void;
  updateUser: (data: { name?: string; email?: string }) => void;
  logout: () => void;
  updateActivity: () => void;
  isSessionExpired: () => boolean;
}

export function formatRoleLabel(role?: string): string {
  if (!role) return '';
  return role
    .split(/[_\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isHydrated: false,
  isAuthenticated: false,
  token: null,
  currentRole: '',
  currentRoleName: '',
  adminName: '',
  adminEmail: '',
  availableRoles: [],
  lastActivity: 0,

  initAuth: () => {
    if (typeof window === 'undefined') return;
    try {
      // Clear legacy localStorage data if any exists
      ['almas_is_authenticated', 'almas_auth_token', 'almas_user_info', 'almas_last_activity'].forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {
          // ignore
        }
      });

      const token = getCookie(TOKEN_COOKIE);
      const isAuth = getCookie(AUTH_COOKIE) === 'true' && Boolean(token);
      const lastAct = parseInt(getCookie(LAST_ACTIVITY_COOKIE) || '0', 10);
      const userInfo = getCookieJson<Partial<AuthUser>>(USER_COOKIE) || {};

      const now = Date.now();
      const isExpired = lastAct > 0 && now - lastAct > INACTIVITY_TIMEOUT_MS;

      if (!token || !isAuth || isExpired) {
        removeCookie(AUTH_COOKIE);
        removeCookie(TOKEN_COOKIE);
        removeCookie(USER_COOKIE);
        removeCookie(LAST_ACTIVITY_COOKIE);
        set({
          isHydrated: true,
          isAuthenticated: false,
          token: null,
          adminName: '',
          adminEmail: '',
          currentRole: '',
          currentRoleName: '',
          lastActivity: 0,
        });
        return;
      }

      set({
        isHydrated: true,
        isAuthenticated: true,
        token: token,
        adminName: userInfo.name || '',
        adminEmail: userInfo.email || '',
        currentRole: userInfo.role || '',
        currentRoleName: formatRoleLabel(userInfo.role) || '',
        lastActivity: lastAct || now,
      });
    } catch {
      set({ isHydrated: true, isAuthenticated: false, token: null });
    }
  },

  ensureSession: async () => {
    const currentToken = get().token || getCookie(TOKEN_COOKIE);
    if (currentToken) {
      try {
        const res = await apiFetch<any>('/auth/me');
        if (res && res.id) {
          set({
            isAuthenticated: true,
            adminName: res.name || get().adminName,
            adminEmail: res.email || get().adminEmail,
            currentRole: res.role_code || get().currentRole,
          });
        }
      } catch (err) {
        // Token invalid or expired
      }
    }
  },

  fetchRoles: async () => {
    get().ensureSession().catch(() => {});
    try {
      const data = await apiFetch<Role[]>('/system/roles');
      if (Array.isArray(data) && data.length > 0) {
        set({ availableRoles: data });
        const matched = data.find((r) => r.code === get().currentRole);
        if (matched) {
          set({ currentRoleName: matched.name });
        }
      }
    } catch (err) {
      console.warn('Gagal memuat roles dinamis:', err);
    }
  },

  setRole: (roleCode: string, roleName?: string) => {
    const matched = get().availableRoles.find((r) => r.code === roleCode);
    const resolvedName = roleName || matched?.name || formatRoleLabel(roleCode);
    set({
      currentRole: roleCode,
      currentRoleName: resolvedName,
    });
    if (typeof window !== 'undefined') {
      try {
        const userInfo = getCookieJson<Record<string, any>>(USER_COOKIE) || {};
        setCookieJson(USER_COOKIE, { ...userInfo, role: roleCode }, { expires: 7 });
      } catch {
        // ignore
      }
    }
  },

  login: (userData) => {
    const now = Date.now();
    const name = userData?.name || '';
    const email = userData?.email || '';
    const role = userData?.role || '';
    const token = userData?.token || null;

    const matched = get().availableRoles.find((r) => r.code === role);
    const currentRoleName = matched?.name || formatRoleLabel(role);

    if (typeof window !== 'undefined') {
      try {
        setCookie(AUTH_COOKIE, 'true', { expires: 7 });
        if (token) setCookie(TOKEN_COOKIE, token, { expires: 7 });
        setCookieJson(USER_COOKIE, { name, email, role }, { expires: 7 });
        setCookie(LAST_ACTIVITY_COOKIE, now.toString(), { expires: 7 });
      } catch (e) {
        console.error('Error saving auth to cookies:', e);
      }
    }

    set({
      isAuthenticated: true,
      token,
      adminName: name,
      adminEmail: email,
      currentRole: role,
      currentRoleName,
      lastActivity: now,
    });
  },

  updateUser: (data) => {
    const nextName = data.name !== undefined ? data.name : get().adminName;
    const nextEmail = data.email !== undefined ? data.email : get().adminEmail;

    if (typeof window !== 'undefined') {
      try {
        const userInfo = getCookieJson<Record<string, any>>(USER_COOKIE) || {};
        setCookieJson(USER_COOKIE, { ...userInfo, name: nextName, email: nextEmail }, { expires: 7 });
      } catch {
        // ignore
      }
    }

    set({
      adminName: nextName,
      adminEmail: nextEmail,
    });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      try {
        removeCookie(AUTH_COOKIE);
        removeCookie(TOKEN_COOKIE);
        removeCookie(USER_COOKIE);
        removeCookie(LAST_ACTIVITY_COOKIE);
      } catch (e) {
        console.error('Error clearing auth in cookies:', e);
      }
    }

    set({
      isAuthenticated: false,
      token: null,
      adminName: '',
      adminEmail: '',
      currentRole: '',
      currentRoleName: '',
      lastActivity: 0,
    });
  },

  updateActivity: () => {
    const now = Date.now();
    if (typeof window !== 'undefined') {
      try {
        setCookie(LAST_ACTIVITY_COOKIE, now.toString(), { expires: 7 });
      } catch {
        // ignore
      }
    }
    set({ lastActivity: now });
  },

  isSessionExpired: () => {
    if (typeof window === 'undefined') return false;
    const isAuth = get().isAuthenticated;
    if (!isAuth) return false;

    let storedLastAct = get().lastActivity;
    try {
      const actRaw = getCookie(LAST_ACTIVITY_COOKIE);
      if (actRaw) {
        storedLastAct = parseInt(actRaw, 10);
      }
    } catch {
      // ignore
    }

    if (!storedLastAct || storedLastAct === 0) return false;
    return Date.now() - storedLastAct > INACTIVITY_TIMEOUT_MS;
  },
}));


