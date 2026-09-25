import { create } from 'zustand';
import { Menu, Role } from '../types';
import { apiFetch } from '../lib/api';

export type MenuManagementTab = 'menus' | 'sidebar';

export interface MenuManagementState {
  currentTab: MenuManagementTab;
  setTab: (tab: MenuManagementTab) => void;

  menus: Menu[];
  roles: Role[];
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;

  isMenuModalOpen: boolean;
  editingMenu: Menu | null;
  openMenuModal: (menu?: Menu | null) => void;
  closeMenuModal: () => void;

  fetchMenus: () => Promise<void>;
  fetchRoles: () => Promise<void>;

  saveMenu: (menuData: Partial<Menu>, allowedRoles?: string[]) => Promise<boolean>;
  softDeleteMenu: (menuId: string) => Promise<boolean>;
  moveMenuOrder: (menuId: string, direction: 'up' | 'down') => Promise<void>;
  saveSidebarOrder: () => Promise<boolean>;
}

export const useMenuManagementStore = create<MenuManagementState>((set, get) => ({
  currentTab: 'menus',
  setTab: (tab) => {
    set({ currentTab: tab, error: null, successMessage: null });
    get().fetchMenus();
    get().fetchRoles();
  },

  menus: [],
  roles: [],
  isLoading: false,
  error: null,
  successMessage: null,

  isMenuModalOpen: false,
  editingMenu: null,
  openMenuModal: (menu = null) => set({ isMenuModalOpen: true, editingMenu: menu }),
  closeMenuModal: () => set({ isMenuModalOpen: false, editingMenu: null }),

  fetchMenus: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<Menu[]>('/system/menus');
      set({ menus: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Gagal mengambil daftar menu', isLoading: false });
    }
  },

  fetchRoles: async () => {
    try {
      const data = await apiFetch<Role[]>('/system/roles');
      set({ roles: data });
    } catch (_) {}
  },

  saveMenu: async (menuData, allowedRoles = []) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      if (menuData.id) {
        await apiFetch(`/system/menus/${menuData.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...menuData, allowed_roles: allowedRoles }),
        });
        set({ successMessage: 'Menu berhasil diperbarui' });
      } else {
        await apiFetch('/system/menus', {
          method: 'POST',
          body: JSON.stringify({ ...menuData, allowed_roles: allowedRoles }),
        });
        set({ successMessage: 'Menu baru berhasil ditambahkan' });
      }
      get().closeMenuModal();
      await get().fetchMenus();
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Gagal menyimpan menu', isLoading: false });
      return false;
    }
  },

  softDeleteMenu: async (menuId) => {
    set({ isLoading: true, error: null, successMessage: null });
    try {
      await apiFetch(`/system/menus/${menuId}`, { method: 'DELETE' });
      set({ successMessage: 'Menu berhasil dihapus' });
      await get().fetchMenus();
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Gagal menghapus menu', isLoading: false });
      return false;
    }
  },

  moveMenuOrder: async (menuId, direction) => {
    const list = [...get().menus];
    const index = list.findIndex((m) => m.id === menuId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Update order_index
    list.forEach((item, idx) => {
      item.order_index = idx + 1;
    });

    set({ menus: list });
    await get().saveSidebarOrder();
  },

  saveSidebarOrder: async () => {
    try {
      const items = get().menus.map((m, idx) => ({ id: m.id, order_index: idx + 1 }));
      await apiFetch('/system/menus/reorder', {
        method: 'PUT',
        body: JSON.stringify({ items }),
      });
      set({ successMessage: 'Urutan menu berhasil disimpan' });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Gagal menyimpan urutan menu' });
      return false;
    }
  },
}));
