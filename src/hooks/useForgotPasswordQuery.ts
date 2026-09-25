import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';

export interface CheckForgotPasswordResponse {
  session_token: string;
  name: string;
  masked_email: string;
  masked_phone: string;
  question_1: string;
  question_2: string;
}

export interface VerifySecurityQuestionsResponse {
  reset_token: string;
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export function useCheckForgotPasswordMutation() {
  return useMutation({
    mutationFn: async (payload: { identifier: string }) => {
      const data = await apiClient.post<any, CheckForgotPasswordResponse>(
        '/auth/forgot-password/check',
        payload
      );
      return data;
    },
  });
}

export function useVerifySecurityQuestionsMutation() {
  return useMutation({
    mutationFn: async (payload: {
      session_token: string;
      answer_1: string;
      answer_2: string;
    }) => {
      const data = await apiClient.post<any, VerifySecurityQuestionsResponse>(
        '/auth/forgot-password/verify',
        payload
      );
      return data;
    },
  });
}

export function useResetPasswordWithTokenMutation() {
  return useMutation({
    mutationFn: async (payload: { reset_token: string; new_password: string }) => {
      const data = await apiClient.post<any, ResetPasswordResponse>(
        '/auth/forgot-password/reset',
        payload
      );
      return data;
    },
  });
}
