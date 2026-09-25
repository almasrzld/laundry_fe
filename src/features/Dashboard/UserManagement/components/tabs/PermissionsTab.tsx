"use client";

import React, { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Search,
  Edit3,
  Trash2,
  Save,
  Loader2,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import { Permission, Menu } from "@/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, ConfirmVariant } from "@/components/ui/confirm-dialog";
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
  createPermissionFormSchema,
  PermissionFormSchema,
} from "@/schemas/user.schema";
import {
  usePermissionsQuery,
  useSavePermissionMutation,
  useDeletePermissionMutation,
} from "@/hooks/useUserManagementQuery";
import { useMenusQuery } from "@/hooks/useMenuQuery";

export const PermissionsTab: React.FC = () => {
  const { data: permissions = [], isLoading: isLoadingPermissions } =
    usePermissionsQuery();
  const { data: menus = [] } = useMenusQuery();

  const savePermissionMutation = useSavePermissionMutation();
  const deletePermissionMutation = useDeletePermissionMutation();

  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null,
  );

  // Search filter for table
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);

  // Dynamic Validation Schema
  const permissionValidationSchema = useMemo(
    () => createPermissionFormSchema(permissions, editingPermission?.id),
    [permissions, editingPermission],
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<PermissionFormSchema>({
    resolver: zodResolver(permissionValidationSchema) as any,
    mode: "onSubmit",
    defaultValues: {
      parent_menu: "",
      code: "",
      name: "",
    },
  });

  const currentCode = watch("code");
  const currentName = watch("name");

  // Ambil opsi parent menu murni dari daftar root menu yang terdaftar di Menu List
  const parentOptions = useMemo(() => {
    const list = new Set<string>();
    menus
      .filter((m) => !m.parent_id)
      .forEach((m) => {
        if (m.title && m.title.trim()) list.add(m.title.trim());
      });
    return Array.from(list);
  }, [menus]);

  // Quick CRUD Action Helper
  const applyCrudSuffix = (action: string, defaultName: string) => {
    let base = currentCode.trim();
    // If base already contains a dot-action, strip the trailing segment
    const lastDot = base.lastIndexOf(".");
    if (lastDot > 0) {
      base = base.substring(0, lastDot);
    }
    if (!base) {
      const selectedParent = control._formValues.parent_menu;
      base = selectedParent
        ? selectedParent
            .trim()
            .toLowerCase()
            .replace(/[^a-zA-Z0-9]/g, "-")
        : "";
    }
    const newCode = base ? `${base}.${action}` : action;
    setValue("code", newCode, { shouldValidate: true });
    if (!currentName || currentName.trim() === "") {
      setValue("name", defaultName, { shouldValidate: true });
    }
  };

  // Form Submit Handler
  const onSubmitPermission = async (data: PermissionFormSchema) => {
    const payload: Partial<Permission> = {
      module: data.parent_menu.trim(),
      code: data.code.trim(),
      name: data.name.trim(),
    };

    try {
      await savePermissionMutation.mutateAsync({
        permissionData: payload,
        editingId: editingPermission?.id,
      });

      toast.success(
        editingPermission
          ? `Data akses "${data.code}" berhasil diperbarui!`
          : `Data akses "${data.code}" berhasil ditambahkan!`,
      );
      setEditingPermission(null);
      reset({
        parent_menu: "",
        code: "",
        name: "",
      });
    } catch (err: any) {
      const errMsg = err.message || "Gagal menyimpan data akses";
      const lower = errMsg.toLowerCase();
      if (
        lower.includes("kode") ||
        lower.includes("akses") ||
        lower.includes("code")
      ) {
        setError("code", { message: errMsg });
      } else if (lower.includes("parent") || lower.includes("menu")) {
        setError("parent_menu", { message: errMsg });
      } else if (lower.includes("deskripsi") || lower.includes("name")) {
        setError("name", { message: errMsg });
      }
      toast.error(errMsg);
    }
  };

  const handleEditPermission = (p: Permission) => {
    setEditingPermission(p);
    reset({
      parent_menu: p.module || "",
      code: p.code || "",
      name: p.name || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingPermission(null);
    reset({
      parent_menu: "",
      code: "",
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

  const handleTriggerDeletePermission = (p: Permission) => {
    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Data Akses",
      description: `Apakah Anda yakin ingin menghapus data akses "${p.name}" (${p.code})? Hak akses ini akan dinonaktifkan dari seluruh role.`,
      variant: "delete",
      confirmText: "Ya, Hapus Akses",
      onConfirm: async () => {
        try {
          await deletePermissionMutation.mutateAsync(p.id);
          toast.success(`Data akses "${p.code}" berhasil dihapus.`);
        } catch (err: any) {
          toast.error(err.message || "Gagal menghapus data akses");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Filter permissions based on live search
  const filteredPermissions = useMemo(() => {
    if (!debouncedSearch.trim()) return permissions;
    const q = debouncedSearch.toLowerCase().trim();
    return permissions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.module && p.module.toLowerCase().includes(q)),
    );
  }, [permissions, debouncedSearch]);

  // Table Columns Definition matching screenshot & prompt specs
  const permissionColumns = useMemo<ColumnDef<Permission>[]>(
    () => [
      {
        accessorKey: "module",
        header: "Nama Parent",
        cell: ({ row }) => (
          <span className="font-bold text-slate-900 text-xs">
            {row.original.module || "-"}
          </span>
        ),
      },
      {
        accessorKey: "code",
        header: "Nama",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-sky-800 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100 font-semibold">
            {row.original.code}
          </span>
        ),
      },
      {
        id: "group",
        header: "Group",
        cell: ({ row }) => {
          const code = row.original.code || "";
          const firstDot = code.indexOf(".");
          const group =
            firstDot > 0
              ? code.substring(0, firstDot)
              : row.original.module || "-";
          return (
            <span className="font-mono text-xs text-slate-700 font-medium">
              {group}
            </span>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Deskripsi",
        cell: ({ row }) => (
          <span className="text-slate-700 text-xs font-medium">
            {row.original.name}
          </span>
        ),
      },
      {
        id: "guard",
        header: "Guard",
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {(row.original as any).guard_name ||
              (row.original as any).guard ||
              "web"}
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
                title="Edit Data Akses"
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleTriggerDeletePermission(p)}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Hapus Data Akses"
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [],
  );

  return (
    <div className="space-y-4 pt-2">
      {/* 1. Form Input: List Data Akses (Top Section) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
              <KeyRound size={13} />
            </div>
            <h3 className="font-bold text-slate-800 text-xs">
              {editingPermission ? "Edit Data Akses" : "List Data Akses"}
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

        <form
          onSubmit={handleSubmit(onSubmitPermission)}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-start">
            {/* Parent Menu */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Parent Menu <span className="text-rose-500">*</span>
              </label>
              <Controller
                control={control}
                name="parent_menu"
                render={({ field }) => (
                  <Select
                    key={field.value || "empty"}
                    value={field.value || "placeholder"}
                    onValueChange={(val) =>
                      field.onChange(val === "placeholder" ? "" : val)
                    }
                  >
                    <SelectTrigger
                      clearable={Boolean(field.value && field.value !== "placeholder")}
                      onClear={() => field.onChange("")}
                      className={cn(
                        "w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-800 h-[34px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-none",
                        errors.parent_menu
                          ? "border-rose-400 bg-rose-50/30"
                          : "border-slate-300",
                      )}
                    >
                      <SelectValue
                        placeholder={
                          parentOptions.length === 0
                            ? "Tidak ada pilihan data"
                            : "Pilih Parent"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder" disabled>
                        Pilih Parent
                      </SelectItem>
                      {parentOptions.length === 0 ? (
                        <div className="py-2.5 px-3 text-center text-xs text-slate-400 italic select-none">
                          Tidak ada pilihan data
                        </div>
                      ) : (
                        parentOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.parent_menu && (
                <p className="text-[10px] text-rose-500 font-medium mt-1">
                  {errors.parent_menu.message}
                </p>
              )}
            </div>

            {/* Nama Akses */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Nama Akses <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register("code")}
                placeholder="users.index"
                className={cn(
                  "w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                  errors.code
                    ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                    : "border-slate-300 focus:border-blue-500",
                )}
              />
              {errors.code && (
                <p className="text-[10px] text-rose-500 font-medium mt-1">
                  {errors.code.message}
                </p>
              )}
            </div>

            {/* Deskripsi Akses */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Deskripsi Akses <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register("name")}
                placeholder="Deskripsi Akses"
                className={cn(
                  "w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                  errors.name
                    ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                    : "border-slate-300 focus:border-blue-500",
                )}
              />
              {errors.name && (
                <p className="text-[10px] text-rose-500 font-medium mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Tombol Simpan */}
            <div className="pt-5 flex items-center gap-2">
              <Button
                type="submit"
                disabled={savePermissionMutation.isPending}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed h-[34px] w-full sm:w-auto"
              >
                {savePermissionMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>
                      {editingPermission ? "Simpan Perubahan" : "Simpan"}
                    </span>
                  </>
                )}
              </Button>
              {editingPermission && (
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
          </div>

          {/* Quick CRUD Shortcut Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-slate-500">
            <span className="flex items-center gap-1 font-semibold text-slate-600">
              <Sparkles size={12} className="text-amber-500" />
              Shortcut CRUD:
            </span>
            <button
              type="button"
              onClick={() => applyCrudSuffix("index", "View")}
              className="px-2 py-0.5 bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-800 rounded font-mono text-[10px] border border-slate-200 transition-colors cursor-pointer"
            >
              +.index (View)
            </button>
            <button
              type="button"
              onClick={() => applyCrudSuffix("create", "Tambah")}
              className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded font-mono text-[10px] border border-slate-200 transition-colors cursor-pointer"
            >
              +.create (Tambah)
            </button>
            <button
              type="button"
              onClick={() => applyCrudSuffix("edit", "Edit")}
              className="px-2 py-0.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 rounded font-mono text-[10px] border border-slate-200 transition-colors cursor-pointer"
            >
              +.edit (Edit)
            </button>
            <button
              type="button"
              onClick={() => applyCrudSuffix("delete", "Hapus")}
              className="px-2 py-0.5 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800 rounded font-mono text-[10px] border border-slate-200 transition-colors cursor-pointer"
            >
              +.delete (Hapus)
            </button>
          </div>
        </form>
      </div>

      {/* 2. Live Search & DataTable */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari parent, nama akses, atau deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* TanStack DataTable */}
        <DataTable
          columns={permissionColumns}
          data={filteredPermissions}
          isLoading={isLoadingPermissions}
          emptyMessage="Tidak ada data akses yang sesuai dengan pencarian."
          pageSize={10}
        />
      </div>

      {/* 3. Confirm Dialog Delete */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        isLoading={deletePermissionMutation.isPending}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
