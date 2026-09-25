import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { useAuthStore } from '../store/useAuthStore';

export interface UserProfile {
  id: string | number;
  id_users?: string | number;
  name?: string;
  name_users?: string;
  email: string;
  phone: string;
  role_code: string;
  status: string;
  member_tier?: string;
  laundry_pay_balance?: number;
  reward_points?: number;
  created_at?: string;
  has_security_questions?: boolean;
  is_customer?: boolean;
  security_questions?: {
    question_1: string;
    question_2: string;
  };
  addresses?: Array<{
    id: string | number;
    label: string;
    full_address: string;
    note?: string;
    is_default: boolean;
  }>;
}

export const PROFILE_QUERY_KEYS = {
  profile: ['user', 'profile'] as const,
};

// 1. Hook ambil profil user yang sedang login
export function useProfileQuery() {
  return useQuery<UserProfile>({
    queryKey: PROFILE_QUERY_KEYS.profile,
    queryFn: async () => {
      const data = await apiClient.get<any, UserProfile>('/user/profile');
      return data;
    },
  });
}

// 2. Mutation update data profil
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);

  return useMutation({
    mutationFn: async (data: { name?: string; email?: string; phone?: string }) => {
      return await apiClient.put('/user/profile', data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
      updateUser({
        name: variables.name,
        email: variables.email,
      });
    },
  });
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
  question_1?: string;
  answer_1?: string;
  question_2?: string;
  answer_2?: string;
}

// 3. Mutation ganti password
export function useChangePasswordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ChangePasswordPayload) => {
      return await apiClient.put('/user/change-password', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.profile });
    },
  });
}
