import { z } from 'zod';
import { Promo } from '@/types';

export const promoFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, { message: 'Judul promo minimal 2 karakter' }),
  subtitle: z.string().trim().optional().default(''),
  code: z
    .string()
    .trim()
    .min(3, { message: 'Kode promo minimal 3 karakter' })
    .toUpperCase(),
  discount_amount: z
    .number({ message: 'Nominal diskon harus berupa angka' })
    .min(0, { message: 'Diskon tidak boleh bernilai negatif' }),
  min_order_amount: z
    .number({ message: 'Minimal transaksi harus berupa angka' })
    .min(0, { message: 'Minimal transaksi tidak boleh negatif' }),
  icon_code: z.string().trim().optional().default('ticket'),
  is_active: z.union([z.number(), z.boolean()]).optional().default(1),
});

export type PromoFormSchema = z.infer<typeof promoFormSchema>;

export const createPromoFormSchema = (
  promos: Promo[] = [],
  editingId?: string | number | null
) => {
  return promoFormSchema.superRefine((data, ctx) => {
    const editIdStr =
      editingId !== undefined && editingId !== null ? String(editingId) : null;
    const otherPromos = promos.filter((p) => String(p.id) !== editIdStr);

    if (data.code && data.code.trim()) {
      const dupCode = otherPromos.find(
        (p) =>
          p.code &&
          p.code.trim().toUpperCase() === data.code.trim().toUpperCase()
      );
      if (dupCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Kode voucher sudah digunakan',
          path: ['code'],
        });
      }
    }
  });
};
