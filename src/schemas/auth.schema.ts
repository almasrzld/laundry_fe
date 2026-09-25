import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: 'Email wajib diisi' })
    .email({ message: 'Format email tidak valid' }),
  password: z
    .string()
    .min(1, { message: 'Kata sandi wajib diisi' }),
  captcha: z
    .string()
    .trim()
    .min(1, { message: 'Kode captcha wajib diisi' }),
});

export type LoginSchema = z.infer<typeof loginSchema>;
