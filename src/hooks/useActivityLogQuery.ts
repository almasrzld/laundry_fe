import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';

export interface ActivityLogItem {
  id_activity_logs: number;
  id: string;
  log_type: 'main' | 'secondary';
  users_id?: number | null;
  user_id?: string | null;
  user_code: string;
  user_name: string;
  user_role?: string | null;
  activity: string;
  ip_address: string;
  location: string;
  user_agent?: string | null;
  payload?: any;
  created_at: string;
  date_formatted: string;
  time_formatted: string;
}

export interface ActivityLogsResponse {
  data: ActivityLogItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ActivityLogParams {
  type: 'main' | 'secondary';
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const ACTIVITY_LOG_QUERY_KEYS = {
  all: ['activity-logs'] as const,
  list: (params: ActivityLogParams) => ['activity-logs', params] as const,
};

export function useActivityLogsQuery(params: ActivityLogParams) {
  return useQuery<ActivityLogsResponse>({
    queryKey: ACTIVITY_LOG_QUERY_KEYS.list(params),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set('type', params.type);
      if (params.startDate) queryParams.set('start_date', params.startDate);
      if (params.endDate) queryParams.set('end_date', params.endDate);
      if (params.search) queryParams.set('search', params.search);
      if (params.page) queryParams.set('page', String(params.page));
      if (params.limit) queryParams.set('limit', String(params.limit));

      const res = await apiClient.get<any, ActivityLogsResponse>(`/activity-logs?${queryParams.toString()}`);
      return res || { data: [], total: 0, page: 1, limit: 20, total_pages: 1 };
    },
    placeholderData: (previousData) => previousData,
  });
}
