import { z } from "zod";
import { Menu } from "@/types";

export const menuFormSchema = z.object({
  key: z.string().optional().nullable(),
  title: z.string().trim().min(2, { message: "Nama menu minimal 2 karakter" }),
  path: z
    .string()
    .trim()
    .min(1, { message: "Route/Path tidak boleh kosong" })
    .refine((val) => val.startsWith("/") || val === "#", {
      message: "Format route harus diawali '/' atau '#'",
    }),
  nama_akses: z.string().trim().optional().nullable(),
  icon: z.string().trim().optional().nullable(),
  parent_id: z.string().optional().nullable(),
  order_index: z.number().optional().default(1),
  is_active: z.union([z.number(), z.boolean()]).optional().default(1),
  is_sidebar: z.union([z.number(), z.boolean()]).optional().default(1),
});

export type MenuFormSchema = z.infer<typeof menuFormSchema>;

export const createMenuFormSchema = (
  menus: Menu[] = [],
  editingId?: string | number | null
) => {
  return menuFormSchema.superRefine((data, ctx) => {
    const editIdStr =
      editingId !== undefined && editingId !== null ? String(editingId) : null;
    const otherMenus = menus.filter((m) => String(m.id) !== editIdStr);

    // 1. Check Key (Must be Unique if provided)
    if (data.key && data.key.trim()) {
      const dupKey = otherMenus.find(
        (m) =>
          m.key && m.key.trim().toLowerCase() === data.key!.trim().toLowerCase()
      );
      if (dupKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Key sudah digunakan",
          path: ["key"],
        });
      }
    }

    // 2. Check Nama Menu / Title (Must be Unique)
    if (data.title && data.title.trim()) {
      const dupTitle = otherMenus.find(
        (m) =>
          m.title &&
          m.title.trim().toLowerCase() === data.title.trim().toLowerCase()
      );
      if (dupTitle) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nama menu sudah terdaftar",
          path: ["title"],
        });
      }
    }

    // 3. Check Route / Path (Must be Unique, kecuali '#')
    if (data.path && data.path.trim() && data.path.trim() !== "#") {
      const dupPath = otherMenus.find(
        (m) =>
          m.path &&
          m.path.trim() !== "#" &&
          m.path.trim().toLowerCase() === data.path.trim().toLowerCase()
      );
      if (dupPath) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Route sudah digunakan",
          path: ["path"],
        });
      }
    }

    // 4. Check Nama Akses (Must be Unique if provided)
    if (data.nama_akses && data.nama_akses.trim()) {
      const dupAkses = otherMenus.find(
        (m) =>
          m.nama_akses &&
          m.nama_akses.trim().toLowerCase() ===
            data.nama_akses!.trim().toLowerCase()
      );
      if (dupAkses) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nama akses sudah digunakan",
          path: ["nama_akses"],
        });
      }
    }
  });
};
