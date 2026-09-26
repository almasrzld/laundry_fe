import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { getApiBaseUrl } from '../lib/api';
import { getCookie } from '../lib/cookies';
import { TOKEN_COOKIE } from '../store/useAuthStore';

export interface NotificationItem {
  id: string;
  id_notifications?: number | string;
  users_id?: number | string | null;
  user_id?: string | null;
  orders_id?: number | string | null;
  order_id?: string | null;
  title: string;
  message: string;
  type: 'order_created' | 'courier_assigned' | 'order_ready' | 'order_completed' | 'general' | string;
  target_role?: string | null;
  is_read: boolean;
  data?: any;
  created_at: string;
  invoice_no?: string | null;
  service_name?: string | null;
  order_status?: string | null;
}

export const NOTIFICATION_QUERY_KEYS = {
  all: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

// Hook Real-Time SSE Listener untuk sinkronisasi notifikasi instan antar-perangkat/tab
export function useNotificationRealtimeSync() {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = getCookie(TOKEN_COOKIE);
    if (!token) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        const streamUrl = `${getApiBaseUrl()}/notifications/stream?token=${encodeURIComponent(token)}`;
        eventSource = new EventSource(streamUrl);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification_update') {
              // Notifikasi baru atau pembaruan dibaca diterima real-time
              queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all });
              queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.unreadCount });
            }
          } catch (_) {}
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect otomatis setelah 5 detik jika terputus
          reconnectTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [queryClient]);
}

// 1. Hook untuk mengambil daftar notifikasi
export function useNotificationsQuery(limit = 30) {
  useNotificationRealtimeSync();

  return useQuery<NotificationItem[]>({
    queryKey: [...NOTIFICATION_QUERY_KEYS.all, limit],
    queryFn: async () => {
      const data = await apiClient.get<any, NotificationItem[]>(`/notifications?limit=${limit}`);
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 5000, // Sinkronisasi otomatis setiap 5 detik
    refetchOnWindowFocus: true,
  });
}

// 2. Hook untuk mengambil jumlah notifikasi belum dibaca
export function useUnreadNotificationCountQuery() {
  useNotificationRealtimeSync();

  return useQuery<{ unread_count: number }>({
    queryKey: NOTIFICATION_QUERY_KEYS.unreadCount,
    queryFn: async () => {
      const data = await apiClient.get<any, { unread_count: number }>('/notifications/unread-count');
      return data || { unread_count: 0 };
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

// 3. Mutation untuk menandai 1 notifikasi telah dibaca (dengan Optimistic Update agar instan)
export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.patch(`/notifications/${id}/read`, {});
    },
    onMutate: async (id: string) => {
      // Optimistic update: langsung kurangi badge dan ubah status notifikasi di UI tanpa menunggu respons server
      queryClient.setQueryData<{ unread_count: number }>(NOTIFICATION_QUERY_KEYS.unreadCount, (old) => ({
        unread_count: Math.max(0, (old?.unread_count || 1) - 1),
      }));

      queryClient.setQueriesData<NotificationItem[]>({ queryKey: NOTIFICATION_QUERY_KEYS.all }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((item) => (item.id === id ? { ...item, is_read: true } : item));
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.unreadCount });
    },
  });
}

// 4. Mutation untuk menandai semua notifikasi telah dibaca (dengan Optimistic Update agar instan)
export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return await apiClient.patch('/notifications/read-all', {});
    },
    onMutate: async () => {
      // Optimistic update: langsung set unread count jadi 0
      queryClient.setQueryData<{ unread_count: number }>(NOTIFICATION_QUERY_KEYS.unreadCount, {
        unread_count: 0,
      });

      queryClient.setQueriesData<NotificationItem[]>({ queryKey: NOTIFICATION_QUERY_KEYS.all }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((item) => ({ ...item, is_read: true }));
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.unreadCount });
    },
  });
}
