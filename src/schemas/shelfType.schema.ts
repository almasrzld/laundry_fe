import { z } from "zod";

export const shelfTypeFormSchema = z.object({
  name: z.string().min(1, "Nama jenis rak wajib diisi"),
});

export type ShelfTypeFormSchema = z.infer<typeof shelfTypeFormSchema>;
