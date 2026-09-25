"use client";

import React, { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Search, Edit3, Trash2, Save, Loader2 } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import { DynamicIcon } from "@/components/DynamicIcon";
import { Menu } from "@/types";
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
import { createMenuFormSchema, MenuFormSchema } from "@/schemas/menu.schema";
import {
  useMenusQuery,
  useRolesQuery,
  useSaveMenuMutation,
  useDeleteMenuMutation,
} from "@/hooks/useMenuQuery";
import { usePermissionsQuery } from "@/hooks/useUserManagementQuery";

export const SidebarManagementTab: React.FC = () => {
  const { data: menus = [], isLoading: isMenusLoading } = useMenusQuery();
  const { data: roles = [] } = useRolesQuery();
  const { data: permissions = [] } = usePermissionsQuery();

  const saveMenuMutation = useSaveMenuMutation();
  const deleteMenuMutation = useDeleteMenuMutation();

  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [isMenuFormOpen] = useState(true);

  // Search filter for table
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);

  const menuValidationSchema = useMemo(
    () => createMenuFormSchema(menus, editingMenu?.id),
    [menus, editingMenu],
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
  } = useForm<MenuFormSchema>({
    resolver: zodResolver(menuValidationSchema) as any,
    mode: "onSubmit",
    defaultValues: {
      key: "",
      title: "",
      icon: "",
      path: "",
      nama_akses: "",
      parent_id: null,
      order_index: 1,
      is_active: 1,
      is_sidebar: 1,
    },
  });

  const parentOptions = menus.filter(
    (m) => !m.parent_id && m.id !== editingMenu?.id,
  );

  const onSubmitMenu = async (formData: MenuFormSchema) => {
    const payload: Partial<Menu> = {
      ...formData,
      key:
        formData.key?.trim() ||
        formData.path?.replace(/^\//, "").replace(/[^a-zA-Z0-9]/g, "_") ||
        "menu",
      icon: formData.icon?.trim() || null,
      nama_akses: formData.nama_akses?.trim() || null,
      parent_id: formData.parent_id || null,
      order_index: editingMenu ? editingMenu.order_index : menus.length + 1,
      is_active: 1,
      is_sidebar: 1,
    };

    const editingId = editingMenu?.id ? String(editingMenu.id) : null;
    const otherMenus = menus.filter((m) => String(m.id) !== editingId);

    let hasCustomError = false;

    // Check Key (if user provided key)
    if (formData.key?.trim()) {
      const dupKey = otherMenus.find(
        (m) =>
          m.key &&
          m.key.trim().toLowerCase() === formData.key!.trim().toLowerCase(),
      );
      if (dupKey) {
        setError("key", { message: "Key sudah digunakan" });
        toast.error("Key sudah digunakan");
        hasCustomError = true;
      }
    }

    // Check Nama Menu / Title
    if (formData.title?.trim()) {
      const dupTitle = otherMenus.find(
        (m) =>
          m.title &&
          m.title.trim().toLowerCase() === formData.title.trim().toLowerCase(),
      );
      if (dupTitle) {
        setError("title", { message: "Nama menu sudah terdaftar" });
        if (!hasCustomError) toast.error("Nama menu sudah terdaftar");
        hasCustomError = true;
      }
    }

    // Check Route / Path (kecuali '#')
    if (formData.path?.trim() && formData.path.trim() !== "#") {
      const dupPath = otherMenus.find(
        (m) =>
          m.path &&
          m.path.trim() !== "#" &&
          m.path.trim().toLowerCase() === formData.path.trim().toLowerCase(),
      );
      if (dupPath) {
        setError("path", { message: "Route sudah digunakan" });
        if (!hasCustomError) toast.error("Route sudah digunakan");
        hasCustomError = true;
      }
    }

    // Check Nama Akses
    if (formData.nama_akses?.trim()) {
      const dupAkses = otherMenus.find(
        (m) =>
          m.nama_akses &&
          m.nama_akses.trim().toLowerCase() ===
            formData.nama_akses!.trim().toLowerCase(),
      );
      if (dupAkses) {
        setError("nama_akses", { message: "Nama akses sudah digunakan" });
        if (!hasCustomError) toast.error("Nama akses sudah digunakan");
        hasCustomError = true;
      }
    }

    if (hasCustomError) return;

    try {
      const rolesToAssign = roles.map((r) => r.code);
      await saveMenuMutation.mutateAsync({
        menuData: payload,
        allowedRoles: rolesToAssign,
        editingId: editingMenu?.id,
      });

      toast.success(
        editingMenu
          ? "Menu berhasil diperbarui"
          : "Menu baru berhasil ditambahkan",
      );
      setEditingMenu(null);
      reset({
        key: "",
        title: "",
        icon: "",
        path: "",
        nama_akses: "",
        parent_id: null,
        order_index: menus.length + 1,
        is_active: 1,
        is_sidebar: 1,
      });
    } catch (err: any) {
      const errMsg = err.message || "Gagal menyimpan menu";
      const lower = errMsg.toLowerCase();
      if (lower.includes("key")) {
        setError("key", { message: errMsg });
      } else if (lower.includes("nama menu") || lower.includes("title")) {
        setError("title", { message: errMsg });
      } else if (lower.includes("route") || lower.includes("path")) {
        setError("path", { message: errMsg });
      } else if (lower.includes("akses")) {
        setError("nama_akses", { message: errMsg });
      }
      toast.error(errMsg);
    }
  };

  const handleEditMenu = (m: Menu) => {
    setEditingMenu(m);
    reset({
      key: m.key || "",
      title: m.title,
      icon: m.icon || "",
      path: m.path,
      nama_akses: m.nama_akses || "",
      parent_id: m.parent_id || null,
      order_index: m.order_index,
      is_active: m.is_active,
      is_sidebar: m.is_sidebar,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingMenu(null);
    reset({
      key: "",
      title: "",
      icon: "",
      path: "",
      nama_akses: "",
      parent_id: null,
      order_index: menus.length + 1,
      is_active: 1,
      is_sidebar: 1,
    });
  };

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

  const handleTriggerDeleteMenu = (m: Menu) => {
    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Menu",
      description: `Apakah Anda yakin ingin menghapus menu "${m.title}" (${m.path}) dari sistem? Menu akan dinonaktifkan dari struktur navigasi.`,
      variant: "delete",
      confirmText: "Ya, Hapus Menu",
      onConfirm: async () => {
        try {
          await deleteMenuMutation.mutateAsync(m.id);
          toast.success(`Menu "${m.title}" berhasil dihapus`);
        } catch (err: any) {
          toast.error(err.message || "Gagal menghapus menu");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const filteredMenus = useMemo(() => {
    if (!debouncedSearch.trim()) return menus;
    const q = debouncedSearch.toLowerCase();
    return menus.filter(
      (m) =>
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.name_menus && m.name_menus.toLowerCase().includes(q)) ||
        (m.path && m.path.toLowerCase().includes(q)) ||
        (m.key && m.key.toLowerCase().includes(q)) ||
        (m.nama_akses && m.nama_akses.toLowerCase().includes(q)),
    );
  }, [menus, debouncedSearch]);

  const menuColumns = useMemo<ColumnDef<Menu>[]>(
    () => [
      {
        accessorKey: "key",
        header: "Key",
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {row.original.key || "-"}
          </span>
        ),
      },
      {
        accessorKey: "title",
        header: "Nama Menu",
        cell: ({ row }) => (
          <span className="font-bold text-slate-900">{row.original.title}</span>
        ),
      },
      {
        accessorKey: "icon",
        header: "Icon",
        cell: ({ row }) => {
          const icon = row.original.icon;
          return icon ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
                <DynamicIcon name={icon} size={15} />
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                {icon}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 text-xs italic">-</span>
          );
        },
      },
      {
        accessorKey: "path",
        header: "Route / Path",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-sky-800 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100 font-semibold">
            {row.original.path}
          </span>
        ),
      },
      {
        accessorKey: "nama_akses",
        header: "Nama Akses",
        cell: ({ row }) => (
          <span className="text-slate-700 text-xs font-medium">
            {row.original.nama_akses || "-"}
          </span>
        ),
      },
      {
        accessorKey: "parent_id",
        header: "Menu Induk",
        cell: ({ row }) => {
          const parent = menus.find((m) => m.id === row.original.parent_id);
          const parentTitle = parent?.title || row.original.parent_title;
          return parentTitle ? (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold">
              {parentTitle}
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium">
              Root
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => handleEditMenu(m)}
                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Menu"
              >
                <Edit3 size={15} />
              </button>
              <button
                onClick={() => handleTriggerDeleteMenu(m)}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Hapus Menu"
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [menus],
  );

  return (
    <div className="space-y-4 pt-2">
      {/* 1. Form Menu Input with React Hook Form */}
      {isMenuFormOpen && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-2xs">
          {editingMenu && (
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 text-xs">
              <span className="font-semibold text-slate-700">
                Mode Edit:{" "}
                <strong className="text-blue-600">{editingMenu.title}</strong>
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
          <form
            onSubmit={handleSubmit(onSubmitMenu)}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Key */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Key
                </label>
                <input
                  type="text"
                  {...register("key")}
                  placeholder="key"
                  className={cn(
                    "w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                    errors.key
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.key && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.key.message}
                  </p>
                )}
              </div>

              {/* Nama Menu */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Nama Menu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("title")}
                  placeholder="Nama Sidebar"
                  className={cn(
                    "w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                    errors.title
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.title && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Icon */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Icon
                </label>
                <input
                  type="text"
                  {...register("icon")}
                  placeholder="LayoutDashboard"
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Route */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Route <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("path")}
                  placeholder="/dashboard"
                  className={cn(
                    "w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                    errors.path
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.path && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.path.message}
                  </p>
                )}
              </div>

              {/* Nama Akses */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Nama Akses
                </label>
                <input
                  type="text"
                  list="permissions-menu-list"
                  {...register("nama_akses")}
                  placeholder="users.index"
                  className={cn(
                    "w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                    errors.nama_akses
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                <datalist id="permissions-menu-list">
                  {permissions.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.name} ({p.module})
                    </option>
                  ))}
                </datalist>
                {errors.nama_akses && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.nama_akses.message}
                  </p>
                )}
              </div>

              {/* Menu Induk */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Menu Induk
                </label>
                <Controller
                  control={control}
                  name="parent_id"
                  render={({ field }) => (
                    <Select
                      key={field.value ? String(field.value) : "empty"}
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(val || null)}
                    >
                      <SelectTrigger
                        clearable={Boolean(field.value)}
                        onClear={() => field.onChange(null)}
                        className="w-full bg-white border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 h-[34px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-none"
                      >
                        <SelectValue placeholder="Pilih Menu Induk" />
                      </SelectTrigger>
                      <SelectContent>
                        {parentOptions.length === 0 ? (
                          <div className="py-2.5 px-3 text-center text-xs text-slate-400 italic select-none">
                            Tidak ada pilihan data
                          </div>
                        ) : (
                          parentOptions.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.title}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Tombol Simpan */}
            <div className="pt-1 flex items-center gap-2">
              <Button
                type="submit"
                disabled={saveMenuMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 h-[34px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {saveMenuMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>{editingMenu ? "Simpan Perubahan" : "Simpan"}</span>
                  </>
                )}
              </Button>
              {editingMenu && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancelEdit}
                  className="px-3 py-2 h-[34px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors cursor-pointer"
                >
                  Batal
                </Button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* 2. Live Search Bar & TanStack Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Cari key, nama menu, atau route..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* TanStack Table: Menu List */}
        <DataTable
          columns={menuColumns}
          data={filteredMenus}
          isLoading={isMenusLoading}
          emptyMessage="Tidak ada menu yang sesuai dengan pencarian."
          pageSize={10}
        />
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        isLoading={deleteMenuMutation.isPending}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
