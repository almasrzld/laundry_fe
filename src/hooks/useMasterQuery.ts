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
  OutletItem,
  OngkirItem,
  OngkirTierPreview,
  CalculateOngkirResult,
} from '../types';

export const MASTER_QUERY_KEYS = {
  units: (search?: string) => ['master', 'units', { search }] as const,
  categories: (search?: string) => ['master', 'service-categories', { search }] as const,
  perfumes: (search?: string) => ['master', 'perfumes', { search }] as const,
  shelfTypes: (search?: string) => ['master', 'shelf-types', { search }] as const,
  shelves: (search?: string) => ['storage-shelves', { search }] as const,
  paymentMethods: (search?: string) => ['master', 'payment-methods', { search }] as const,
  orderStatuses: (search?: string) => ['master', 'order-statuses', { search }] as const,
  outlets: (search?: string) => ['master', 'outlets', { search }] as const,
  ongkirs: (search?: string) => ['master', 'ongkirs', { search }] as const,
  ongkirNextCode: () => ['master', 'ongkirs', 'next-code'] as const,
  ongkirPreviewTiers: (params: any) => ['master', 'ongkirs', 'preview-tiers', params] as const,
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

// ==================== 7. OUTLETS (MASTER OUTLET) ====================
export function useOutletsQuery(search?: string) {
  return useQuery<OutletItem[]>({
    queryKey: MASTER_QUERY_KEYS.outlets(search),
    queryFn: async () => {
      const q = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const data = await apiClient.get<any, OutletItem[]>(`/master/outlets${q}`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSaveOutletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, editingId }: { data: Partial<OutletItem>; editingId?: string | null }) => {
      if (editingId) return await apiClient.put(`/master/outlets/${editingId}`, data);
      return await apiClient.post('/master/outlets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'outlets'] });
      queryClient.invalidateQueries({ queryKey: ['master', 'ongkirs'] });
    },
  });
}

export function useDeleteOutletMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/master/outlets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'outlets'] });
      queryClient.invalidateQueries({ queryKey: ['master', 'ongkirs'] });
    },
  });
}

// ==================== 8. ONGKIRS (MASTER ONGKIR) ====================
export function useOngkirsQuery(search?: string) {
  return useQuery<OngkirItem[]>({
    queryKey: MASTER_QUERY_KEYS.ongkirs(search),
    queryFn: async () => {
      const q = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const data = await apiClient.get<any, OngkirItem[]>(`/master/ongkirs${q}`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useNextOngkirCodeQuery(options?: { enabled?: boolean }) {
  return useQuery<{ code: string }>({
    queryKey: MASTER_QUERY_KEYS.ongkirNextCode(),
    queryFn: async () => {
      const data = await apiClient.get<any, { code: string }>('/master/ongkirs/next-code');
      return data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useOngkirPreviewTiersQuery(params: {
  free_radius?: number;
  base_radius?: number;
  base_price?: number;
  step_radius?: number;
  step_price?: number;
  max_radius?: number;
  unit_symbol?: string;
}) {
  return useQuery<OngkirTierPreview[]>({
    queryKey: MASTER_QUERY_KEYS.ongkirPreviewTiers(params),
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.free_radius !== undefined) sp.set('free_radius', String(params.free_radius));
      if (params.base_radius !== undefined) sp.set('base_radius', String(params.base_radius));
      if (params.base_price !== undefined) sp.set('base_price', String(params.base_price));
      if (params.step_radius !== undefined) sp.set('step_radius', String(params.step_radius));
      if (params.step_price !== undefined) sp.set('step_price', String(params.step_price));
      if (params.max_radius !== undefined) sp.set('max_radius', String(params.max_radius));
      if (params.unit_symbol) sp.set('unit_symbol', params.unit_symbol);

      const data = await apiClient.get<any, OngkirTierPreview[]>(`/master/ongkirs/preview-tiers?${sp.toString()}`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !isNaN(Number(params.base_price)) && !isNaN(Number(params.step_price)),
  });
}

export function useCalculateOngkirMutation() {
  return useMutation<CalculateOngkirResult, Error, { outlets_id?: string; latitude: number; longitude: number }>({
    mutationFn: async (payload) => {
      return await apiClient.post<any, CalculateOngkirResult>('/master/ongkirs/calculate', payload);
    },
  });
}

export function useSaveOngkirMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, editingId }: { data: Partial<OngkirItem>; editingId?: string | null }) => {
      if (editingId) return await apiClient.put(`/master/ongkirs/${editingId}`, data);
      return await apiClient.post('/master/ongkirs', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'ongkirs'] });
    },
  });
}

export function useDeleteOngkirMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/master/ongkirs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master', 'ongkirs'] });
    },
  });
}
