"use client";

import React from "react";
import { usePermission } from "../hooks/usePermission";
import Forbidden from "../app/forbidden";

export interface PermissionRouteGuardProps {
  permission?: string;
  anyOf?: string[];
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export const PermissionRouteGuard: React.FC<PermissionRouteGuardProps> = ({
  permission,
  anyOf,
  children,
  title,
}) => {
  const { can, canAny, isLoading } = usePermission();

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
        Memverifikasi izin akses pengguna...
      </div>
    );
  }

  const isAllowed =
    anyOf && anyOf.length > 0
      ? canAny(anyOf)
      : permission
        ? can(permission)
        : true;

  if (!isAllowed) {
    return <Forbidden title={title} />;
  }

  return <>{children}</>;
};
