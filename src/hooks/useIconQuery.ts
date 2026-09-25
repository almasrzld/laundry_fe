import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { IconItem } from '../types';

export const ICON_QUERY_KEYS = {
  all: ['icons'] as const,
  list: (category?: string, search?: string) => ['icons', { category, search }] as const,
  detail: (id: string) => ['icons', id] as const,
};

// 1. Hook untuk mengambil daftar master ikon
export function useIconsQuery(category?: string, search?: string) {
  return useQuery<IconItem[]>({
    queryKey: ICON_QUERY_KEYS.list(category, search),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (category && category !== 'all') queryParams.append('category', category);
      if (search && search.trim()) queryParams.append('search', search.trim());

      const url = `/icons${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await apiClient.get<any, IconItem[]>(url);
      return Array.isArray(data) ? data : [];
    },
  });
}

// 2. Hook untuk mengambil detail satu ikon
export function useIconByIdQuery(id?: string) {
  return useQuery<IconItem | null>({
    queryKey: id ? ICON_QUERY_KEYS.detail(id) : ['icons', 'empty'],
    queryFn: async () => {
      if (!id) return null;
      try {
        const data = await apiClient.get<any, IconItem>(`/icons/${id}`);
        return data || null;
      } catch {
        const list = await apiClient.get<any, IconItem[]>('/icons');
        return Array.isArray(list) ? list.find((i) => i.id === id) || null : null;
      }
    },
    enabled: !!id,
  });
}

// 3. Mutation untuk Tambah / Edit Ikon
export function useSaveIconMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      iconData,
      editingId,
    }: {
      iconData: Partial<IconItem>;
      editingId?: string | null;
    }) => {
      if (editingId) {
        return await apiClient.put(`/icons/${editingId}`, iconData);
      } else {
        return await apiClient.post('/icons', iconData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ICON_QUERY_KEYS.all });
    },
  });
}

// 4. Mutation untuk Hapus Ikon (Soft Delete)
export function useDeleteIconMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/icons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ICON_QUERY_KEYS.all });
    },
  });
}
