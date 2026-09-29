"use client";

import React, { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  Search,
  Edit3,
  Trash2,
  Save,
  Loader2,
  Smartphone,
  CheckSquare,
  Square,
  RotateCcw,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import { Role, Permission } from "@/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useSystemRolesQuery,
  usePermissionsQuery,
  usePermissionMatrixQuery,
  useUpdateRolePermissionsMutation,
  useSavePermissionMutation,
  useDeletePermissionMutation,
} from "@/hooks/useUserManagementQuery";

export const MobilePermissionsTab: React.FC = () => {
  const { data: roles = [], isLoading: isLoadingRoles } = useSystemRolesQuery();
  const { data: permissions = [], isLoading: isLoadingPermissions } =
    usePermissionsQuery();
  const { data: serverMatrix = {}, isLoading: isLoadingMatrix } =
    usePermissionMatrixQuery();

  const updatePermissionsMutation = useUpdateRolePermissionsMutation();
  const savePermissionMutation = useSavePermissionMutation();
  const deletePermissionMutation = useDeletePermissionMutation();

  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);

  // Form input state for adding/editing mobile permissions
  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null,
  );
  const [formCode, setFormCode] = useState("mobile.");
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [permissionToDelete, setPermissionToDelete] =
    useState<Permission | null>(null);

  // Filter mobile permissions dynamically from API
  const mobilePermissions = useMemo(() => {
    return permissions.filter(
      (p) =>
        (p.module && p.module.toLowerCase() === "mobile app") ||
        (p.code && p.code.toLowerCase().startsWith("mobile.")),
    );
  }, [permissions]);

  // Set default selected role
  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(String(roles[0].id));
    }
  }, [roles, selectedRoleId]);

  const selectedRole = useMemo(() => {
    return (
      roles.find((r) => String(r.id) === selectedRoleId) || roles[0] || null
    );
  }, [roles, selectedRoleId]);

  // Sync selected permissions when selectedRole or serverMatrix changes
  useEffect(() => {
    if (selectedRole) {
      const roleId = String(selectedRole.id);
      const roleCode = selectedRole.code || "";

      const currentPermsFromMatrix = [
        ...(serverMatrix[roleId] || []),
        ...(serverMatrix[roleCode] || []),
      ];

      const uniqueIds = Array.from(new Set(currentPermsFromMatrix.map(String)));
      setSelectedPermIds(uniqueIds);
    }
  }, [selectedRole, serverMatrix]);

  // Check if a permission is selected
  const isPermChecked = (permId: string | number) => {
    return selectedPermIds.includes(String(permId));
  };

  // Toggle single permission
  const handleTogglePerm = (permId: string | number) => {
    const idStr = String(permId);
    setSelectedPermIds((prev) =>
      prev.includes(idStr)
        ? prev.filter((id) => id !== idStr)
        : [...prev, idStr],
    );
  };

  // Select all mobile permissions
  const handleSelectAllMobile = () => {
    const mobileIds = mobilePermissions.map((p) => String(p.id));
    setSelectedPermIds((prev) => Array.from(new Set([...prev, ...mobileIds])));
  };

  // Deselect all mobile permissions
  const handleDeselectAllMobile = () => {
    const mobileIdsSet = new Set(mobilePermissions.map((p) => String(p.id)));
    setSelectedPermIds((prev) => prev.filter((id) => !mobileIdsSet.has(id)));
  };

  // Reset to original matrix
  const handleReset = () => {
    if (selectedRole) {
      const roleId = String(selectedRole.id);
      const roleCode = selectedRole.code || "";
      const currentPermsFromMatrix = [
        ...(serverMatrix[roleId] || []),
        ...(serverMatrix[roleCode] || []),
      ];
      setSelectedPermIds(
        Array.from(new Set(currentPermsFromMatrix.map(String))),
      );
      toast.info("Perubahan hak akses dibatalkan.");
    }
  };

  // Save Role Permissions Matrix
  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      await updatePermissionsMutation.mutateAsync({
        roleId: String(selectedRole.id),
        permissionIds: selectedPermIds,
      });
      toast.success(
        `Hak akses mobile untuk role "${selectedRole.name}" berhasil disimpan!`,
      );
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan hak akses mobile");
    }
  };

  // Edit permission handler
  const handleEditPermission = (perm: Permission) => {
    setEditingPermission(perm);
    setFormCode(perm.code);
    setFormName(perm.name);
    setFormError(null);
  };

  const handleCancelEdit = () => {
    setEditingPermission(null);
    setFormCode("mobile.");
    setFormName("");
    setFormError(null);
  };

  // Form submit handler for creating/editing mobile permission
  const handleSubmitPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) {
      setFormError("Kode hak akses wajib diisi");
      return;
    }
    if (!formName.trim()) {
      setFormError("Deskripsi hak akses wajib diisi");
      return;
    }
    if (!formCode.toLowerCase().startsWith("mobile.")) {
      setFormError("Kode hak akses mobile harus diawali dengan 'mobile.'");
      return;
    }

    try {
      await savePermissionMutation.mutateAsync({
        permissionData: {
          code: formCode.trim().toLowerCase(),
          name: formName.trim(),
          module: "Mobile App",
        },
        editingId: editingPermission?.id,
      });

      toast.success(
        editingPermission
          ? `Hak akses "${formCode}" berhasil diperbarui!`
          : `Hak akses "${formCode}" berhasil ditambahkan!`,
      );
      handleCancelEdit();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data hak akses");
    }
  };

  // Delete permission handler
  const handleDeletePermission = async () => {
    if (!permissionToDelete) return;
    try {
      await deletePermissionMutation.mutateAsync(String(permissionToDelete.id));
      toast.success(`Hak akses "${permissionToDelete.name}" berhasil dihapus`);
      setDeleteConfirmOpen(false);
      setPermissionToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus data hak akses");
    }
  };

  // Filter permissions based on live search
  const filteredPermissions = useMemo(() => {
    if (!debouncedSearch.trim()) return mobilePermissions;
    const q = debouncedSearch.toLowerCase().trim();
    return mobilePermissions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
    );
  }, [mobilePermissions, debouncedSearch]);

  // Standard Table Columns
  const columns = useMemo<ColumnDef<Permission>[]>(
    () => [
      {
        id: "select",
        header: () => <div className="w-10 text-center font-bold">Status</div>,
        cell: ({ row }) => {
          const checked = isPermChecked(row.original.id);
          return (
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => handleTogglePerm(row.original.id)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "code",
        header: "Kode Akses Mobile",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-sky-800 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100 font-semibold">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Nama / Deskripsi Menu",
        cell: ({ row }) => (
          <span className="text-slate-700 text-xs font-medium">
            {row.original.name}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleEditPermission(p)}
                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Hak Akses"
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setPermissionToDelete(p);
                  setDeleteConfirmOpen(true);
                }}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Hapus Hak Akses"
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [selectedPermIds],
  );

  const isLoading = isLoadingRoles || isLoadingPermissions || isLoadingMatrix;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-3">
        <Loader2 className="animate-spin text-sky-600" size={28} />
        <p className="text-xs font-medium">Memuat data hak akses mobile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {/* 1. Form Input Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
              <Smartphone size={13} />
            </div>
            <h3 className="font-bold text-slate-800 text-xs">
              {editingPermission
                ? "Edit Hak Akses Mobile"
                : "Tambah Hak Akses Mobile"}
            </h3>
          </div>
          {editingPermission && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">
                Mode Edit:{" "}
                <strong className="text-blue-600">
                  {editingPermission.code}
                </strong>
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

        <form onSubmit={handleSubmitPermission} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-start">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Kode Akses <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => {
                  setFormCode(e.target.value);
                  setFormError(null);
                }}
                placeholder="mobile.nama-fitur"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 font-mono transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Deskripsi Menu / Fitur <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  setFormError(null);
                }}
                placeholder="Deskripsi Menu / Fitur"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>

            <div className="flex items-end h-full">
              <Button
                type="submit"
                size="sm"
                disabled={savePermissionMutation.isPending}
                className="h-10 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5"
              >
                {savePermissionMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {editingPermission ? "Perbarui" : "Simpan"}
              </Button>
            </div>
          </div>

          {formError && (
            <p className="text-[11px] text-rose-500 font-medium">{formError}</p>
          )}
        </form>
      </div>

      {/* 2. Table Section & Role Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-slate-800">
              Pilih Role:
            </label>
            <div className="w-56">
              <Select
                key={selectedRoleId || "empty"}
                value={selectedRoleId}
                onValueChange={setSelectedRoleId}
              >
                <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white">
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.length === 0 ? (
                    <div className="py-2.5 px-3 text-center text-xs text-slate-400 italic select-none">
                      Tidak ada pilihan data
                    </div>
                  ) : (
                    roles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>
                        {r.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllMobile}
                className="h-10 text-xs rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 font-medium"
              >
                <CheckSquare size={13} /> Pilih Semua
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeselectAllMobile}
                className="h-10 text-xs rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 font-medium"
              >
                <Square size={13} /> Kosongkan
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-10 text-xs rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 font-medium"
              >
                <RotateCcw size={13} /> Reset
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari hak akses mobile..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-400 transition-all"
              />
            </div>

            <Button
              type="button"
              onClick={handleSavePermissions}
              disabled={updatePermissionsMutation.isPending || !selectedRole}
              className="h-10 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              {updatePermissionsMutation.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              Simpan Role
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredPermissions}
          isLoading={isLoadingPermissions}
          emptyMessage="Tidak ada hak akses mobile yang sesuai dengan pencarian."
          pageSize={10}
        />
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Hapus Hak Akses Mobile?"
        description={`Apakah Anda yakin ingin menghapus akses "${permissionToDelete?.name}" (${permissionToDelete?.code})?`}
        variant="delete"
        confirmText="Hapus"
        onConfirm={handleDeletePermission}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setPermissionToDelete(null);
        }}
      />
    </div>
  );
};
