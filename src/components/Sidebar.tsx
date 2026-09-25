'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, ChevronLeft, Waves } from 'lucide-react';
import { useSidebarStore } from '../store/useSidebarStore';
import { useAuthStore } from '../store/useAuthStore';
import { DynamicIcon } from './DynamicIcon';
import { cn } from '../lib/utils';

import { useSidebarMenusQuery } from '../hooks/useMenuQuery';

function isPathMatch(currentPath: string, targetPath?: string | null): boolean {
  if (!targetPath) return false;
  const cleanTarget = targetPath.replace(/\/$/, '') || '/';
  const cleanCurrent = currentPath.replace(/\/$/, '') || '/';

  // 1. Exact match
  if (cleanCurrent === cleanTarget) return true;

  // 2. Special case for root / dashboard
  if (
    (cleanTarget === '/' || cleanTarget === '/dashboard') &&
    (cleanCurrent === '/' || cleanCurrent === '/dashboard')
  ) {
    return true;
  }

  // 3. Prefix matching for nested / child routes (e.g. /service/form-submit -> /service)
  if (cleanTarget !== '/' && cleanTarget !== '') {
    if (cleanCurrent.startsWith(cleanTarget + '/') || cleanCurrent.startsWith(cleanTarget + '?')) {
      return true;
    }
  }

  return false;
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { currentRole } = useAuthStore();
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    isCollapsed,
    openSubmenus,
    toggleCollapsed,
    toggleSubmenu,
  } = useSidebarStore();

  const { data: menus = [], isLoading } = useSidebarMenusQuery(currentRole);

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-40 h-screen bg-white border-r border-slate-200 text-slate-700 transition-all duration-300 flex flex-col shadow-sm',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Floating Toggle Button on Border */}
      <button
        onClick={toggleCollapsed}
        title={isCollapsed ? 'Rentangkan Sidebar' : 'Ciutkan Sidebar'}
        className="absolute -right-3.5 top-4.5 z-50 w-7 h-7 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded-full shadow-md flex items-center justify-center text-slate-500 hover:text-sky-600 transition-all cursor-pointer"
      >
        {isCollapsed ? (
          <ChevronRight size={14} className="stroke-[2.5]" />
        ) : (
          <ChevronLeft size={14} className="stroke-[2.5]" />
        )}
      </button>

      {/* Brand Header */}
      <div className={cn('h-16 flex items-center border-b border-slate-200 bg-white', isCollapsed ? 'justify-center px-2' : 'px-4')}>
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
            <Waves size={20} className="stroke-[2.5]" />
          </div>
          {!isCollapsed && (
            <div className="whitespace-nowrap transition-opacity duration-200">
              <h1 className="font-bold text-sm tracking-wide text-slate-900 flex items-center gap-1.5">
                ALMAS LAUNDRY
              </h1>
              <p className="text-[10px] text-sky-600 font-semibold tracking-wider uppercase">
                Admin Management
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Menus (Dynamic) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
        {!mounted || isLoading ? (
          <div className="p-4 text-xs text-slate-400 text-center animate-pulse">
            Memuat menu dinamis...
          </div>
        ) : menus.length === 0 ? (
          <div className="p-4 text-xs text-slate-400 text-center">
            Tidak ada menu yang diizinkan untuk role ini.
          </div>
        ) : (
          menus.map((item) => {
          const hasSubmenus = item.submenus && item.submenus.length > 0;
          const isParentActive =
            isPathMatch(pathname, item.path) ||
            Boolean(hasSubmenus && item.submenus?.some((sub) => isPathMatch(pathname, sub.path)));
          const isSubmenuOpen = openSubmenus[item.id] !== undefined ? openSubmenus[item.id] : isParentActive;

          if (hasSubmenus) {
            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={() => {
                    if (isCollapsed) {
                      toggleCollapsed();
                    } else {
                      toggleSubmenu(item.id);
                    }
                  }}
                  title={isCollapsed ? item.title : undefined}
                  className={cn(
                    'w-full flex items-center rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer',
                    isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5',
                    isParentActive
                      ? 'bg-slate-100 text-sky-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  )}
                >
                  <div className={cn('flex items-center', !isCollapsed && 'gap-3')}>
                    <DynamicIcon
                      name={item.icon}
                      className={cn(
                        'w-5 h-5 shrink-0',
                        isParentActive ? 'text-sky-600' : 'text-slate-500'
                      )}
                    />
                    {!isCollapsed && <span>{item.title}</span>}
                  </div>
                  {!isCollapsed && (
                    <span className="text-slate-400">
                      {isSubmenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  )}
                </button>

                {/* Submenu List */}
                {!isCollapsed && isSubmenuOpen && (
                  <div className="pl-6 pr-1 py-1 space-y-1 border-l-2 border-slate-200 ml-5">
                    {item.submenus!.map((sub) => {
                      const isSubActive = isPathMatch(pathname, sub.path);
                      return (
                        <Link
                          key={sub.id}
                          href={sub.path}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                            isSubActive
                              ? 'bg-sky-50 text-sky-700 font-bold border border-sky-200 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          )}
                        >
                          {sub.icon && (
                            <DynamicIcon
                              name={sub.icon}
                              className={cn('w-4 h-4 shrink-0', isSubActive ? 'text-sky-600' : 'text-slate-400')}
                            />
                          )}
                          <span>{sub.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Single Root Menu Link
          const isActive = isPathMatch(pathname, item.path);
          return (
            <Link
              key={item.id}
              href={item.path}
              title={isCollapsed ? item.title : undefined}
              className={cn(
                'flex items-center rounded-xl text-xs font-semibold tracking-wide transition-all',
                isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-sky-50 text-sky-700 font-bold border border-sky-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              <DynamicIcon
                name={item.icon}
                className={cn('w-5 h-5 shrink-0', isActive ? 'text-sky-600' : 'text-slate-500')}
              />
              {!isCollapsed && <span>{item.title}</span>}
            </Link>
          );
        }))}
      </div>
    </aside>
  );
};
