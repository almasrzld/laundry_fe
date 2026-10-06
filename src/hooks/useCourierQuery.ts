import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { Order } from '../types';

export interface CourierUser {
  id: string;
  id_users: number | string;
  name: string;
  email: string;
  phone: string;
  role_code: string;
  avatar_url?: string | null;
  total_orders: number;
  active_orders: number;
  completed_orders: number;
  total_tips: number;
  average_rating: number;
  total_reviews: number;
  created_at?: string;
}

export interface CourierSummary {
  total_couriers: number;
  active_deliveries: number;
  completed_deliveries: number;
  total_tips: number;
  average_rating: number;
}

export const COURIER_QUERY_KEYS = {
  all: ['couriers'] as const,
  summary: ['couriers', 'summary'] as const,
  tasks: (params?: any) => ['couriers', 'tasks', params] as const,
  withdrawals: (params?: any) => ['couriers', 'withdrawals', params] as const,
};

export interface WithdrawalRequest {
  id: string;
  id_withdrawal_requests: number;
  users_id: number;
  user_id: string;
  user_name: string;
  user_phone: string;
  user_email: string;
  role_code: string;
  role_name?: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: 'pending' | 'completed' | 'rejected';
  admin_notes?: string | null;
  proof_image?: string | null;
  processed_by?: number | null;
  processor_name?: string | null;
  processed_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export function useCouriersQuery() {
  return useQuery<CourierUser[]>({
    queryKey: COURIER_QUERY_KEYS.all,
    queryFn: async () => {
      const data = await apiClient.get<any, CourierUser[]>('/couriers');
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useCourierSummaryQuery() {
  return useQuery<CourierSummary>({
    queryKey: COURIER_QUERY_KEYS.summary,
    queryFn: async () => {
      const data = await apiClient.get<any, CourierSummary>('/couriers/summary');
      return data;
    },
  });
}

export function useCourierTasksQuery(params?: {
  courier_name?: string;
  courier_phone?: string;
  status?: 'active' | 'history' | 'all';
}) {
  return useQuery<Order[]>({
    queryKey: COURIER_QUERY_KEYS.tasks(params),
    queryFn: async () => {
      const data = await apiClient.get<any, Order[]>('/couriers/tasks', { params });
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useUpdateCourierTaskStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: string;
    }) => {
      return await apiClient.patch(`/couriers/tasks/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURIER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: COURIER_QUERY_KEYS.summary });
      queryClient.invalidateQueries({ queryKey: ['couriers', 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useWithdrawalsQuery(params?: { status?: string; search?: string }) {
  return useQuery<WithdrawalRequest[]>({
    queryKey: COURIER_QUERY_KEYS.withdrawals(params),
    queryFn: async () => {
      const data = await apiClient.get<any, WithdrawalRequest[]>('/system/withdrawals', { params });
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useUpdateWithdrawalStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      withdrawalId,
      status,
      adminNotes,
    }: {
      withdrawalId: string;
      status: 'completed' | 'rejected';
      adminNotes?: string;
    }) => {
      return await apiClient.put(`/system/withdrawals/${encodeURIComponent(withdrawalId)}/status`, {
        status,
        admin_notes: adminNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['couriers', 'withdrawals'] });
      queryClient.invalidateQueries({ queryKey: COURIER_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: COURIER_QUERY_KEYS.summary });
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
    },
  });
}
