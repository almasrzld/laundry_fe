"use client";

import React, { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Search, Edit3, Trash2, Save, Loader2, Layers } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import { ServiceCategoryItem } from "@/types";
import { DynamicIcon } from "@/components/DynamicIcon";
import { Badge } from "@/components/Badge";
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
  useServiceCategoriesQuery,
  useSaveServiceCategoryMutation,
  useDeleteServiceCategoryMutation,
} from "@/hooks/useMasterQuery";
import { useIconsQuery } from "@/hooks/useIconQuery";

const categorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi"),
  code: z.string().min(1, "Kode kategori wajib diisi"),
  icon_code: z.string().optional().default(""),
  badge_color: z.string().default("primary"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export const ServiceCategoriesView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: categories = [], isLoading } = useServiceCategoriesQuery();
  const { data: dbIcons = [] } = useIconsQuery();
  const saveCategoryMutation = useSaveServiceCategoryMutation();
  const deleteCategoryMutation = useDeleteServiceCategoryMutation();

  const [editingCategory, setEditingCategory] =
    useState<ServiceCategoryItem | null>(null);

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

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema) as any,
    defaultValues: {
      name: "",
      code: "",
      icon_code: "",
      badge_color: "primary",
      description: "",
      is_active: true,
    },
  });

  const activeIcons = useMemo(() => {
    return dbIcons.filter(
      (ic) => Boolean(ic.is_active) || (editingCategory && editingCategory.icon_code === ic.code),
    );
  }, [dbIcons, editingCategory]);

  const handleEditCategory = (category: ServiceCategoryItem) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      code: category.code,
      icon_code: category.icon_code || "",
      badge_color: category.badge_color || "primary",
      description: category.description || "",
      is_active: Boolean(category.is_active),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    reset({
      name: "",
      code: "",
      icon_code: "",
      badge_color: "primary",
      description: "",
      is_active: true,
    });
  };

  const onSubmit = async (data: CategoryFormData) => {
    try {
      await saveCategoryMutation.mutateAsync({
        data: {
          name: data.name.trim(),
          code: data.code.trim(),
          icon_code: data.icon_code?.trim() || null,
          badge_color: data.badge_color || "primary",
          description: data.description?.trim() || null,
          is_active: Boolean(data.is_active),
        },
        editingId: editingCategory ? editingCategory.id : null,
      });

      toast.success(
        editingCategory
          ? `Kategori "${data.name}" berhasil diperbarui!`
          : `Kategori "${data.name}" berhasil ditambahkan!`,
      );
      handleCancelEdit();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan master kategori layanan");
    }
  };

  const handleTriggerDelete = (category: ServiceCategoryItem) => {
    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Kategori Layanan",
      description: `Apakah Anda yakin ingin menghapus master kategori "${category.name}" (${category.code})?`,
      variant: "delete",
      confirmText: "Ya, Hapus Kategori",
      onConfirm: async () => {
        try {
          await deleteCategoryMutation.mutateAsync(category.id);
          toast.success(`Kategori "${category.name}" berhasil dihapus.`);
        } catch (err: any) {
          toast.error(err.message || "Gagal menghapus kategori");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Filtered dataset
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const q = debouncedSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && Boolean(c.is_active)) ||
        (statusFilter === "inactive" && !Boolean(c.is_active));

      return matchSearch && matchStatus;
    });
  }, [categories, debouncedSearch, statusFilter]);

  const columns = useMemo<ColumnDef<ServiceCategoryItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Kategori Layanan",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs shrink-0">
              <DynamicIcon
                name={row.original.icon_code || "Layers"}
                size={16}
              />
            </div>
            <div>
              <div className="font-bold text-slate-900">
                {row.original.name}
              </div>
              <div className="text-[11px] text-slate-500 line-clamp-1">
                {row.original.description || "-"}
              </div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "code",
        header: "Kode & Badge",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Badge variant="primary">{row.original.code}</Badge>
            <span className="text-[11px] font-mono text-slate-500">
              ({row.original.badge_color || "primary"})
            </span>
          </div>
        ),
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge variant="success">Aktif</Badge>
          ) : (
            <Badge variant="danger">Nonaktif</Badge>
          ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleEditCategory(c)}
                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Kategori"
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleTriggerDelete(c)}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Hapus Kategori"
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
            <span>Master Data</span>
            <span>/</span>
            <span>Master Kategori Layanan</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Master Kategori Layanan
          </h1>
        </div>
      </div>

      {/* 2. Main Card Wrapper (Satu Card Utama dengan Form dan Tabel) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5 shadow-sm">
        {/* Form Kategori Input Inline */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 text-xs">
            <h2 className="text-sm font-bold text-slate-900">
              {editingCategory ? (
                <span>
                  Mode Edit:{" "}
                  <strong className="text-blue-600">
                    {editingCategory.name}
                  </strong>{" "}
                  <span className="text-slate-500 font-mono text-[11px]">
                    ({editingCategory.code})
                  </span>
                </span>
              ) : (
                "Tambah Master Kategori Baru"
              )}
            </h2>
            {editingCategory && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
              >
                Batalkan Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-start">
              {/* 1. Nama Kategori */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Nama Kategori <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("name")}
                  placeholder="Nama Kategori"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
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

              {/* 2. Kode Kategori */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Kode Slug <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("code")}
                  placeholder="Kode Slug"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors font-mono",
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

              {/* 3. Ikon Master Representasi */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Ikon Representasi
                </label>
                <Controller
                  control={control}
                  name="icon_code"
                  render={({ field }) => (
                    <Select
                      key={field.value || "empty"}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        clearable={Boolean(field.value)}
                        onClear={() => field.onChange("")}
                        className="w-full bg-white border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 h-[34px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-none"
                      >
                        <SelectValue
                          placeholder={
                            activeIcons.length === 0
                              ? "Tidak ada pilihan data"
                              : "Pilih Ikon Master"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {activeIcons.length === 0 ? (
                          <div className="py-2.5 px-3 text-center text-xs text-slate-400 italic select-none">
                            Tidak ada pilihan data
                          </div>
                        ) : (
                          activeIcons.map((ic) => (
                            <SelectItem key={ic.id} value={ic.code}>
                              <div className="flex items-center gap-2">
                                <DynamicIcon name={ic.code} size={13} />
                                <span>{ic.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({ic.code})
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* 4. Deskripsi */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Deskripsi
                </label>
                <input
                  type="text"
                  {...register("description")}
                  placeholder="Deskripsi"
                  className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* 5. Status Aktif */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Status
                </label>
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <Select
                      key={field.value !== undefined ? (field.value ? "1" : "0") : "empty"}
                      value={field.value ? "1" : "0"}
                      onValueChange={(val) => field.onChange(val === "1")}
                    >
                      <SelectTrigger
                        clearable={field.value !== undefined}
                        onClear={() => field.onChange(true)}
                        className="w-full bg-white border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 h-[34px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-none"
                      >
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Aktif</SelectItem>
                        <SelectItem value="0">Nonaktif</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Tombol Simpan & Batal */}
            <div className="pt-1 flex items-center gap-2">
              <Button
                type="submit"
                disabled={saveCategoryMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 h-[34px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {saveCategoryMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>
                      {editingCategory ? "Simpan Perubahan" : "Simpan"}
                    </span>
                  </>
                )}
              </Button>
              {editingCategory && (
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

        {/* Filter & Live Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-80">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, kode kategori..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600 font-bold">Status:</span>
              <Select
                key={statusFilter}
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger
                  clearable={statusFilter !== "all"}
                  onClear={() => setStatusFilter("all")}
                  className="w-[120px] h-8 rounded-lg bg-slate-50 border-slate-200 text-xs font-semibold text-slate-800"
                >
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredCategories}
          isLoading={isLoading}
          emptyMessage="Tidak ada data master kategori yang ditemukan."
          pageSize={10}
        />
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText="Batal"
        variant={confirmDialog.variant}
        isLoading={deleteCategoryMutation.isPending}
      />
    </div>
  );
};
