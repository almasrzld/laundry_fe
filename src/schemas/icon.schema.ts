import { z } from 'zod';

export const iconFormSchema = z.object({
  name: z.string().min(2, { message: 'Nama ikon minimal 2 karakter' }),
  code: z.string().min(1, { message: 'Kode ikon (Lucide) wajib diisi' }),
  category: z.string().min(1, { message: 'Kategori wajib dipilih/diisi' }),
  description: z.string().optional().nullable(),
  is_active: z.union([z.boolean(), z.number()]).default(true),
});

export type IconFormSchema = z.infer<typeof iconFormSchema>;
