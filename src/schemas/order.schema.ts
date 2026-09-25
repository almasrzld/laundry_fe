import { z } from 'zod';

export const updateOrderStatusSchema = z.object({
  status: z
    .string()
    .trim()
    .min(1, { message: 'Status pesanan tidak boleh kosong' }),
});

export type UpdateOrderStatusSchema = z.infer<typeof updateOrderStatusSchema>;

export const orderFilterSchema = z.object({
  status: z.string().optional().default('all'),
  search: z.string().optional().default(''),
});

export type OrderFilterSchema = z.infer<typeof orderFilterSchema>;
