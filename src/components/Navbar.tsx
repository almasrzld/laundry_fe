'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bell, Search, User, CheckCircle2, Settings, LogOut, Calendar, Clock } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { usePermission } from '../hooks/usePermission';
import { useSidebarMenusQuery } from '../hooks/useMenuQuery';
import { isCustomerRole } from '../lib/role';
import { NotificationDropdown } from './NotificationDropdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export const Navbar: React.FC = () => {
  const router = useRouter();
  const { adminName, adminEmail, logout, currentRole, currentRoleName, availableRoles } = useAuthStore();
  const { canAny, isSuperAdmin } = usePermission();
  const { data: sidebarMenus = [] } = useSidebarMenusQuery(currentRole);

  const isCustomer = React.useMemo(() => {
    if (isCustomerRole(currentRole, currentRoleName)) return true;
    const matched = availableRoles.find((r) => r.code?.toLowerCase().trim() === (currentRole || '').toLowerCase().trim());
    if (matched) {
      return isCustomerRole(matched.code, matched.name);
    }
    return false;
  }, [currentRole, currentRoleName, availableRoles]);

  const hasAdminAccess = React.useMemo(() => {
    if (isCustomer) return false;
    return isSuperAdmin || canAny(['admin.akses.index', 'admin.permission.index']);
  }, [isCustomer, isSuperAdmin, canAny]);

  const hasSystemAccess = React.useMemo(() => {
    if (isCustomer) return false;
    if (isSuperAdmin) return true;
    const hasSystemMenu = sidebarMenus.some(
      (m) =>
        m.path === '/system/user-management' ||
        m.path === '/system/menu-list' ||
        (m.path && m.path.startsWith('/system')) ||
        (m.name_menus && m.name_menus.toLowerCase().includes('system')) ||
        (m.title && m.title.toLowerCase().includes('system'))
    );
    if (hasSystemMenu) return true;
    return canAny(['user-management.index', 'menu-list.index', 'admin.akses.index', 'admin.permission.index']);
  }, [isCustomer, isSuperAdmin, sidebarMenus, canAny]);

  const [mounted, setMounted] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime
    ? new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(currentTime)
    : '';

  const formattedClock = currentTime
    ? new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
        .format(currentTime)
        .replace(/\./g, ':') + ' WIB'
    : '';

  const initials = (adminName || adminEmail || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    toast.success('Berhasil keluar dari sistem');
    router.push('/auth/login');
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 flex items-center justify-between px-6 sticky top-0 z-30 shadow-xs">
      {/* Search Input */}
      <div className="flex items-center gap-4 w-80 lg:w-96">
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari order, pelanggan, layanan..."
            className="w-full bg-slate-100 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-400 transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Live Date & Time Clock Widget */}
        {mounted && currentTime && (
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl text-slate-700 shadow-2xs transition-colors">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <Calendar size={13.5} className="text-sky-600 shrink-0" />
              <span>{formattedDate}</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 tabular-nums font-mono">
              <Clock size={13.5} className="text-sky-600 shrink-0" />
              <span>{formattedClock}</span>
            </div>
          </div>
        )}

        {/* Live DB Status (Hanya tampil jika role memiliki hak akses admin.akses.index) */}
        {mounted && hasAdminAccess && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-700 font-medium">
            <CheckCircle2 size={13} />
            <span>Backend Connected</span>
          </div>
        )}

        {/* Notifications Dropdown */}
        <NotificationDropdown />

        {/* User Profile with shadcn DropdownMenu */}
        <div className="pl-3 border-l border-slate-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-left outline-none">
                <div className="w-8 h-8 rounded-full bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-800 font-bold text-xs shadow-xs" suppressHydrationWarning>
                  {initials || <User size={14} />}
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-bold text-slate-800 leading-none" suppressHydrationWarning>
                    {mounted ? (adminName || adminEmail || '') : ''}
                  </p>
                  {mounted && adminEmail && (
                    <p className="text-[10px] text-slate-500 mt-1 leading-none" suppressHydrationWarning>
                      {adminEmail}
                    </p>
                  )}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-xs font-bold text-slate-900" suppressHydrationWarning>
                  {mounted ? (adminName || adminEmail || '') : ''}
                </p>
                {mounted && adminEmail && (
                  <p className="text-[10px] text-slate-500 font-normal" suppressHydrationWarning>
                    {adminEmail}
                  </p>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push('/profile')}
                className="cursor-pointer"
              >
                <User className="w-4 h-4 mr-2 text-slate-500" />
                <span>Profil Akun</span>
              </DropdownMenuItem>
              {hasSystemAccess && (
                <DropdownMenuItem
                  onClick={() => router.push('/system/user-management')}
                  className="cursor-pointer"
                >
                  <Settings className="w-4 h-4 mr-2 text-slate-500" />
                  <span>Pengaturan Sistem</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Keluar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
