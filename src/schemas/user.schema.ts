import { z } from 'zod';
import { SystemUser, Role, Permission } from '@/types';

export const userFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Nama pengguna minimal 2 karakter' }),
  email: z
    .string()
    .trim()
    .email({ message: 'Format email tidak valid' }),
  phone: z
    .string()
    .trim()
    .min(8, { message: 'Nomor telepon/HP minimal 8 digit' })
    .max(25, { message: 'Nomor telepon/HP maksimal 25 karakter' }),
  role_code: z
    .string()
    .trim()
    .min(1, { message: 'Silakan pilih role pengguna' }),
  status: z.string().optional().default('active'),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 6, {
      message: 'Password minimal 6 karakter jika ingin diatur / diubah',
    }),
});

export type UserFormSchema = z.infer<typeof userFormSchema>;

export const createUserFormSchema = (
  users: SystemUser[] = [],
  editingId?: string | number | null
) => {
  return userFormSchema.superRefine((data, ctx) => {
    const editIdStr =
      editingId !== undefined && editingId !== null ? String(editingId) : null;
    const otherUsers = users.filter((u) => String(u.id) !== editIdStr);

    // 1. Check Email Uniqueness
    if (data.email && data.email.trim()) {
      const dupEmail = otherUsers.find(
        (u) =>
          u.email &&
          u.email.trim().toLowerCase() === data.email.trim().toLowerCase()
      );
      if (dupEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Email sudah terdaftar',
          path: ['email'],
        });
      }
    }

    // 2. Check Phone Uniqueness (comparing normalized digits without leading 0 or 62)
    if (data.phone && data.phone.trim()) {
      const normalize = (val: string) => {
        let d = val.replace(/\D/g, '');
        if (d.startsWith('62')) d = d.slice(2);
        while (d.startsWith('0')) d = d.slice(1);
        return d;
      };
      const normInput = normalize(data.phone);
      if (normInput) {
        const dupPhone = otherUsers.find(
          (u) => u.phone && normalize(u.phone) === normInput
        );
        if (dupPhone) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Nomor HP sudah terdaftar',
            path: ['phone'],
          });
        }
      }
    }
  });
};

export const roleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Nama role minimal 2 karakter' }),
  code: z.string().trim().optional(),
});

export type RoleFormSchema = z.infer<typeof roleFormSchema>;

export const createRoleFormSchema = (
  roles: Role[] = [],
  editingId?: string | number | null
) => {
  return roleFormSchema.superRefine((data, ctx) => {
    const editIdStr =
      editingId !== undefined && editingId !== null ? String(editingId) : null;
    const otherRoles = roles.filter((r) => String(r.id) !== editIdStr);

    // 1. Check Role Name Uniqueness
    if (data.name && data.name.trim()) {
      const dupName = otherRoles.find(
        (r) =>
          r.name &&
          r.name.trim().toLowerCase() === data.name.trim().toLowerCase()
      );
      if (dupName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nama role sudah digunakan',
          path: ['name'],
        });
      }
    }
  });
};

export const permissionFormSchema = z.object({
  parent_menu: z.string().trim().min(1, { message: 'Parent menu harus dipilih' }),
  code: z
    .string()
    .trim()
    .min(2, { message: 'Nama akses minimal 2 karakter' })
    .regex(/^[a-zA-Z0-9_.-]+$/, {
      message: 'Format nama akses hanya boleh huruf, angka, titik (.), dash (-), atau underscore (_)',
    }),
  name: z.string().trim().min(2, { message: 'Deskripsi akses minimal 2 karakter' }),
});

export type PermissionFormSchema = z.infer<typeof permissionFormSchema>;

export const createPermissionFormSchema = (
  permissions: Permission[] = [],
  editingId?: string | number | null
) => {
  return permissionFormSchema.superRefine((data, ctx) => {
    const editIdStr =
      editingId !== undefined && editingId !== null ? String(editingId) : null;
    const otherPerms = permissions.filter((p) => String(p.id) !== editIdStr);

    // 1. Check Code / Nama Akses Uniqueness
    if (data.code && data.code.trim()) {
      const dup = otherPerms.find(
        (p) =>
          p.code &&
          p.code.trim().toLowerCase() === data.code.trim().toLowerCase()
      );
      if (dup) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Nama akses sudah digunakan',
          path: ['code'],
        });
      }
    }
  });
};
