'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import {
  useAuthStore,
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVITY_COOKIE,
  AUTH_COOKIE,
  TOKEN_COOKIE,
} from '@/store/useAuthStore';
import { getCookie } from '@/lib/cookies';

import { SessionExpiredDialog } from '@/components/ui/session-expired-dialog';

// Interval pengecekan status inaktivitas (setiap 10 detik)
const CHECK_INTERVAL_MS = 10 * 1000;
// Throttle perekaman aktivitas (maksimal per 5 detik agar performa tetap optimal)
const ACTIVITY_THROTTLE_MS = 5 * 1000;

export const InactivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, logout, updateActivity } = useAuthStore();

  const [isExpiredDialogOpen, setIsExpiredDialogOpen] = React.useState<boolean>(false);
  const lastActivityRecordedRef = useRef<number>(Date.now());

  const handleInactivityLogout = useCallback(() => {
    // 1. Bersihkan sesi autentikasi dari cookies dan store
    logout();

    // 2. Langsung redirect / logout ke halaman login terlebih dahulu
    router.push('/auth/login');

    // 3. Munculkan modal dialog SweetAlert-style di halaman login (tidak hilang sampai user klik OK)
    setIsExpiredDialogOpen(true);
  }, [logout, router]);

  const handleConfirmLogin = useCallback(() => {
    setIsExpiredDialogOpen(false);
  }, []);

  // Fungsi pengecekan apakah token masih ada dan waktu inaktivitas belum expired
  const checkAuthAndInactivity = useCallback(() => {
    if (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register')) return;

    try {
      const token = getCookie(TOKEN_COOKIE);
      const isAuthStr = getCookie(AUTH_COOKIE);
      const storedLastActStr = getCookie(LAST_ACTIVITY_COOKIE);

      // Jika token hilang atau auth cookie tidak valid saat di halaman terproteksi
      if (!token || isAuthStr !== 'true') {
        logout();
        router.replace('/auth/login');
        return;
      }

      if (storedLastActStr) {
        const lastActTime = parseInt(storedLastActStr, 10);
        const elapsed = Date.now() - lastActTime;

        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          handleInactivityLogout();
        }
      }
    } catch {
      // ignore
    }
  }, [pathname, logout, router, handleInactivityLogout]);

  // Handler aktivitas pengguna yang di-throttle
  const recordUserActivity = useCallback(() => {
    if (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register')) return;

    const token = getCookie(TOKEN_COOKIE);
    if (!token) {
      checkAuthAndInactivity();
      return;
    }

    const now = Date.now();
    if (now - lastActivityRecordedRef.current > ACTIVITY_THROTTLE_MS) {
      lastActivityRecordedRef.current = now;
      updateActivity();
    }
  }, [pathname, checkAuthAndInactivity, updateActivity]);

  useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);

  useEffect(() => {
    // Jalankan cek auth & inaktivitas saat route berubah atau komponen dimuat
    checkAuthAndInactivity();

    // Event listener untuk berbagai aktivitas pengguna
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordUserActivity, { passive: true });
    });

    // Interval rutin pengecekan inaktivitas & validitas token setiap 10 detik
    const timer = setInterval(() => {
      checkAuthAndInactivity();
    }, CHECK_INTERVAL_MS);

    // Event listener saat tab aktif kembali / berpindah fokus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuthAndInactivity();
      }
    };
    const handleFocus = () => {
      checkAuthAndInactivity();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordUserActivity);
      });
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [pathname, checkAuthAndInactivity, recordUserActivity]);

  return (
    <>
      {children}
      <SessionExpiredDialog
        isOpen={isExpiredDialogOpen}
        onConfirm={handleConfirmLogin}
        timeoutMs={INACTIVITY_TIMEOUT_MS}
      />
    </>
  );
};

