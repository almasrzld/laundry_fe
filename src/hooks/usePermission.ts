"use client";

import { useMemo, useCallback } from "react";
import { useAuthStore } from "../store/useAuthStore";
import {
  usePermissionsQuery,
  usePermissionMatrixQuery,
  useSystemRolesQuery,
} from "./useUserManagementQuery";

export interface UsePermissionReturn {
  can: (permission: string) => boolean;

  cannot: (permission: string) => boolean;

  canAny: (permissions: string[]) => boolean;

  canAll: (permissions: string[]) => boolean;

  /**
   * Apakah user saat ini adalah Super Admin (bypass semua permission)
   */
  isSuperAdmin: boolean;

  /**
   * Role aktif saat ini
   */
  currentRole: string;

  /**
   * Daftar semua kode permission yang dimiliki oleh role aktif
   */
  userPermissions: string[];

  /**
   * Loading status query permission & matrix dari database
   */
  isLoading: boolean;
}

export function usePermission(): UsePermissionReturn {
  const { currentRole } = useAuthStore();
  const { data: permissions = [], isLoading: isLoadingPerms } =
    usePermissionsQuery();
  const { data: serverMatrix = {}, isLoading: isLoadingMatrix } =
    usePermissionMatrixQuery();
  const { data: roles = [], isLoading: isLoadingRoles } = useSystemRolesQuery();

  const isLoading = isLoadingPerms || isLoadingMatrix || isLoadingRoles;

  const normalizedRole = (currentRole || "").toLowerCase().trim();
  const isSuperAdmin =
    normalizedRole === "superadmin" || normalizedRole === "admin";

  // Kumpulan permission codes yang dimiliki oleh role aktif saat ini (murni dari database matrix)
  const userPermissions = useMemo<string[]>(() => {
    if (!currentRole) return [];

    const roleObj = roles.find(
      (r) =>
        r.code?.toLowerCase().trim() === normalizedRole ||
        r.name?.toLowerCase().trim() === normalizedRole,
    );

    const assignedPermIds = new Set<string>(
      [
        ...(serverMatrix[currentRole] || []),
        ...(roleObj ? serverMatrix[String(roleObj.id)] || [] : []),
        ...(roleObj && roleObj.code ? serverMatrix[roleObj.code] || [] : []),
      ].map(String),
    );

    if (assignedPermIds.size === 0) return [];

    const codes: string[] = [];
    for (const p of permissions) {
      const pIdStr = String(p.id);
      if (assignedPermIds.has(pIdStr)) {
        if (p.code) codes.push(p.code.toLowerCase().trim());
      }
    }
    return codes;
  }, [currentRole, permissions, roles, serverMatrix, normalizedRole]);

  const can = useCallback(
    (permission: string): boolean => {
      if (!permission) return true;
      if (!currentRole) return false;

      const target = permission.toLowerCase().trim();
      return userPermissions.includes(target) || userPermissions.includes("*");
    },
    [currentRole, userPermissions],
  );

  const cannot = useCallback(
    (permission: string): boolean => {
      return !can(permission);
    },
    [can],
  );

  const canAny = useCallback(
    (perms: string[]): boolean => {
      if (!perms || perms.length === 0) return true;
      return perms.some((p) => can(p));
    },
    [can],
  );

  const canAll = useCallback(
    (perms: string[]): boolean => {
      if (!perms || perms.length === 0) return true;
      return perms.every((p) => can(p));
    },
    [can],
  );

  return {
    can,
    cannot,
    canAny,
    canAll,
    isSuperAdmin,
    currentRole,
    userPermissions,
    isLoading,
  };
}
