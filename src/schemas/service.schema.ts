import { z } from "zod";

export const serviceFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Nama layanan minimal 2 karakter" }),
  description: z.string().trim().optional().default(""),
  price: z
    .coerce
    .number({ message: "Harga harus berupa angka" })
    .min(0, { message: "Harga tidak boleh bernilai negatif" }),
  units_id: z.union([z.string(), z.number()]).optional(),
  unit_id: z.string().optional(),
  unit: z.string().trim().min(1, { message: "Satuan ukur wajib dipilih" }),
  service_categories_id: z.union([z.string(), z.number()]).optional(),
  service_category_id: z.string().optional(),
  category_id: z.string().optional(),
  category: z
    .string()
    .trim()
    .min(1, { message: "Kategori layanan wajib dipilih" }),
  icons_id: z.union([z.string(), z.number()]).optional().nullable(),
  icon_id: z.string().optional().nullable(),
  icon_code: z
    .string()
    .trim()
    .min(1, { message: "Ikon layanan wajib dipilih" }),
  duration: z
    .string()
    .trim()
    .min(1, { message: "Estimasi durasi waktu wajib diisi" }),
  is_popular: z.union([z.number(), z.boolean()]).optional().default(0),
});

export type ServiceFormSchema = z.infer<typeof serviceFormSchema>;

