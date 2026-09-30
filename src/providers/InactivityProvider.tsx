"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  useAuthStore,
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVITY_COOKIE,
  AUTH_COOKIE,
  TOKEN_COOKIE,
} from "@/store/useAuthStore";
import { getCookie } from "@/lib/cookies";
import { apiClient } from "@/lib/axios";
import {
  SessionExpiredDialog,
  SessionExpiredReason,
} from "@/components/ui/session-expired-dialog";

// Interval pengecekan status inaktivitas (setiap 5 detik)
const CHECK_INTERVAL_MS = 5 * 1000;
// Interval verifikasi sesi ke server backend (setiap 10 detik)
const SERVER_SESSION_CHECK_INTERVAL_MS = 10 * 1000;
// Throttle perekaman aktivitas pengguna
const ACTIVITY_THROTTLE_MS = 5 * 1000;
// Ambang peringatan sebelum auto-logout inaktivitas (60 detik)
const WARNING_THRESHOLD_MS = 60 * 1000;

interface ExpiredDialogState {
  isOpen: boolean;
  reason: SessionExpiredReason;
  title?: string;
  message?: string;
}

export const InactivityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, updateActivity } = useAuthStore();

  const [dialogState, setDialogState] = useState<ExpiredDialogState>({
    isOpen: false,
    reason: "inactivity",
  });

  const lastActivityRecordedRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const isCheckingSessionRef = useRef<boolean>(false);

  // Helper untuk membuka modal dialog session expired
  const showSessionExpiredModal = useCallback(
    (reason: SessionExpiredReason, message?: string, title?: string) => {
      setDialogState({
        isOpen: true,
        reason,
        message,
        title,
      });
    },
    [],
  );

  // Logout karena inaktivitas waktu
  const handleInactivityLogout = useCallback(() => {
    // 1. Bersihkan warning toast
    toast.dismiss("inactivity-warning-toast");
    warningShownRef.current = false;

    // 2. Beri notifikasi toast
    const minutes = Math.max(
      1,
      Math.round(INACTIVITY_TIMEOUT_MS / (60 * 1000)),
    );
    const msg = `Sesi Anda telah berakhir secara otomatis karena tidak ada aktivitas selama ${minutes} menit.`;

    toast.error("Sesi Berakhir", {
      id: "session-expired-toast",
      description: msg,
      duration: 7000,
    });

    // 3. Simpan alasan ke sessionStorage
    try {
      sessionStorage.setItem(
        "almas_session_expired",
        JSON.stringify({
          reason: "inactivity",
          message: msg,
          timestamp: Date.now(),
        }),
      );
    } catch (_) {}

    // 4. Bersihkan auth store & cookie
    logout(false);

    // 5. Buka modal dialog & arahkan ke /auth/login
    showSessionExpiredModal("inactivity", msg);
    if (!pathname.startsWith("/auth/login")) {
      router.push("/auth/login");
    }
  }, [logout, router, pathname, showSessionExpiredModal]);

  const handleConfirmLogin = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (!pathname.startsWith("/auth/login")) {
      router.replace("/auth/login");
    }
  }, [pathname, router]);

  // Verifikasi apakah sesi aktif masih sah di server (Single Active Session Check)
  const verifyServerSession = useCallback(async () => {
    if (
      pathname.startsWith("/auth/login") ||
      pathname.startsWith("/auth/register")
    )
      return;
    if (isCheckingSessionRef.current) return;

    const token = getCookie(TOKEN_COOKIE);
    const isAuth = getCookie(AUTH_COOKIE);
    if (!token || isAuth !== "true") return;

    isCheckingSessionRef.current = true;
    try {
      // Endpoint /auth/me dilindungi authMiddleware yang otomatis mengecek active_session_id
      await apiClient.get("/auth/me");
    } catch (err: any) {
      // Jika response 401 CONCURRENT_LOGIN, interceptor apiClient otomatis menangani logout & custom event
    } finally {
      isCheckingSessionRef.current = false;
    }
  }, [pathname]);

  // Fungsi pengecekan inaktivitas & validitas token lokal
  const checkAuthAndInactivity = useCallback(() => {
    // 1. Cek apakah ada notifikasi session expired yang tertunda di sessionStorage
    try {
      const storedExpired = sessionStorage.getItem("almas_session_expired");
      if (storedExpired) {
        sessionStorage.removeItem("almas_session_expired");
        const parsed = JSON.parse(storedExpired);
        showSessionExpiredModal(parsed.reason || "expired", parsed.message);
        toast.error(
          parsed.reason === "concurrent"
            ? "Login di Perangkat Lain"
            : parsed.reason === "inactivity"
              ? "Sesi Berakhir"
              : "Sesi Telah Berakhir",
          {
            id: "session-expired-toast",
            description:
              parsed.message || "Silakan masuk kembali ke akun Anda.",
            duration: 7000,
          },
        );
      }
    } catch (_) {}

    if (
      pathname.startsWith("/auth/login") ||
      pathname.startsWith("/auth/register")
    )
      return;

    try {
      const token = getCookie(TOKEN_COOKIE);
      const isAuthStr = getCookie(AUTH_COOKIE);
      const storedLastActStr = getCookie(LAST_ACTIVITY_COOKIE);

      // Jika token hilang di halaman terproteksi
      if (!token || isAuthStr !== "true") {
        logout(false);
        router.replace("/auth/login");
        return;
      }

      if (storedLastActStr) {
        const lastActTime = parseInt(storedLastActStr, 10);
        const elapsed = Date.now() - lastActTime;
        const remaining = INACTIVITY_TIMEOUT_MS - elapsed;

        // Cek apakah inaktivitas sudah lewat batas
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          handleInactivityLogout();
          return;
        }

        // Peringatan dini sebelum logout (tersisa <= 60 detik)
        if (
          remaining <= WARNING_THRESHOLD_MS &&
          remaining > 0 &&
          INACTIVITY_TIMEOUT_MS > WARNING_THRESHOLD_MS
        ) {
          if (!warningShownRef.current) {
            warningShownRef.current = true;
            const remainingSec = Math.ceil(remaining / 1000);
            toast.warning("Peringatan Inaktivitas Sesi", {
              id: "inactivity-warning-toast",
              description: `Sesi Anda akan otomatis ditutup dalam ±${remainingSec} detik karena tidak ada aktivitas. Gerakkan kursor atau klik untuk tetap masuk.`,
              duration: 10000,
            });
          }
        } else {
          if (warningShownRef.current) {
            warningShownRef.current = false;
            toast.dismiss("inactivity-warning-toast");
          }
        }
      }
    } catch {
      // ignore
    }
  }, [
    pathname,
    logout,
    router,
    handleInactivityLogout,
    showSessionExpiredModal,
  ]);

  // Handler aktivitas pengguna yang di-throttle
  const recordUserActivity = useCallback(() => {
    if (
      pathname.startsWith("/auth/login") ||
      pathname.startsWith("/auth/register")
    )
      return;

    const token = getCookie(TOKEN_COOKIE);
    if (!token) return;

    const now = Date.now();
    if (now - lastActivityRecordedRef.current > ACTIVITY_THROTTLE_MS) {
      lastActivityRecordedRef.current = now;
      updateActivity();

      // Jika ada warning toast, batalkan karena pengguna sudah aktif kembali
      if (warningShownRef.current) {
        warningShownRef.current = false;
        toast.dismiss("inactivity-warning-toast");
        toast.info("Sesi Diperpanjang", {
          id: "activity-renewed-toast",
          description: "Aktivitas terdeteksi. Sesi Anda tetap aktif.",
          duration: 3000,
        });
      }
    }
  }, [pathname, updateActivity]);

  useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);

  useEffect(() => {
    // Jalankan pengecekan inaktivitas & verifikasi server saat route berubah / komponen mount
    checkAuthAndInactivity();
    verifyServerSession();

    // Event listener untuk custom event session-expired (dari axios interceptor atau apiFetch)
    const handleCustomSessionExpired = (e: any) => {
      const detail = e.detail || {};
      showSessionExpiredModal(detail.reason || "expired", detail.message);
      toast.error(
        detail.reason === "concurrent"
          ? "Login di Perangkat Lain"
          : "Sesi Telah Berakhir",
        {
          id: "session-expired-toast",
          description:
            detail.message ||
            "Sesi Anda telah berakhir karena akun telah masuk di perangkat lain.",
          duration: 7000,
        },
      );
    };
    window.addEventListener(
      "almas:session-expired",
      handleCustomSessionExpired,
    );

    // Event listener aktivitas pengguna
    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordUserActivity, { passive: true });
    });

    // Timer pengecekan inaktivitas lokal setiap 5 detik
    const inactivityTimer = setInterval(() => {
      checkAuthAndInactivity();
    }, CHECK_INTERVAL_MS);

    // Timer pengecekan single active session ke backend setiap 10 detik
    const sessionHeartbeatTimer = setInterval(() => {
      verifyServerSession();
    }, SERVER_SESSION_CHECK_INTERVAL_MS);

    // Event listener saat tab kembali fokus / aktif
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAuthAndInactivity();
        verifyServerSession();
      }
    };
    const handleFocus = () => {
      checkAuthAndInactivity();
      verifyServerSession();
    };

    // Event listener multi-tab sync
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === "almas_auth_sync" && e.newValue) {
        try {
          const syncData = JSON.parse(e.newValue);
          if (syncData.event === "logout") {
            useAuthStore.getState().logout(false);
            if (!window.location.pathname.startsWith("/auth/login")) {
              toast.info("Keluar dari Sistem", {
                description:
                  "Anda telah keluar dari akun pada tab/jendela lain.",
                duration: 5000,
              });
              router.replace("/auth/login");
            }
          } else if (syncData.event === "login") {
            useAuthStore.getState().initAuth();
            if (window.location.pathname.startsWith("/auth/login")) {
              router.replace("/dashboard");
            }
          }
        } catch (_) {}
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorageSync);

    return () => {
      window.removeEventListener(
        "almas:session-expired",
        handleCustomSessionExpired,
      );
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordUserActivity);
      });
      clearInterval(inactivityTimer);
      clearInterval(sessionHeartbeatTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorageSync);
    };
  }, [
    pathname,
    checkAuthAndInactivity,
    verifyServerSession,
    recordUserActivity,
    router,
    showSessionExpiredModal,
  ]);

  return (
    <>
      {children}
      <SessionExpiredDialog
        isOpen={dialogState.isOpen}
        reason={dialogState.reason}
        title={dialogState.title}
        message={dialogState.message}
        onConfirm={handleConfirmLogin}
        timeoutMs={INACTIVITY_TIMEOUT_MS}
      />
    </>
  );
};
