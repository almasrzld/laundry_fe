import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import {
  UnitItem,
  ServiceCategoryItem,
  PerfumeItem,
  ShelfTypeItem,
  StorageShelfItem,
  PaymentMethodItem,
  OrderStatusItem,
} from '../types';

export const MASTER_QUERY_KEYS = {
  units: (search?: string) => ['master', 'units', { search }] as const,
  categories: (search?: string) => ['master', 'service-categories', { search }] as const,
  perfumes: (search?: string) => ['master', 'perfumes', { search }] as const,
  shelfTypes: (search?: string) => ['master', 'shelf-types', { search }] as const,
  shelves: (search?: string) => ['storage-shelves', { search }] as const,
  paymentMethods: (search?: string) => ['master', 'payment-methods', { search }] as const,
  orderStatuses: (search?: string) => ['master', 'order-statuses', { search }] as const,
};

// ==================== 0. SHELF TYPES (JENIS RAK) ====================
export function useShelfTypesQuery(search?: string) {
  return useQuery<ShelfTypeItem[]>({
    queryKey: MASTER_QUERY_KEYS.shelfTypes(search),
    queryFn: async () => {
      const q = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const data = await apiClient.get<any, ShelfTypeItem[]>(`/master/shelf-types${q}`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSaveShelfTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, editingId }: { data: Partial<ShelfTypeItem>; editingId?: string | null }) => {
      if (editingId) return await apiClient.put(`/master/shelf-types/${editingId}`, data);
      return await apiClient.post('/master/shelf-types', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'shelf-types'] });
      queryClient.invalidateQueries({ queryKey: ['storage-shelves'] });
    },
  });
}

export function useDeleteShelfTypeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/master/shelf-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'shelf-types'] });
      queryClient.invalidateQueries({ queryKey: ['storage-shelves'] });
    },
  });
}

// ==================== 1. UNITS ====================
export function useUnitsQuery(search?: string) {
  return useQuery<UnitItem[]>({
    queryKey: MASTER_QUERY_KEYS.units(search),
    queryFn: async () => {
      const q = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const data = await apiClient.get<any, UnitItem[]>(`/master/units${q}`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSaveUnitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, editingId }: { data: Partial<UnitItem>; editingId?: string | null }) => {
      if (editingId) return await apiClient.put(`/master/units/${editingId}`, data);
      return await apiClient.post('/master/units', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'units'] });
    },
  });
}

export function useDeleteUnitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/master/units/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'units'] });
    },
  });
}

// ==================== 2. SERVICE CATEGORIES ====================
export function useServiceCategoriesQuery(search?: string) {
  return useQuery<ServiceCategoryItem[]>({
    queryKey: MASTER_QUERY_KEYS.categories(search),
    queryFn: async () => {
      const q = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const data = await apiClient.get<any, ServiceCategoryItem[]>(`/master/service-categories${q}`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSaveServiceCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, editingId }: { data: Partial<ServiceCategoryItem>; editingId?: string | null }) => {
      if (editingId) return await apiClient.put(`/master/service-categories/${editingId}`, data);
      return await apiClient.post('/master/service-categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'service-categories'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useDeleteServiceCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/master/service-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'service-categories'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

// ==================== 3. PERFUMES ====================
export function usePerfumesQuery(search?: string) {
  return useQuery<PerfumeItem[]>({
    queryKey: MASTER_QUERY_KEYS.perfumes(search),
    queryFn: async () => {
      const q = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const data = await apiClient.get<any, PerfumeItem[]>(`/master/perfumes${q}`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSavePerfumeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, editingId }: { data: Partial<PerfumeItem>; editingId?: string | null }) => {
      if (editingId) return await apiClient.put(`/master/perfumes/${editingId}`, data);
      return await apiClient.post('/master/perfumes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'perfumes'] });
    },
  });
}

export function useDeletePerfumeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/master/perfumes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'perfumes'] });
    },
  });
}

// ==================== 4. STORAGE SHELVES ====================
export async function fetchNextShelfCode(shelfTypeId: number | string): Promise<string> {
  try {
    const res = await apiClient.get<any, { code: string }>(`/storage-shelves/next-code?typeId=${shelfTypeId}`);
    return res?.code || '';
  } catch {
    return '';
  }
}

export function useNextShelfCodeQuery(shelfTypeId?: number | string | null) {
  return useQuery<{ code: string }>({
    queryKey: ['storage-shelves', 'next-code', shelfTypeId],
    queryFn: async () => {
      if (!shelfTypeId) return { code: '' };
      const res = await apiClient.get<any, { code: string }>(`/storage-shelves/next-code?typeId=${shelfTypeId}`);
      return res || { code: '' };
    },
    enabled: Boolean(shelfTypeId),
  });
}

export function useStorageShelvesQuery(search?: string) {
  return useQuery<StorageShelfItem[]>({
    queryKey: MASTER_QUERY_KEYS.shelves(search),
    queryFn: async () => {
      const q = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const data = await apiClient.get<any, StorageShelfItem[]>(`/storage-shelves${q}`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSaveStorageShelfMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, editingId }: { data: Partial<StorageShelfItem>; editingId?: string | null }) => {
      if (editingId) return await apiClient.put(`/storage-shelves/${editingId}`, data);
      return await apiClient.post('/storage-shelves', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-shelves'] });
    },
  });
}

export function useDeleteStorageShelfMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/storage-shelves/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-shelves'] });
    },
  });
}

// ==================== 5. PAYMENT METHODS ====================
export function usePaymentMethodsQuery(search?: string) {
  return useQuery<PaymentMethodItem[]>({
    queryKey: MASTER_QUERY_KEYS.paymentMethods(search),
    queryFn: async () => {
      const q = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const data = await apiClient.get<any, PaymentMethodItem[]>(`/master/payment-methods${q}`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSavePaymentMethodMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, editingId }: { data: Partial<PaymentMethodItem>; editingId?: string | null }) => {
      if (editingId) return await apiClient.put(`/master/payment-methods/${editingId}`, data);
      return await apiClient.post('/master/payment-methods', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'payment-methods'] });
    },
  });
}

export function useDeletePaymentMethodMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/master/payment-methods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'payment-methods'] });
    },
  });
}

// ==================== 6. ORDER STATUSES ====================
export function useOrderStatusesQuery(search?: string) {
  return useQuery<OrderStatusItem[]>({
    queryKey: MASTER_QUERY_KEYS.orderStatuses(search),
    queryFn: async () => {
      const q = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const data = await apiClient.get<any, OrderStatusItem[]>(`/master/order-statuses${q}`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSaveOrderStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, editingId }: { data: Partial<OrderStatusItem>; editingId?: string | null }) => {
      if (editingId) return await apiClient.put(`/master/order-statuses/${editingId}`, data);
      return await apiClient.post('/master/order-statuses', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'order-statuses'] });
    },
  });
}

export function useDeleteOrderStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/master/order-statuses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'order-statuses'] });
    },
  });
}
