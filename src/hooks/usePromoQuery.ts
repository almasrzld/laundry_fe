import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { Promo } from '../types';

export const PROMO_QUERY_KEYS = {
  all: ['promos'] as const,
};

// 1. Hook untuk mengambil daftar promo
export function usePromosQuery() {
  return useQuery<Promo[]>({
    queryKey: PROMO_QUERY_KEYS.all,
    queryFn: async () => {
      const data = await apiClient.get<any, Promo[]>('/promos');
      return Array.isArray(data) ? data : [];
    },
  });
}

// 2. Mutation untuk Tambah / Edit Promo
export function useSavePromoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      promoData,
      editingId,
    }: {
      promoData: Partial<Promo>;
      editingId?: string | null;
    }) => {
      if (editingId) {
        return await apiClient.put(`/promos/${editingId}`, promoData);
      } else {
        return await apiClient.post('/promos', promoData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMO_QUERY_KEYS.all });
    },
  });
}

// 3. Mutation untuk Hapus Promo
export function useDeletePromoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promoId: string) => {
      return await apiClient.delete(`/promos/${promoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMO_QUERY_KEYS.all });
    },
  });
}

// 4. Helper untuk mengambil kode promo otomatis
export async function fetchGeneratedPromoCode(random: boolean = false): Promise<string> {
  try {
    const res: any = await apiClient.get('/promos/generate-code', {
      params: random ? { random: 'true' } : undefined,
    });
    return res?.code || '';
  } catch (_) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randStr = '';
    for (let i = 0; i < 6; i++) {
      randStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `PROMO${randStr}`;
  }
}

