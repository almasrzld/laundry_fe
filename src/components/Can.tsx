"use client";

import React from "react";
import { usePermission } from "../hooks/usePermission";

export interface CanProps {
  permission?: string;

  anyOf?: string[];

  /**
   * Semua permission dalam array harus dimiliki (AND logic)
   */
  allOf?: string[];

  not?: string;

  /**
   * Komponen atau elemen fallback yang ditampilkan jika izin ditolak (opsional)
   */
  fallback?: React.ReactNode;

  /**
   * Konten yang diizinkan untuk dirender jika izin terpenuhi
   */
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  permission,
  anyOf,
  allOf,
  not,
  fallback = null,
  children,
}) => {
  const { can, cannot, canAny, canAll } = usePermission();

  // 1. Check NOT condition (@cannot)
  if (not && !cannot(not)) {
    return <>{fallback}</>;
  }

  // 2. Check allOf condition
  if (allOf && allOf.length > 0 && !canAll(allOf)) {
    return <>{fallback}</>;
  }

  // 3. Check anyOf condition (@canany)
  if (anyOf && anyOf.length > 0 && !canAny(anyOf)) {
    return <>{fallback}</>;
  }

  // 4. Check single permission (@can)
  if (permission && !can(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export const PermissionGuard = Can;
