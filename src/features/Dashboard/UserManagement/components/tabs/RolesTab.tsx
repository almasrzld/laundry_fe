"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Edit3,
  Trash2,
  Save,
  Loader2,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  ChevronRight,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import { Role, Permission } from "@/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, ConfirmVariant } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { createRoleFormSchema, RoleFormSchema } from "@/schemas/user.schema";
import {
  useSystemRolesQuery,
  usePermissionsQuery,
  usePermissionMatrixQuery,
  useSaveRoleMutation,
  useDeleteRoleMutation,
  useUpdateRolePermissionsMutation,
} from "@/hooks/useUserManagementQuery";

const formatGroupName = (name: string): string => {
  if (!name) return "";
  return name
    .replace(/[-_]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

export const RolesTab: React.FC = () => {
  const { data: roles = [], isLoading: isLoadingRoles } = useSystemRolesQuery();
  const { data: permissions = [] } = usePermissionsQuery();
  const { data: serverMatrix = {} } = usePermissionMatrixQuery();

  const saveRoleMutation = useSaveRoleMutation();
  const deleteRoleMutation = useDeleteRoleMutation();
  const updatePermissionsMutation = useUpdateRolePermissionsMutation();

  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [activeModuleTab, setActiveModuleTab] = useState<string>("");

  // Search filter for permissions in form
  const [permSearch, setPermSearch] = useState("");
  const [debouncedPermSearch] = useDebounce(permSearch, 200);

  // Search filter for roles table
  const [tableSearch, setTableSearch] = useState("");
  const [debouncedTableSearch] = useDebounce(tableSearch, 300);

  // Validation Schema
  const roleValidationSchema = useMemo(
    () => createRoleFormSchema(roles, editingRole?.id),
    [roles, editingRole],
  );

  const roleForm = useForm<RoleFormSchema>({
    resolver: zodResolver(roleValidationSchema) as any,
    mode: "onSubmit",
    defaultValues: {
      name: "",
    },
  });

  // Extract all distinct modules dynamically from existing permissions
  const modulesList = useMemo(() => {
    const set = new Set<string>();
    permissions.forEach((p) => {
      if (p.module && p.module.trim()) set.add(p.module.trim());
    });
    return Array.from(set);
  }, [permissions]);

  useEffect(() => {
    if (
      modulesList.length > 0 &&
      (!activeModuleTab || !modulesList.includes(activeModuleTab))
    ) {
      setActiveModuleTab(modulesList[0]);
    }
  }, [modulesList, activeModuleTab]);

  // Group permissions by module -> group
  const groupedPermissionsByModule = useMemo(() => {
    const result: Record<string, Record<string, Permission[]>> = {};

    permissions.forEach((p) => {
      const mod = p.module || "General";
      if (!result[mod]) result[mod] = {};

      const code = p.code || "";
      const firstDot = code.indexOf(".");
      const groupName = firstDot > 0 ? code.substring(0, firstDot) : mod;

      if (!result[mod][groupName]) result[mod][groupName] = [];
      result[mod][groupName].push(p);
    });

    return result;
  }, [permissions]);

  // Filtered permission groups for the active module based on search
  const currentModuleGroups = useMemo(() => {
    const groups = groupedPermissionsByModule[activeModuleTab] || {};
    if (!debouncedPermSearch.trim()) return groups;

    const q = debouncedPermSearch.toLowerCase().trim();
    const filtered: Record<string, Permission[]> = {};

    Object.entries(groups).forEach(([grpName, perms]) => {
      const matchGrp =
        grpName.toLowerCase().includes(q) ||
        formatGroupName(grpName).toLowerCase().includes(q);
      const matchedPerms = perms.filter(
        (p) =>
          matchGrp ||
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q),
      );
      if (matchedPerms.length > 0) {
        filtered[grpName] = matchedPerms;
      }
    });

    return filtered;
  }, [groupedPermissionsByModule, activeModuleTab, debouncedPermSearch]);

  // Permission selection helpers
  const togglePermission = (permId: string) => {
    setSelectedPermIds((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId],
    );
  };

  const toggleGroupSelectAll = (permsInGroup: Permission[]) => {
    const groupPermIds = permsInGroup.map((p) => String(p.id));
    const allSelected = groupPermIds.every((id) =>
      selectedPermIds.includes(id),
    );

    if (allSelected) {
      // Unselect all in this group
      setSelectedPermIds((prev) =>
        prev.filter((id) => !groupPermIds.includes(id)),
      );
    } else {
      // Select all in this group
      setSelectedPermIds((prev) =>
        Array.from(new Set([...prev, ...groupPermIds])),
      );
    }
  };

  // Form submit handler
  const onSubmitRole = async (data: RoleFormSchema) => {
    const payload = {
      name: data.name.trim(),
      code:
        editingRole?.code ||
        data.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_"),
      permission_ids: selectedPermIds,
    };

    try {
      await saveRoleMutation.mutateAsync({
        roleData: payload,
        editingId: editingRole?.id,
      });

      toast.success(
        editingRole
          ? `Role "${data.name}" & hak akses berhasil diperbarui!`
          : `Role "${data.name}" & hak akses berhasil disimpan!`,
      );
      setEditingRole(null);
      setSelectedPermIds([]);
      roleForm.reset({
        name: "",
      });
    } catch (err: any) {
      const errMsg = err.message || "Gagal menyimpan data role";
      roleForm.setError("name", { message: errMsg });
      toast.error(errMsg);
    }
  };

  const handleEditRole = (r: Role) => {
    setEditingRole(r);
    roleForm.reset({
      name: r.name,
    });

    // Load role permissions from server matrix
    const existingPerms =
      serverMatrix[String(r.id)] || (r.code ? serverMatrix[r.code] : []) || [];
    setSelectedPermIds(existingPerms.map(String));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setSelectedPermIds([]);
    roleForm.reset({
      name: "",
    });
  };

  // Delete Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: ConfirmVariant;
    confirmText?: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    variant: "delete",
    onConfirm: async () => {},
  });

  const handleTriggerDeleteRole = (r: Role) => {
    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Master Role",
      description: `Apakah Anda yakin ingin menghapus role "${r.name}" (${r.code})? Pengguna dengan role ini akan kehilangan hak akses terkait.`,
      variant: "delete",
      confirmText: "Ya, Hapus Role",
      onConfirm: async () => {
        try {
          await deleteRoleMutation.mutateAsync(r.id);
          toast.success(`Role "${r.name}" berhasil dihapus.`);
        } catch (err: any) {
          toast.error(err.message || "Gagal menghapus role");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Filter roles data for table
  const filteredRoles = useMemo(() => {
    if (!debouncedTableSearch.trim()) return roles;
    const q = debouncedTableSearch.toLowerCase().trim();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q),
    );
  }, [roles, debouncedTableSearch]);

  // Helper to build hierarchical permissions breakdown for a role
  const renderRolePermissions = (role: Role) => {
    const rolePermIds = (
      serverMatrix[String(role.id)] ||
      (role.code ? serverMatrix[role.code] : []) ||
      []
    ).map(String);
    if (rolePermIds.length === 0) {
      return <span className="text-slate-400 text-xs italic font-mono">-</span>;
    }

    const assignedPerms = permissions.filter((p) =>
      rolePermIds.includes(String(p.id)),
    );

    // Group assigned permissions by module -> group
    const hierarchy: Record<string, Record<string, string[]>> = {};
    assignedPerms.forEach((p) => {
      const mod = p.module || "General";
      if (!hierarchy[mod]) hierarchy[mod] = {};

      const code = p.code || "";
      const firstDot = code.indexOf(".");
      const grp = firstDot > 0 ? code.substring(0, firstDot) : mod;

      if (!hierarchy[mod][grp]) hierarchy[mod][grp] = [];
      hierarchy[mod][grp].push(p.name);
    });

    return (
      <div className="space-y-2 py-1 text-xs">
        {Object.entries(hierarchy).map(([modName, grpMap]) => (
          <div key={modName} className="space-y-1">
            <div className="font-bold text-sky-800 flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-600 inline-block" />
              <span>{modName}</span>
            </div>
            <div className="pl-3.5 space-y-0.5 text-[11px] text-slate-700">
              {Object.entries(grpMap).map(([grpName, actionNames]) => (
                <div
                  key={grpName}
                  className="flex items-start gap-1 leading-relaxed"
                >
                  <span className="text-slate-400 font-mono">▸</span>
                  <span className="font-semibold text-slate-900">
                    {formatGroupName(grpName)}
                  </span>
                  <span className="text-slate-500">
                    ({actionNames.join(", ")})
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Table Columns Definition
  const roleColumns = useMemo<ColumnDef<Role>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nama Role",
        cell: ({ row }) => (
          <span className="font-bold text-slate-900 text-xs">
            {row.original.name}
          </span>
        ),
      },
      {
        id: "permissions",
        header: "Permissions",
        cell: ({ row }) => renderRolePermissions(row.original),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleEditRole(r)}
                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Role"
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleTriggerDeleteRole(r)}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Hapus Role"
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [serverMatrix, permissions],
  );

  return (
    <div className="space-y-4 pt-2">
      {/* 1. Top Section: Form List Data Roles */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-xs">
          <h3 className="font-bold text-slate-800 text-xs">
            {editingRole ? "Edit Data Role" : "List Data Roles"}
          </h3>
          {editingRole && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">
                Mode Edit:{" "}
                <strong className="text-blue-600">{editingRole.name}</strong>
              </span>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
              >
                Batalkan Edit
              </button>
            </div>
          )}
        </div>

        <form
          onSubmit={roleForm.handleSubmit(onSubmitRole)}
          className="space-y-4 text-xs"
        >
          {/* Row 1: Nama Role Input Only */}
          <div className="max-w-md">
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Nama Role <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...roleForm.register("name")}
              placeholder="Nama Role"
              className={cn(
                "w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                roleForm.formState.errors.name
                  ? "border-rose-400 bg-rose-50/30"
                  : "border-slate-300 focus:border-blue-500",
              )}
            />
            {roleForm.formState.errors.name && (
              <p className="text-[10px] text-rose-500 font-medium mt-1">
                {roleForm.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Row 2: Access Matrix / Daftar Akses Section */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900">
                  Daftar Hak Akses
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  {selectedPermIds.length} Terpilih
                </span>
              </div>

              {/* Live search input for permissions */}
              <div className="relative w-full sm:w-64">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Cari daftar akses..."
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Horizontal Module Pill Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {modulesList.map((mod) => {
                const permsInMod = permissions.filter((p) => p.module === mod);
                const selectedInMod = permsInMod.filter((p) =>
                  selectedPermIds.includes(String(p.id)),
                ).length;
                const isActive = activeModuleTab === mod;

                return (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => setActiveModuleTab(mod)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                      isActive
                        ? "bg-sky-700 text-white shadow-xs font-bold"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <span>{mod}</span>
                    {selectedInMod > 0 && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-sky-100 text-sky-800",
                        )}
                      >
                        {selectedInMod}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Module Content: Group Cards & Action Checkboxes */}
            <div className="pt-1">
              {Object.keys(currentModuleGroups).length === 0 ? (
                <div className="text-center py-6 bg-white border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                  Tidak ada hak akses yang ditemukan untuk modul ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(currentModuleGroups).map(
                    ([groupName, groupPerms]) => {
                      const groupPermIds = groupPerms.map((p) => String(p.id));
                      const isAllSelected = groupPermIds.every((id) =>
                        selectedPermIds.includes(id),
                      );
                      const isSomeSelected =
                        !isAllSelected &&
                        groupPermIds.some((id) => selectedPermIds.includes(id));

                      return (
                        <div
                          key={groupName}
                          className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2.5 transition-all hover:border-slate-300"
                        >
                          {/* Group Header with Select All toggle */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-800 text-xs tracking-tight">
                              {formatGroupName(groupName)}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleGroupSelectAll(groupPerms)}
                              className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1 cursor-pointer"
                            >
                              {isAllSelected ? (
                                <CheckSquare
                                  size={13}
                                  className="text-sky-600"
                                />
                              ) : (
                                <Square size={13} className="text-slate-400" />
                              )}
                              <span>Pilih Semua</span>
                            </button>
                          </div>

                          {/* Actions Checkbox List */}
                          <div className="space-y-1.5">
                            {groupPerms.map((p) => {
                              const isChecked = selectedPermIds.includes(
                                String(p.id),
                              );
                              return (
                                <label
                                  key={p.id}
                                  className={cn(
                                    "flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition-all",
                                    isChecked
                                      ? "bg-sky-50/70 border-sky-300 text-sky-950 font-semibold"
                                      : "bg-slate-50/50 border-slate-200/80 text-slate-700 hover:bg-slate-100/70",
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() =>
                                      togglePermission(String(p.id))
                                    }
                                    className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                                  />
                                  <span className="flex-1 text-xs">
                                    {p.name}
                                  </span>
                                   <span className="text-[10px] font-mono text-slate-400">
                                     {p.code.includes(".")
                                       ? p.code.substring(p.code.indexOf(".") + 1)
                                       : p.code}
                                   </span>
                                 </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Form Action Button */}
          <div className="pt-1 flex items-center gap-2">
            <Button
              type="submit"
              disabled={saveRoleMutation.isPending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed h-[34px]"
            >
              {saveRoleMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>
                    {editingRole ? "Simpan Perubahan" : "Simpan Role"}
                  </span>
                </>
              )}
            </Button>
            {editingRole && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelEdit}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors cursor-pointer h-[34px]"
              >
                Batal
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* 2. Bottom Section: TanStack DataTable Roles */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari nama role..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <DataTable
          columns={roleColumns}
          data={filteredRoles}
          isLoading={isLoadingRoles}
          emptyMessage="Belum ada master role yang terdaftar."
          pageSize={10}
        />
      </div>

      {/* 3. Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        isLoading={deleteRoleMutation.isPending}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
