import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { Menu, Role } from '../types';

// Query Keys Constant
export const MENU_QUERY_KEYS = {
  all: ['menus'] as const,
  roles: ['roles'] as const,
  sidebar: (role: string) => ['sidebar-menus', role] as const,
};

// 1. Hook untuk mengambil seluruh menu
export function useMenusQuery() {
  return useQuery<Menu[]>({
    queryKey: MENU_QUERY_KEYS.all,
    queryFn: async () => {
      const data = await apiClient.get<any, Menu[]>('/system/menus');
      return Array.isArray(data) ? data : [];
    },
  });
}

// 2. Hook untuk mengambil seluruh role
export function useRolesQuery() {
  return useQuery<Role[]>({
    queryKey: MENU_QUERY_KEYS.roles,
    queryFn: async () => {
      const data = await apiClient.get<any, Role[]>('/system/roles');
      return Array.isArray(data) ? data : [];
    },
  });
}

// 3. Hook untuk mengambil menu sidebar berdasarkan role aktif
export function useSidebarMenusQuery(roleCode: string = '') {
  return useQuery<Menu[]>({
    queryKey: MENU_QUERY_KEYS.sidebar(roleCode),
    queryFn: async () => {
      if (!roleCode) return [];
      const data = await apiClient.get<any, Menu[]>(
        `/system/menus/sidebar?role=${encodeURIComponent(roleCode)}`
      );
      return Array.isArray(data) ? data : [];
    },
    enabled: !!roleCode,
  });
}

// 4. Mutation untuk Tambah / Edit Menu
export function useSaveMenuMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      menuData,
      allowedRoles,
      editingId,
    }: {
      menuData: Partial<Menu>;
      allowedRoles?: string[];
      editingId?: string | null;
    }) => {
      const payload = {
        ...menuData,
        allowed_roles: allowedRoles,
      };

      if (editingId) {
        return await apiClient.put(`/system/menus/${editingId}`, payload);
      } else {
        return await apiClient.post('/system/menus', payload);
      }
    },
    onSuccess: () => {
      // Invalidate query menus & sidebar agar otomatis update di seluruh UI
      queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['sidebar-menus'] });
    },
  });
}

// 5. Mutation untuk Hapus Menu
export function useDeleteMenuMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (menuId: string) => {
      return await apiClient.delete(`/system/menus/${menuId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['sidebar-menus'] });
    },
  });
}

// 6. Mutation untuk Reorder Urutan Menu
export function useReorderMenuMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: { id: string; order_index: number }[]) => {
      return await apiClient.put('/system/menus/reorder', { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['sidebar-menus'] });
    },
  });
}
