"use client";

import React, { useState } from "react";
import { Users, UserX, Key } from "lucide-react";
import { Tabs, TabItem } from "@/components/Tabs";
import {
  useActiveUsersQuery,
  useInactiveUsersQuery,
  useSystemRolesQuery,
} from "@/hooks/useUserManagementQuery";
import { ActiveUsersTab } from "./tabs/ActiveUsersTab";
import { InactiveUsersTab } from "./tabs/InactiveUsersTab";
import { RolesTab } from "./tabs/RolesTab";
import { PermissionsTab } from "./tabs/PermissionsTab";

export type UserManagementTab = "active" | "inactive" | "roles" | "permissions";

export const UserManagementView: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<UserManagementTab>("active");

  const { data: activeUsers = [] } = useActiveUsersQuery();
  const { data: inactiveUsers = [] } = useInactiveUsersQuery();
  const { data: roles = [] } = useSystemRolesQuery();

  const tabs: TabItem<UserManagementTab>[] = [
    {
      id: "active",
      label: "User Aktif",
      icon: <Users size={16} />,
      badge: activeUsers.length,
    },
    {
      id: "inactive",
      label: "User Keluar",
      icon: <UserX size={16} />,
      badge: inactiveUsers.length > 0 ? inactiveUsers.length : undefined,
    },
    {
      id: "roles",
      label: "Role",
      badge: roles.length,
    },
    {
      id: "permissions",
      label: "Akses",
      icon: <Key size={16} />,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
            <span>System Management</span>
            <span>/</span>
            <span>User Management</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Manajemen Pengguna, Role & Hak Akses
          </h1>
        </div>
      </div>

      {/* Tabs Bar & Content Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm">
        <Tabs tabs={tabs} activeTab={currentTab} onChange={setCurrentTab} />

        {currentTab === "active" && <ActiveUsersTab />}
        {currentTab === "inactive" && <InactiveUsersTab />}
        {currentTab === "roles" && <RolesTab />}
        {currentTab === "permissions" && <PermissionsTab />}
      </div>
    </div>
  );
};
