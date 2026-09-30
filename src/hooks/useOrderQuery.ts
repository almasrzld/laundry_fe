import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { Order } from '../types';

export const ORDER_QUERY_KEYS = {
  all: ['orders'] as const,
  detail: (id: string) => ['orders', id] as const,
};

// 1. Hook untuk mengambil seluruh daftar order
export function useOrdersQuery() {
  return useQuery<Order[]>({
    queryKey: ORDER_QUERY_KEYS.all,
    queryFn: async () => {
      const data = await apiClient.get<any, Order[]>('/orders');
      return Array.isArray(data) ? data : [];
    },
  });
}

// 2. Hook untuk mengambil detail order
export function useOrderByIdQuery(id?: string) {
  return useQuery<Order | null>({
    queryKey: id ? ORDER_QUERY_KEYS.detail(id) : ['orders', 'empty'],
    queryFn: async () => {
      if (!id) return null;
      const data = await apiClient.get<any, Order>(`/orders/${id}`);
      return data || null;
    },
    enabled: !!id,
  });
}

// 3. Mutation untuk update status pesanan
export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
      order_statuses_id,
    }: {
      orderId: string;
      status?: string;
      order_statuses_id?: string | number;
    }) => {
      return await apiClient.patch(`/orders/${orderId}/status`, { status, order_statuses_id });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.detail(variables.orderId) });
    },
  });
}

// 4. Mutation untuk membuat pesanan baru
export function useCreateOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      service_name: string;
      service_type?: string;
      quantity: number;
      unit?: string;
      price_per_unit: number;
      pickup_address: string;
      delivery_address?: string;
      notes?: string;
    }) => {
      return await apiClient.post('/orders', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.all });
    },
  });
}

// 5. Mutation untuk memperbarui data pesanan (Edit)
export function useUpdateOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      orderData,
    }: {
      orderId: string;
      orderData: {
        service_name?: string;
        service_type?: string;
        quantity?: number;
        unit?: string;
        price_per_unit?: number;
        pickup_address?: string;
        delivery_address?: string;
        courier_name?: string;
        courier_phone?: string;
        notes?: string;
        status?: string;
        order_statuses_id?: string | number;
      };
    }) => {
      return await apiClient.put(`/orders/${orderId}`, orderData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.detail(variables.orderId) });
    },
  });
}

// 6. Hook untuk memeriksa status dan bukti pembayaran (Payment Proof)
export function usePaymentStatusQuery(orderId?: string) {
  return useQuery<{
    status: string;
    paid_at?: string | null;
    amount?: number;
    payment_method?: string;
    proof_image?: string | null;
  } | null>({
    queryKey: ['payments', 'status', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      try {
        const res = await apiClient.get<any, any>(`/payments/status/${orderId}`);
        return res || null;
      } catch {
        return null;
      }
    },
    enabled: !!orderId,
  });
}

// 7. Mutation untuk Admin / Kasir mengonfirmasi pembayaran lunas
export function useConfirmPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      return await apiClient.post('/payments/confirm', { order_id: orderId });
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: ['payments', 'status', orderId] });
    },
  });
}

