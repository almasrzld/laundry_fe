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

// Global Singleton SSE Connection Manager to prevent socket exhaustion
let globalEventSource: EventSource | null = null;
let globalCurrentToken: string | null = null;
let globalReconnectTimeout: any = null;
const globalListeners = new Set<() => void>();

function getOrInitEventSource(token: string) {
  if (typeof window === 'undefined') return;
  if (!token) {
    closeGlobalEventSource();
    return;
  }

  if (globalEventSource && globalCurrentToken === token) {
    return;
  }

  closeGlobalEventSource();
  globalCurrentToken = token;

  const connect = () => {
    try {
      const streamUrl = `${getApiBaseUrl()}/notifications/stream?token=${encodeURIComponent(token)}`;
      globalEventSource = new EventSource(streamUrl);

      globalEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification_update') {
            globalListeners.forEach((fn) => fn());
          }
        } catch (_) {}
      };

      globalEventSource.onerror = () => {
        if (globalEventSource) {
          globalEventSource.close();
          globalEventSource = null;
        }
        if (globalReconnectTimeout) clearTimeout(globalReconnectTimeout);
        globalReconnectTimeout = setTimeout(() => {
          if (globalListeners.size > 0 && globalCurrentToken) {
            connect();
          }
        }, 10000);
      };
    } catch (_) {
      if (globalReconnectTimeout) clearTimeout(globalReconnectTimeout);
      globalReconnectTimeout = setTimeout(() => {
        if (globalListeners.size > 0 && globalCurrentToken) {
          connect();
        }
      }, 10000);
    }
  };

  connect();
}

function closeGlobalEventSource() {
  if (globalReconnectTimeout) {
    clearTimeout(globalReconnectTimeout);
    globalReconnectTimeout = null;
  }
  if (globalEventSource) {
    globalEventSource.close();
    globalEventSource = null;
  }
  globalCurrentToken = null;
}

// Hook Real-Time SSE Listener untuk sinkronisasi notifikasi instan antar-perangkat/tab
export function useNotificationRealtimeSync() {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = getCookie(TOKEN_COOKIE);
    if (!token) {
      closeGlobalEventSource();
      return;
    }

    const onUpdate = () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEYS.unreadCount });
    };

    globalListeners.add(onUpdate);
    getOrInitEventSource(token);

    return () => {
      globalListeners.delete(onUpdate);
      if (globalListeners.size === 0) {
        closeGlobalEventSource();
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
    refetchInterval: 30000,
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
    refetchInterval: 30000,
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
