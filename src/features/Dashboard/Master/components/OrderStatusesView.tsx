"use client";

import React, { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Search, Edit3, Trash2, Save, Loader2, Activity } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import { OrderStatusItem } from "@/types";
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
  useOrderStatusesQuery,
  useSaveOrderStatusMutation,
  useDeleteOrderStatusMutation,
} from "@/hooks/useMasterQuery";

const statusSchema = z.object({
  name: z.string().min(1, "Nama status wajib diisi"),
  code: z.string().min(1, "Kode status wajib diisi"),
  step_order: z.coerce.number().min(1, "Urutan minimal 1"),
  color_hex: z.string().default("#0284c7"),
  badge_variant: z.string().default("info"),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type StatusFormData = z.infer<typeof statusSchema>;

const THEME_COLORS: Record<string, string> = {
  info: "#0284c7",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  primary: "#2563eb",
  default: "#64748b",
};

export const OrderStatusesView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: statuses = [], isLoading } = useOrderStatusesQuery();
  const saveMutation = useSaveOrderStatusMutation();
  const deleteMutation = useDeleteOrderStatusMutation();

  const [editingItem, setEditingItem] = useState<OrderStatusItem | null>(null);

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
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<StatusFormData>({
    resolver: zodResolver(statusSchema) as any,
    defaultValues: {
      name: "",
      code: "",
      step_order: "" as any,
      color_hex: "#0284c7",
      badge_variant: "info",
      description: "",
      is_active: true,
    },
  });

  const handleEdit = (item: OrderStatusItem) => {
    setEditingItem(item);
    reset({
      name: item.name,
      code: item.code,
      step_order: item.step_order || 1,
      color_hex: item.color_hex || "#0284c7",
      badge_variant: item.badge_variant || "info",
      description: item.description || "",
      is_active: Boolean(item.is_active),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    reset({
      name: "",
      code: "",
      step_order: 1,
      color_hex: "#0284c7",
      badge_variant: "info",
      description: "",
      is_active: true,
    });
  };

  const onSubmit = async (data: StatusFormData) => {
    try {
      await saveMutation.mutateAsync({
        data: {
          name: data.name.trim(),
          code: data.code.trim(),
          step_order: Number(data.step_order) || 1,
          color_hex: data.color_hex || "#0284c7",
          badge_variant: data.badge_variant || "info",
          description: data.description?.trim() || null,
          is_active: Boolean(data.is_active),
        },
        editingId: editingItem?.id,
      });

      toast.success(
        editingItem
          ? `Status "${data.name}" berhasil diperbarui!`
          : `Status baru "${data.name}" berhasil ditambahkan!`,
      );
      handleCancelEdit();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data status");
    }
  };

  const handleTriggerDelete = (item: OrderStatusItem) => {
    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Status Cucian",
      description: `Apakah Anda yakin ingin menghapus master status "${item.name}" (${item.code})?`,
      variant: "delete",
      confirmText: "Ya, Hapus Status",
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(item.id);
          toast.success(`Status "${item.name}" berhasil dihapus.`);
        } catch (err: any) {
          toast.error(err.message || "Gagal menghapus status");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Filtered dataset
  const filteredStatuses = useMemo(() => {
    return statuses
      .filter((st) => {
        const q = debouncedSearch.trim().toLowerCase();
        const matchSearch =
          !q ||
          st.name.toLowerCase().includes(q) ||
          st.code.toLowerCase().includes(q) ||
          (st.description && st.description.toLowerCase().includes(q));

        const matchStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && Boolean(st.is_active)) ||
          (statusFilter === "inactive" && !Boolean(st.is_active));

        return matchSearch && matchStatus;
      })
      .sort((a, b) => (Number(a.step_order) || 0) - (Number(b.step_order) || 0));
  }, [statuses, debouncedSearch, statusFilter]);

  const columns = useMemo<ColumnDef<OrderStatusItem>[]>(
    () => [
      {
        accessorKey: "step_order",
        header: "Urutan",
        cell: ({ row }) => (
          <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
            {row.original.step_order}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Tahapan / Status",
        cell: ({ row }) => (
          <div>
            <div className="font-bold text-slate-900">
              {row.original.name}
            </div>
            <div className="text-[11px] text-slate-500 line-clamp-1">
              {row.original.description || "-"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "code",
        header: "Kode Slug",
        cell: ({ row }) => (
          <span className="text-xs font-mono font-bold text-slate-700">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: "badge_variant",
        header: "Badge",
        cell: ({ row }) => (
          <Badge
            variant={(row.original.badge_variant as any) || "info"}
            customColor={row.original.color_hex}
          >
            {row.original.name}
          </Badge>
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
          const st = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleEdit(st)}
                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Status"
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleTriggerDelete(st)}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Hapus Status"
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
            <span>Master Status Cucian</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Master Status Cucian
          </h1>
        </div>
      </div>

      {/* 2. Main Card Wrapper (Satu Card Utama dengan Form dan Tabel) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5 shadow-sm">
        {/* Form Status Input Inline */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 text-xs">
            <h2 className="text-sm font-bold text-slate-900">
              {editingItem ? (
                <span>
                  Mode Edit:{" "}
                  <strong className="text-blue-600">{editingItem.name}</strong>{" "}
                  <span className="text-slate-500 font-mono text-[11px]">
                    ({editingItem.code})
                  </span>
                </span>
              ) : (
                "Tambah Master Status Baru"
              )}
            </h2>
            {editingItem && (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-start">
              {/* 1. Nama Status */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Nama Status <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("name")}
                  placeholder="Nama Status"
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

              {/* 2. Kode Status */}
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

              {/* 3. Urutan Alur */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Urutan Alur
                </label>
                <input
                  type="number"
                  min="1"
                  {...register("step_order")}
                  placeholder="0"
                  className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* 4. Warna & Hex */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Warna Label
                </label>
                <Controller
                  control={control}
                  name="color_hex"
                  render={({ field }) => {
                    const rawVal = field.value || "#0284c7";
                    const validHex = /^#[0-9A-Fa-f]{6}$/.test(rawVal)
                      ? rawVal
                      : "#0284c7";

                    return (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={validHex}
                          onChange={(e) => {
                            const newColor = e.target.value;
                            field.onChange(newColor);
                            const matchedTheme = Object.entries(THEME_COLORS).find(
                              ([_, hex]) =>
                                hex.toLowerCase() === newColor.toLowerCase(),
                            );
                            setValue(
                              "badge_variant",
                              matchedTheme ? (matchedTheme[0] as any) : "custom",
                              { shouldDirty: true },
                            );
                          }}
                          className="w-[34px] h-[34px] rounded-md border border-slate-300 cursor-pointer bg-white p-0.5 shrink-0"
                          title="Pilih warna kustom"
                        />
                        <input
                          type="text"
                          value={field.value || ""}
                          onChange={(e) => {
                            const newText = e.target.value;
                            field.onChange(newText);
                            if (/^#[0-9A-Fa-f]{6}$/.test(newText)) {
                              const matchedTheme = Object.entries(THEME_COLORS).find(
                                ([_, hex]) =>
                                  hex.toLowerCase() === newText.toLowerCase(),
                              );
                              setValue(
                                "badge_variant",
                                matchedTheme ? (matchedTheme[0] as any) : "custom",
                                { shouldDirty: true },
                              );
                            }
                          }}
                          placeholder="#0284c7"
                          className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-2 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    );
                  }}
                />
              </div>

              {/* 5. Badge Theme Variant */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Badge Theme
                </label>
                <Controller
                  control={control}
                  name="badge_variant"
                  render={({ field }) => (
                    <Select
                      key={field.value || "empty"}
                      value={field.value || "info"}
                      onValueChange={(val) => {
                        field.onChange(val);
                        if (THEME_COLORS[val]) {
                          setValue("color_hex", THEME_COLORS[val], {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }
                      }}
                    >
                      <SelectTrigger
                        clearable={Boolean(field.value)}
                        onClear={() => {
                          field.onChange("info");
                          setValue("color_hex", THEME_COLORS.info, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                        className="w-full bg-white border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 h-[34px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-none"
                      >
                        <SelectValue placeholder="Pilih Tema" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info (Sky Blue)</SelectItem>
                        <SelectItem value="success">
                          Success (Emerald Green)
                        </SelectItem>
                        <SelectItem value="warning">
                          Warning (Amber Yellow)
                        </SelectItem>
                        <SelectItem value="danger">
                          Danger (Rose Red)
                        </SelectItem>
                        <SelectItem value="purple">
                          Purple (Ungu Mewah)
                        </SelectItem>
                        <SelectItem value="primary">
                          Primary (Biru Utama)
                        </SelectItem>
                        <SelectItem value="default">Default (Slate)</SelectItem>
                        <SelectItem value="custom">
                          Kustom (Sesuai Warna Hex)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* 6. Status Aktif */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Status
                </label>
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <Select
                      key={
                        field.value !== undefined
                          ? field.value
                            ? "1"
                            : "0"
                          : "empty"
                      }
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

            {/* Baris Deskripsi Tahapan */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Deskripsi Tahapan SOP
              </label>
              <input
                type="text"
                {...register("description")}
                placeholder="Deskripsi Tahapan SOP"
                className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Tombol Simpan & Batal */}
            <div className="pt-1 flex items-center gap-2">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 h-[34px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>{editingItem ? "Simpan Perubahan" : "Simpan"}</span>
                  </>
                )}
              </Button>
              {editingItem && (
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
              placeholder="Cari nama status, kode slug..."
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
          data={filteredStatuses}
          isLoading={isLoading}
          emptyMessage="Tidak ada data master status cucian yang ditemukan."
          pageSize={10}
          defaultSorting={[{ id: "step_order", desc: false }]}
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
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
