import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { ServiceItem } from '../types';

export const SERVICE_QUERY_KEYS = {
  all: ['services'] as const,
  list: (category?: string, search?: string) => ['services', { category, search }] as const,
  detail: (id: string) => ['services', id] as const,
};

// 1. Hook untuk mengambil katalog layanan
export function useServicesQuery(category?: string, search?: string) {
  return useQuery<ServiceItem[]>({
    queryKey: SERVICE_QUERY_KEYS.list(category, search),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (category && category !== 'all') queryParams.append('category', category);
      if (search && search.trim()) queryParams.append('q', search.trim());

      const url = `/services${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const data = await apiClient.get<any, ServiceItem[]>(url);
      return Array.isArray(data) ? data : [];
    },
  });
}

// 2. Hook untuk mengambil detail satu layanan
export function useServiceByIdQuery(id?: string) {
  return useQuery<ServiceItem | null>({
    queryKey: id ? SERVICE_QUERY_KEYS.detail(id) : ['services', 'empty'],
    queryFn: async () => {
      if (!id) return null;
      try {
        const data = await apiClient.get<any, ServiceItem>(`/services/${id}`);
        return data || null;
      } catch {
        // Fallback fetch all list if single endpoint is not supported
        const list = await apiClient.get<any, ServiceItem[]>('/services');
        return Array.isArray(list) ? list.find((s) => s.id === id) || null : null;
      }
    },
    enabled: !!id,
  });
}

// 3. Mutation untuk Tambah / Edit Layanan
export function useSaveServiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serviceData,
      editingId,
    }: {
      serviceData: Partial<ServiceItem>;
      editingId?: string | null;
    }) => {
      if (editingId) {
        return await apiClient.put(`/services/${editingId}`, serviceData);
      } else {
        return await apiClient.post('/services', serviceData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_QUERY_KEYS.all });
    },
  });
}

// 4. Mutation untuk Hapus Layanan
export function useDeleteServiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId: string) => {
      return await apiClient.delete(`/services/${encodeURIComponent(serviceId)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_QUERY_KEYS.all });
    },
  });
}
