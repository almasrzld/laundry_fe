"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Search, Edit3, Trash2, Save, Loader2, RefreshCw } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import { Promo } from "@/types";
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
import { cn, formatRupiah } from "@/lib/utils";
import {
  usePromosQuery,
  useSavePromoMutation,
  useDeletePromoMutation,
  fetchGeneratedPromoCode,
} from "@/hooks/usePromoQuery";

const promoSchema = z.object({
  title: z.string().min(1, "Judul promo wajib diisi"),
  code: z.string().min(1, "Kode promo wajib diisi"),
  subtitle: z.string().optional(),
  discount_amount: z.coerce
    .number()
    .min(0, "Nominal diskon tidak boleh negatif"),
  min_order_amount: z.coerce
    .number()
    .min(0, "Minimal belanja tidak boleh negatif"),
  icon_code: z.string().optional().default("ticket"),
  is_active: z.boolean().default(true),
});

type PromoFormData = z.infer<typeof promoSchema>;

export const PromosView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isGeneratingCode, setIsGeneratingCode] = useState<boolean>(false);

  const { data: promos = [], isLoading } = usePromosQuery();
  const savePromoMutation = useSavePromoMutation();
  const deletePromoMutation = useDeletePromoMutation();

  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);

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
    setValue,
    control,
    formState: { errors },
  } = useForm<PromoFormData>({
    resolver: zodResolver(promoSchema) as any,
    defaultValues: {
      title: "",
      code: "",
      subtitle: "",
      discount_amount: "" as any,
      min_order_amount: "" as any,
      icon_code: "ticket",
      is_active: true,
    },
  });

  // Fungsi generate kode otomatis tanpa tanda strip (-)
  const handleGenerateCode = useCallback(
    async (random: boolean = false) => {
      setIsGeneratingCode(true);
      try {
        const newCode = await fetchGeneratedPromoCode(random);
        const cleanCode = (newCode || "").replace(/[\s-]/g, "").toUpperCase();
        setValue("code", cleanCode, {
          shouldValidate: true,
          shouldDirty: true,
        });
        if (random) {
          toast.info(`Kode promo baru berhasil diacak: ${cleanCode}`);
        }
      } catch (_) {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let rnd = "";
        for (let i = 0; i < 6; i++) {
          rnd += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const fallbackCode = `PROMO${rnd}`;
        setValue("code", fallbackCode, { shouldValidate: true });
        if (random) {
          toast.info(`Kode promo baru: ${fallbackCode}`);
        }
      } finally {
        setIsGeneratingCode(false);
      }
    },
    [setValue],
  );

  // Inisialisasi kode promo otomatis saat form dalam mode tambah baru
  useEffect(() => {
    if (!editingPromo) {
      handleGenerateCode(false);
    }
  }, [editingPromo, handleGenerateCode]);

  const handleEditPromo = (promo: Promo) => {
    setEditingPromo(promo);
    reset({
      title: promo.title,
      code: (promo.code || "").replace(/[\s-]/g, "").toUpperCase(),
      subtitle: promo.subtitle || "",
      discount_amount: Number(promo.discount_amount) || 0,
      min_order_amount: Number(promo.min_order_amount) || 0,
      icon_code: promo.icon_code || "ticket",
      is_active: Boolean(promo.is_active),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingPromo(null);
    reset({
      title: "",
      code: "",
      subtitle: "",
      discount_amount: "" as any,
      min_order_amount: "" as any,
      icon_code: "ticket",
      is_active: true,
    });
    handleGenerateCode(false);
  };

  const onSubmit = async (data: PromoFormData) => {
    // Sanitasi kode promo: tanpa strip (-) dan huruf kapital
    let codeClean = (data.code || "")
      .trim()
      .replace(/[\s-]/g, "")
      .toUpperCase();

    if (!codeClean) {
      codeClean = await fetchGeneratedPromoCode();
    }

    const otherPromos = promos.filter(
      (p) => String(p.id) !== String(editingPromo?.id),
    );
    const isDup = otherPromos.some(
      (p) => (p.code || "").replace(/[\s-]/g, "").toUpperCase() === codeClean,
    );
    if (isDup) {
      toast.error(`Kode voucher "${codeClean}" sudah digunakan`);
      return;
    }

    try {
      await savePromoMutation.mutateAsync({
        promoData: {
          title: data.title.trim(),
          code: codeClean,
          subtitle: data.subtitle?.trim() || "",
          discount_amount: Number(data.discount_amount) || 0,
          min_order_amount: Number(data.min_order_amount) || 0,
          icon_code: data.icon_code || "ticket",
          is_active: Boolean(data.is_active),
        },
        editingId: editingPromo ? editingPromo.id : null,
      });

      toast.success(
        editingPromo
          ? `Voucher "${codeClean}" berhasil diperbarui!`
          : `Voucher "${codeClean}" berhasil ditambahkan!`,
      );
      handleCancelEdit();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan voucher promo");
    }
  };

  const handleTriggerDelete = (promo: Promo) => {
    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Voucher Promo",
      description: `Apakah Anda yakin ingin menghapus voucher "${promo.title}" (${promo.code})?`,
      variant: "delete",
      confirmText: "Ya, Hapus Voucher",
      onConfirm: async () => {
        try {
          await deletePromoMutation.mutateAsync(promo.id);
          toast.success(`Voucher "${promo.title}" berhasil dihapus.`);
        } catch (err: any) {
          toast.error(err.message || "Gagal menghapus voucher promo");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Filtered dataset
  const filteredPromos = useMemo(() => {
    return promos.filter((p) => {
      const q = debouncedSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && Boolean(p.is_active)) ||
        (statusFilter === "inactive" && !Boolean(p.is_active));

      return matchSearch && matchStatus;
    });
  }, [promos, debouncedSearch, statusFilter]);

  const columns = useMemo<ColumnDef<Promo>[]>(
    () => [
      {
        accessorKey: "code",
        header: "Kode Voucher",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-sky-50 border border-dashed border-sky-300 rounded-lg text-xs font-mono font-bold text-sky-800 tracking-wider">
              {row.original.code}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "title",
        header: "Judul & Keterangan",
        cell: ({ row }) => (
          <div>
            <div className="font-bold text-slate-900">{row.original.title}</div>
            <div className="text-[11px] text-slate-500 line-clamp-1">
              {row.original.subtitle || "-"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "discount_amount",
        header: "Potongan Harga",
        cell: ({ row }) => (
          <span className="font-extrabold text-rose-600">
            - {formatRupiah(row.original.discount_amount)}
          </span>
        ),
      },
      {
        accessorKey: "min_order_amount",
        header: "Min. Belanja",
        cell: ({ row }) => (
          <span className="text-slate-700 font-medium">
            {formatRupiah(row.original.min_order_amount)}
          </span>
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
          const promo = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleEditPromo(promo)}
                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Voucher"
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleTriggerDelete(promo)}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Hapus Voucher"
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
            <span>Marketing</span>
            <span>/</span>
            <span>Master Voucher Promo</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Master Voucher & Promo
          </h1>
        </div>
      </div>

      {/* 2. Main Card Wrapper (Satu Card Utama dengan Form dan Tabel) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5 shadow-sm">
        {/* Form Promo Input Inline */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 text-xs">
            <h2 className="text-sm font-bold text-slate-900">
              {editingPromo ? (
                <span>
                  Mode Edit:{" "}
                  <strong className="text-blue-600">
                    {editingPromo.title}
                  </strong>{" "}
                  <span className="text-slate-500 font-mono text-[11px]">
                    ({editingPromo.code})
                  </span>
                </span>
              ) : (
                "Tambah Master Promo Baru"
              )}
            </h2>
            {editingPromo && (
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
              {/* 1. Judul Promo */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Judul Promo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("title")}
                  placeholder="Judul Promo"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
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

              {/* 2. Kode Voucher (Hybrid: Otomatis terisi & bisa diedit manual + tombol acak) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-900">
                    Kode Voucher <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGenerateCode(true)}
                    disabled={isGeneratingCode}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer disabled:opacity-50"
                    title="Generate kode otomatis baru"
                  >
                    <RefreshCw
                      size={11}
                      className={cn(isGeneratingCode && "animate-spin")}
                    />
                    <span>Acak Kode</span>
                  </button>
                </div>
                <input
                  type="text"
                  {...register("code")}
                  onChange={(e) => {
                    const clean = e.target.value
                      .replace(/[\s-]/g, "")
                      .toUpperCase();
                    setValue("code", clean, { shouldValidate: true });
                  }}
                  placeholder="PROMO202609001"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors font-mono uppercase font-bold",
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

              {/* 3. Potongan Diskon (Rp) */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Nominal Diskon (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  {...register("discount_amount")}
                  placeholder="0"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                    errors.discount_amount
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.discount_amount && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.discount_amount.message}
                  </p>
                )}
              </div>

              {/* 4. Min. Belanja (Rp) */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Min. Belanja (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  {...register("min_order_amount")}
                  placeholder="0"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                    errors.min_order_amount
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.min_order_amount && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.min_order_amount.message}
                  </p>
                )}
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

            {/* Baris Keterangan / Subtitle */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Keterangan / Ketentuan Promo
              </label>
              <input
                type="text"
                {...register("subtitle")}
                placeholder="Keterangan / Ketentuan Promo"
                className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Tombol Simpan & Batal */}
            <div className="pt-1 flex items-center gap-2">
              <Button
                type="submit"
                disabled={savePromoMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 h-[34px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {savePromoMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>{editingPromo ? "Simpan Perubahan" : "Simpan"}</span>
                  </>
                )}
              </Button>
              {editingPromo && (
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
              placeholder="Cari kode voucher, judul promo..."
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
          data={filteredPromos}
          isLoading={isLoading}
          emptyMessage="Tidak ada data voucher promo yang ditemukan."
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
        isLoading={deletePromoMutation.isPending}
      />
    </div>
  );
};
