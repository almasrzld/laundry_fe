"use client";

import React, { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Search, Edit3, Trash2, Save, Loader2 } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import { IconItem } from "@/types";
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
  useIconsQuery,
  useSaveIconMutation,
  useDeleteIconMutation,
} from "@/hooks/useIconQuery";
import { iconFormSchema, IconFormSchema } from "@/schemas/icon.schema";

export const IconsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: icons = [], isLoading } = useIconsQuery();
  const saveIconMutation = useSaveIconMutation();
  const deleteIconMutation = useDeleteIconMutation();

  const [editingIcon, setEditingIcon] = useState<IconItem | null>(null);

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
    setValue,
    watch,
    formState: { errors },
  } = useForm<IconFormSchema>({
    resolver: zodResolver(iconFormSchema) as any,
    defaultValues: {
      name: "",
      code: "",
      category: "",
      description: "",
      is_active: true,
    },
  });

  const watchCode = watch("code");

  // Distinct categories purely from DB data
  const dynamicCategories = useMemo(() => {
    const set = new Set<string>();
    icons.forEach((i) => {
      if (i.category && i.category.trim()) set.add(i.category.trim());
    });
    return Array.from(set);
  }, [icons]);

  const handleEditIcon = (icon: IconItem) => {
    setEditingIcon(icon);
    reset({
      name: icon.name,
      code: icon.code,
      category: icon.category || "",
      description: icon.description || "",
      is_active: Boolean(icon.is_active),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingIcon(null);
    reset({
      name: "",
      code: "",
      category: "",
      description: "",
      is_active: true,
    });
  };

  const onSubmit = async (data: IconFormSchema) => {
    try {
      await saveIconMutation.mutateAsync({
        iconData: {
          name: data.name.trim(),
          code: data.code.trim(),
          category: data.category.trim(),
          description: data.description?.trim() || null,
          is_active: Boolean(data.is_active),
        },
        editingId: editingIcon ? editingIcon.id : null,
      });

      toast.success(
        editingIcon
          ? `Ikon "${data.name}" berhasil diperbarui!`
          : `Ikon "${data.name}" berhasil ditambahkan!`,
      );
      handleCancelEdit();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan master ikon");
    }
  };

  const handleTriggerDelete = (icon: IconItem) => {
    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Ikon",
      description: `Apakah Anda yakin ingin menghapus master ikon "${icon.name}" (${icon.code})? Ikon ini tidak akan dapat dipilih lagi pada form layanan.`,
      variant: "delete",
      confirmText: "Ya, Hapus Ikon",
      onConfirm: async () => {
        try {
          await deleteIconMutation.mutateAsync(icon.id);
          toast.success(`Ikon "${icon.name}" berhasil dihapus.`);
        } catch (err: any) {
          toast.error(err.message || "Gagal menghapus ikon");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Filtered Icons
  const filteredIcons = useMemo(() => {
    return icons.filter((item) => {
      const matchesCategory =
        categoryFilter === "all" ||
        item.category?.toLowerCase() === categoryFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && Boolean(item.is_active)) ||
        (statusFilter === "inactive" && !item.is_active);

      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [icons, categoryFilter, statusFilter, debouncedSearch]);

  // TanStack Table Columns Definition
  const columns = useMemo<ColumnDef<IconItem>[]>(
    () => [
      {
        id: "preview",
        header: "Visual Ikon",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shadow-2xs shrink-0 transition-transform hover:scale-110">
              <DynamicIcon name={row.original.code} size={18} />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-xs block">
                {row.original.name}
              </span>
              <span className="font-mono text-[11px] text-sky-700 font-semibold">
                {row.original.code}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Kategori",
        cell: ({ row }) => (
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-medium text-xs">
            {row.original.category || "Umum"}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: "Deskripsi",
        cell: ({ row }) => (
          <span className="text-slate-600 text-xs line-clamp-2 max-w-sm">
            {row.original.description || "-"}
          </span>
        ),
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => {
          const isActive = Boolean(row.original.is_active);
          return (
            <Badge variant={isActive ? "success" : "neutral"}>
              {isActive ? "Aktif" : "Nonaktif"}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const icon = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleEditIcon(icon)}
                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Ikon"
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleTriggerDelete(icon)}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Hapus Ikon"
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
            <span>Master Ikon Layanan</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Master Ikon Layanan
          </h1>
        </div>
      </div>

      {/* 2. Main Card Wrapper (Satu Card Utama dengan Form dan Tabel) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5 shadow-sm">
        {/* Form Ikon Input Inline */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 text-xs">
            <h2 className="text-sm font-bold text-slate-900">
              {editingIcon ? (
                <span>
                  Mode Edit:{" "}
                  <strong className="text-blue-600">{editingIcon.name}</strong>{" "}
                  <span className="text-slate-500 font-mono text-[11px]">
                    ({editingIcon.code})
                  </span>
                </span>
              ) : (
                "Tambah Master Ikon Baru"
              )}
            </h2>
            {editingIcon && (
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
              {/* 1. Nama Ikon */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Nama Ikon <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("name")}
                  placeholder="Nama Ikon"
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

              {/* 2. Kode Ikon Lucide + Preview Box */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Kode Ikon Lucide <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="w-[34px] h-[34px] rounded-md bg-white border border-slate-300 text-sky-700 flex items-center justify-center shrink-0">
                    <DynamicIcon name={watchCode} size={16} />
                  </div>
                  <input
                    type="text"
                    {...register("code")}
                    placeholder="Kode Lucide"
                    className={cn(
                      "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors font-mono",
                      errors.code
                        ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                        : "border-slate-300 focus:border-blue-500",
                    )}
                  />
                </div>
                {errors.code && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.code.message}
                  </p>
                )}
              </div>

              {/* 3. Kategori */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Kategori <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="category-suggestions"
                  {...register("category")}
                  placeholder="Kategori"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                    errors.category
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                <datalist id="category-suggestions">
                  {dynamicCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                {errors.category && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.category.message}
                  </p>
                )}
              </div>

              {/* 4. Deskripsi */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Deskripsi
                </label>
                <input
                  type="text"
                  {...register("description")}
                  placeholder="Keterangan singkat..."
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
                disabled={saveIconMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 h-[34px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {saveIconMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>{editingIcon ? "Simpan Perubahan" : "Simpan"}</span>
                  </>
                )}
              </Button>
              {editingIcon && (
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
              placeholder="Cari nama, kode Lucide, kategori..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600 font-bold">
                Kategori:
              </span>
              <Select
                key={categoryFilter}
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger
                  clearable={categoryFilter !== "all"}
                  onClear={() => setCategoryFilter("all")}
                  className="w-[140px] h-8 rounded-lg bg-slate-50 border-slate-200 text-xs font-semibold text-slate-800"
                >
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {dynamicCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

        {/* TanStack Table */}
        <DataTable
          columns={columns}
          data={filteredIcons}
          isLoading={isLoading}
          emptyMessage="Tidak ada master ikon yang sesuai dengan filter atau pencarian."
          pageSize={10}
        />
      </div>

      {/* Universal Confirm Dialog for Delete */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        isLoading={deleteIconMutation.isPending}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
