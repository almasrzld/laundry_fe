import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';
import { SystemUser, Role, Permission } from '../types';
import { useAuthStore } from '../store/useAuthStore';

export const USER_MANAGEMENT_QUERY_KEYS = {
  activeUsers: ['system-users', 'active'] as const,
  inactiveUsers: ['system-users', 'inactive'] as const,
  roles: ['system-roles'] as const,
  permissions: ['system-permissions'] as const,
  permissionMatrix: ['system-permission-matrix'] as const,
};

// 1. Hook untuk mengambil user aktif
export function useActiveUsersQuery() {
  return useQuery<SystemUser[]>({
    queryKey: USER_MANAGEMENT_QUERY_KEYS.activeUsers,
    queryFn: async () => {
      const data = await apiClient.get<any, SystemUser[]>('/system/users?tab=active');
      return Array.isArray(data) ? data : [];
    },
  });
}

// 2. Hook untuk mengambil user keluar / tidak aktif
export function useInactiveUsersQuery() {
  return useQuery<SystemUser[]>({
    queryKey: USER_MANAGEMENT_QUERY_KEYS.inactiveUsers,
    queryFn: async () => {
      const data = await apiClient.get<any, SystemUser[]>('/system/users?tab=inactive');
      return Array.isArray(data) ? data : [];
    },
  });
}

// 3. Hook untuk mengambil daftar roles
export function useSystemRolesQuery() {
  return useQuery<Role[]>({
    queryKey: USER_MANAGEMENT_QUERY_KEYS.roles,
    queryFn: async () => {
      const data = await apiClient.get<any, Role[]>('/system/roles');
      return Array.isArray(data) ? data : [];
    },
  });
}

// 4. Hook untuk mengambil daftar permissions
export function usePermissionsQuery() {
  return useQuery<Permission[]>({
    queryKey: USER_MANAGEMENT_QUERY_KEYS.permissions,
    queryFn: async () => {
      const data = await apiClient.get<any, Permission[]>('/system/permissions');
      return Array.isArray(data) ? data : [];
    },
  });
}

// 5. Hook untuk mengambil matriks hak akses per role
export function usePermissionMatrixQuery() {
  return useQuery<Record<string, string[]>>({
    queryKey: USER_MANAGEMENT_QUERY_KEYS.permissionMatrix,
    queryFn: async () => {
      const res = await apiClient.get<any, any>('/system/matrix');
      if (res && typeof res === 'object') {
        if (res.matrix && typeof res.matrix === 'object') {
          return res.matrix as Record<string, string[]>;
        }
        return res as Record<string, string[]>;
      }
      return {};
    },
  });
}

// 5b. Hook untuk mengecek apakah role aktif memiliki hak akses tertentu (secara dinamis dari matriks hak akses DB)
export function useHasPermission(permissionCode: string): boolean {
  const { currentRole } = useAuthStore();
  const { data: permissions = [] } = usePermissionsQuery();
  const { data: serverMatrix = {} } = usePermissionMatrixQuery();
  const { data: roles = [] } = useSystemRolesQuery();

  return useMemo(() => {
    if (!currentRole) return false;

    // Normalisasi role aktif
    const normRole = currentRole.toLowerCase().trim();
    const roleObj = roles.find((r) => r.code?.toLowerCase().trim() === normRole);

    // Ambil list permission IDs yang dicentang / dimiliki oleh role ini
    const assignedPermIds: string[] = [
      ...(serverMatrix[currentRole] || []),
      ...(roleObj ? serverMatrix[String(roleObj.id)] || [] : []),
    ].map(String);

    if (assignedPermIds.length === 0) return false;

    // Normalisasi kode permission yang dicari
    const targetCode = permissionCode.toLowerCase().trim();

    return permissions.some((p) => {
      const pIdStr = String(p.id);
      if (!assignedPermIds.includes(pIdStr)) return false;
      const pCode = (p.code || '').toLowerCase().trim();
      return pCode === targetCode || pCode.includes(targetCode);
    });
  }, [currentRole, permissions, serverMatrix, roles, permissionCode]);
}

// 6. Mutation untuk Tambah / Edit User
export function useSaveUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userData,
      editingId,
    }: {
      userData: Partial<SystemUser & { password?: string }>;
      editingId?: string | null;
    }) => {
      if (editingId) {
        return await apiClient.put(`/system/users/${encodeURIComponent(editingId)}`, userData);
      } else {
        return await apiClient.post('/system/users', userData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.activeUsers });
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.inactiveUsers });
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.roles });
    },
  });
}

// 7. Mutation untuk Soft Delete User (Pindahkan ke User Keluar)
export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      return await apiClient.delete(`/system/users/${encodeURIComponent(userId)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.activeUsers });
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.inactiveUsers });
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.roles });
    },
  });
}

// 8. Mutation untuk Restore User Keluar
export function useRestoreUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      return await apiClient.post(`/system/users/${encodeURIComponent(userId)}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.activeUsers });
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.inactiveUsers });
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.roles });
    },
  });
}

// 9. Mutation untuk Tambah / Edit Role
export function useSaveRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roleData,
      editingId,
    }: {
      roleData: Partial<Role & { permission_ids?: (string | number)[] }>;
      editingId?: string | null;
    }) => {
      if (editingId) {
        return await apiClient.put(`/system/roles/${encodeURIComponent(editingId)}`, roleData);
      } else {
        return await apiClient.post('/system/roles', roleData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.roles });
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.permissionMatrix });
      queryClient.invalidateQueries({ queryKey: ['sidebar-menus'] });
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
}

// 10. Mutation untuk Soft Delete Role
export function useDeleteRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: string) => {
      return await apiClient.delete(`/system/roles/${encodeURIComponent(roleId)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.roles });
      queryClient.invalidateQueries({ queryKey: ['sidebar-menus'] });
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
}

// 11. Mutation untuk Simpan Matriks Hak Akses Role
export function useUpdateRolePermissionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roleId,
      permissionIds,
    }: {
      roleId: string;
      permissionIds: string[];
    }) => {
      return await apiClient.put(`/system/roles/${encodeURIComponent(roleId)}/permissions`, {
        permission_ids: permissionIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.permissionMatrix });
      queryClient.invalidateQueries({ queryKey: ['sidebar-menus'] });
    },
  });
}

// 12. Mutation untuk Tambah / Edit Permission (Data Akses)
export function useSavePermissionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      permissionData,
      editingId,
    }: {
      permissionData: Partial<Permission>;
      editingId?: string | null;
    }) => {
      if (editingId) {
        return await apiClient.put(`/system/permissions/${encodeURIComponent(editingId)}`, permissionData);
      } else {
        return await apiClient.post('/system/permissions', permissionData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.permissions });
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.permissionMatrix });
    },
  });
}

// 13. Mutation untuk Hapus Permission
export function useDeletePermissionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permissionId: string) => {
      return await apiClient.delete(`/system/permissions/${encodeURIComponent(permissionId)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.permissions });
      queryClient.invalidateQueries({ queryKey: USER_MANAGEMENT_QUERY_KEYS.permissionMatrix });
    },
  });
}

