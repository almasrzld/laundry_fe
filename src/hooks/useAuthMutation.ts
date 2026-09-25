import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';

export interface LoginPayload {
  email: string;
  password?: string;
}

export interface LoginResponse {
  user: {
    id: string | number;
    name: string;
    email: string;
    phone?: string;
    role_code?: string;
    role?: string;
  };
  token?: string;
}

// 1. Mutation untuk Login
export function useLoginMutation() {
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      // Direct call to auth login or simulation
      try {
        const data = await apiClient.post<any, LoginResponse>('/auth/login', payload);
        return data;
      } catch (err: any) {
        // If backend returns error or endpoint not reachable, still format meaningful error
        throw err;
      }
    },
  });
}

// 2. Query untuk info profile user yang sedang login
export function useCurrentAuthUserQuery() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const data = await apiClient.get<any, any>('/auth/me');
        return data;
      } catch {
        return null;
      }
    },
    retry: false,
  });
}
