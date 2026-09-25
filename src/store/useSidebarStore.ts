import { create } from 'zustand';
import { Menu } from '../types';
import { apiFetch } from '../lib/api';

export interface SidebarState {
  menus: Menu[];
  isLoading: boolean;
  error: string | null;
  isCollapsed: boolean;
  openSubmenus: Record<string, boolean>;
  toggleCollapsed: () => void;
  toggleSubmenu: (menuId: string) => void;
  fetchSidebarMenus: (roleCode?: string) => Promise<void>;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  menus: [],
  isLoading: true,
  error: null,
  isCollapsed: false,
  openSubmenus: {},
  toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  toggleSubmenu: (menuId: string) =>
    set((state) => ({
      openSubmenus: {
        ...state.openSubmenus,
        [menuId]: !state.openSubmenus[menuId],
      },
    })),
  fetchSidebarMenus: async (roleCode?: string) => {
    if (!roleCode) {
      set({ menus: [], isLoading: false });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<Menu[]>(`/system/menus/sidebar?role=${encodeURIComponent(roleCode)}`);
      if (Array.isArray(data)) {
        set({ menus: data, isLoading: false });
      } else {
        set({ menus: [], isLoading: false });
      }
    } catch (err: any) {
      console.warn('Gagal memuat menu sidebar dinamis:', err.message);
      set({ error: err.message, isLoading: false, menus: [] });
    }
  },
}));
