'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useSidebarStore } from '../store/useSidebarStore';
import { useAuthStore } from '../store/useAuthStore';
import { useMenusQuery } from '../hooks/useMenuQuery';
import { usePermission } from '../hooks/usePermission';
import Forbidden from '../app/forbidden';
import { cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';

function isPathMatch(currentPath: string, targetPath?: string | null): boolean {
  if (!targetPath || targetPath === '#') return false;
  const cleanTarget = targetPath.replace(/\/$/, '') || '/';
  const cleanCurrent = currentPath.replace(/\/$/, '') || '/';

  if (cleanCurrent === cleanTarget) return true;
  if (
    (cleanTarget === '/' || cleanTarget === '/dashboard') &&
    (cleanCurrent === '/' || cleanCurrent === '/dashboard')
  ) {
    return true;
  }
  if (cleanTarget !== '/' && cleanTarget !== '') {
    if (cleanCurrent.startsWith(cleanTarget + '/') || cleanCurrent.startsWith(cleanTarget + '?')) {
      return true;
    }
  }
  return false;
}

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isCollapsed } = useSidebarStore();
  const { isHydrated, isAuthenticated, token } = useAuthStore();
  const { data: menus = [], isLoading: isLoadingMenus } = useMenusQuery();
  const { can, isLoading: isLoadingPerms, currentRole } = usePermission();

  useEffect(() => {
    if (isHydrated && (!isAuthenticated || !token)) {
      router.replace('/auth/login');
    }
  }, [isHydrated, isAuthenticated, token, router]);

  // Find matching menu from database to check route permission
  const matchingMenu = useMemo(() => {
    if (!pathname || menus.length === 0) return null;
    return menus.find((m) => isPathMatch(pathname, m.path));
  }, [pathname, menus]);

  // Check if current role has permission for this page (Strict Mode)
  const hasRouteAccess = useMemo(() => {
    // 1. Route umum yang selalu dapat diakses oleh semua user yang sudah login (Dashboard & Profile Akun)
    if (
      !pathname ||
      pathname === '/' ||
      pathname === '/dashboard' ||
      pathname === '/profile' ||
      pathname.startsWith('/profile/')
    ) {
      return true;
    }

    // 2. Jika halaman/route BELUM terdaftar di database Menu List -> Blokir akses (Default Deny)
    if (!matchingMenu) {
      return false;
    }

    // 3. Jika menu terdaftar dan memiliki nama_akses, periksa apakah role pengguna memiliki izin tersebut
    if (matchingMenu.nama_akses && matchingMenu.nama_akses.trim()) {
      const rawAccess = matchingMenu.nama_akses.trim();
      if (rawAccess.includes(',')) {
        const parts = rawAccess.split(',').map((p) => p.trim()).filter(Boolean);
        return parts.some((p) => can(p));
      }
      return can(rawAccess);
    }

    // 4. Jika tidak ada spesifik nama_akses, periksa apakah role pengguna diizinkan di daftar role menu
    if (matchingMenu.allowed_roles && matchingMenu.allowed_roles.length > 0 && currentRole) {
      return matchingMenu.allowed_roles.includes(currentRole);
    }

    // 5. Izinkan hanya jika status menu aktif
    return Boolean(matchingMenu.is_active);
  }, [pathname, matchingMenu, can, currentRole]);

  // If not hydrated yet, not authenticated, or still loading menus/permissions, show clean full-screen loader
  if (!isHydrated || !isAuthenticated || !token || isLoadingMenus || isLoadingPerms) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium tracking-wide">
            {!isHydrated || !isAuthenticated || !token
              ? 'Memeriksa sesi login...'
              : 'Memverifikasi izin akses...'}
          </p>
        </div>
      </div>
    );
  }

  // If unauthorized for this route, render full-screen 403 Access Denied (completely without sidebar and navbar)
  if (!hasRouteAccess) {
    return <Forbidden />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-all duration-300',
          isCollapsed ? 'pl-20' : 'pl-64'
        )}
      >
        <Navbar />
        <main className="flex-1 p-6 lg:p-8 bg-slate-50">{children}</main>
        <Footer />
      </div>
    </div>
  );
};
