"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Search,
  Edit3,
  Trash2,
  Save,
  Loader2,
  RefreshCw,
  Calendar,
} from "lucide-react";
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

const promoSchema = z
  .object({
    title: z.string().min(1, "Judul promo wajib diisi"),
    code: z.string().min(1, "Kode promo wajib diisi"),
    subtitle: z.string().optional(),
    category: z.string().min(1, "Kategori voucher wajib dipilih"),
    benefit_type: z.string().min(1, "Jenis manfaat voucher wajib dipilih"),
    discount_type: z.string().optional(),
    discount_amount: z.coerce.number().min(0, "Diskon tidak boleh negatif"),
    max_discount: z.preprocess(
      (val) =>
        val === "" || val === null || val === undefined ? null : Number(val),
      z.number().nullable().optional(),
    ),
    min_order_amount: z.coerce
      .number()
      .min(0, "Minimal belanja tidak boleh negatif"),
    points_required: z.coerce.number().min(0).optional(),
    start_date: z.string().min(1, "Tanggal mulai berlaku wajib diisi"),
    end_date: z.string().min(1, "Tanggal berakhir berlaku wajib diisi"),
    icon_code: z.string().optional().default("ticket"),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return data.end_date >= data.start_date;
      }
      return true;
    },
    {
      message: "Tanggal berakhir tidak boleh lebih awal dari tanggal mulai",
      path: ["end_date"],
    },
  )
  .refine(
    (data) => {
      const isPercent =
        data.discount_type === "Persen" || data.discount_type === "percent";
      const isFree =
        data.benefit_type === "Bebas Ongkir" ||
        data.benefit_type === "free_delivery";
      if (isPercent && !isFree) {
        return data.discount_amount > 0 && data.discount_amount <= 100;
      }
      return true;
    },
    {
      message: "Persentase diskon harus bernilai antara 1% hingga 100%",
      path: ["discount_amount"],
    },
  )
  .refine(
    (data) => {
      const isReward =
        data.category === "Reward Point" || data.category === "reward_point";
      if (isReward) {
        return (data.points_required || 0) > 0;
      }
      return true;
    },
    {
      message: "Poin reward yang dibutuhkan wajib lebih dari 0",
      path: ["points_required"],
    },
  );

type PromoFormData = z.infer<typeof promoSchema>;

const getTodayString = () => new Date().toISOString().slice(0, 10);

const formatDateId = (dateStr: string) => {
  if (!dateStr) return "-";
  try {
    const parts = dateStr.slice(0, 10).split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ];
      return `${day} ${months[monthIndex] || parts[1]} ${year}`;
    }
    return dateStr.slice(0, 10);
  } catch {
    return dateStr;
  }
};

export const PromosView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
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
      category: "",
      benefit_type: "",
      discount_type: "",
      discount_amount: "" as any,
      max_discount: "" as any,
      min_order_amount: "" as any,
      points_required: "" as any,
      start_date: getTodayString(),
      end_date: getTodayString(),
      icon_code: "ticket",
      is_active: true,
    },
  });

  const watchCategory = useWatch({ control, name: "category" });
  const watchBenefitType = useWatch({ control, name: "benefit_type" });
  const watchDiscountType = useWatch({ control, name: "discount_type" });
  const watchStartDate = useWatch({ control, name: "start_date" });
  const watchEndDate = useWatch({ control, name: "end_date" });

  useEffect(() => {
    if (watchStartDate && watchEndDate && watchEndDate < watchStartDate) {
      setValue("end_date", watchStartDate, { shouldValidate: true });
    }
  }, [watchStartDate, watchEndDate, setValue]);

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
    const cat =
      promo.category === "Reward Point" || promo.category === "reward_point"
        ? "Reward Point"
        : "Event";
    const ben =
      promo.benefit_type === "Bebas Ongkir" ||
      promo.benefit_type === "free_delivery"
        ? "Bebas Ongkir"
        : promo.benefit_type === "Potongan Ongkir" ||
            promo.benefit_type === "delivery_discount"
          ? "Potongan Ongkir"
          : "Potongan Harga";
    const disc =
      promo.discount_type === "Persen" || promo.discount_type === "percent"
        ? "Persen"
        : "Nominal";

    reset({
      title: promo.title,
      code: (promo.code || "").replace(/[\s-]/g, "").toUpperCase(),
      subtitle: promo.subtitle || "",
      category: cat as any,
      benefit_type: ben as any,
      discount_type: disc as any,
      discount_amount: Number(promo.discount_amount) || 0,
      max_discount:
        promo.max_discount !== null && promo.max_discount !== undefined
          ? Number(promo.max_discount)
          : ("" as any),
      min_order_amount: Number(promo.min_order_amount) || 0,
      points_required:
        promo.points_required !== undefined && promo.points_required !== null
          ? Number(promo.points_required)
          : ("" as any),
      start_date: promo.start_date
        ? String(promo.start_date).slice(0, 10)
        : getTodayString(),
      end_date: promo.end_date
        ? String(promo.end_date).slice(0, 10)
        : getTodayString(),
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
      category: "",
      benefit_type: "",
      discount_type: "",
      discount_amount: "" as any,
      max_discount: "" as any,
      min_order_amount: "" as any,
      points_required: "" as any,
      start_date: getTodayString(),
      end_date: getTodayString(),
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

    const isReward =
      data.category === "Reward Point" || data.category === "reward_point";
    const isFree =
      data.benefit_type === "Bebas Ongkir" ||
      data.benefit_type === "free_delivery";
    const isPercent =
      data.discount_type === "Persen" || data.discount_type === "percent";

    const finalCategory = isReward ? "Reward Point" : "Event";
    const finalBenefitType = isFree
      ? "Bebas Ongkir"
      : data.benefit_type === "Potongan Ongkir" ||
          data.benefit_type === "delivery_discount"
        ? "Potongan Ongkir"
        : "Potongan Harga";
    const finalDiscountType = isFree
      ? "Nominal"
      : isPercent
        ? "Persen"
        : "Nominal";

    try {
      await savePromoMutation.mutateAsync({
        promoData: {
          title: data.title.trim(),
          code: codeClean,
          subtitle: data.subtitle?.trim() || "",
          category: finalCategory,
          benefit_type: finalBenefitType,
          discount_type: finalDiscountType,
          discount_amount: isFree ? 0 : Number(data.discount_amount) || 0,
          max_discount:
            finalDiscountType === "Persen" &&
            data.max_discount !== null &&
            data.max_discount !== undefined &&
            String(data.max_discount).trim() !== ""
              ? Number(data.max_discount)
              : null,
          min_order_amount: Number(data.min_order_amount) || 0,
          points_required: isReward ? Number(data.points_required) || 0 : 0,
          start_date: data.start_date,
          end_date: data.end_date,
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
    const today = new Date().toISOString().slice(0, 10);

    return promos.filter((p) => {
      const q = debouncedSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q));

      const start = p.start_date ? String(p.start_date).slice(0, 10) : "";
      const end = p.end_date ? String(p.end_date).slice(0, 10) : "";
      const isActivePeriod = (!start || start <= today) && (!end || end >= today);

      const matchCategory =
        !categoryFilter ||
        categoryFilter === "all" ||
        (categoryFilter === "Event" &&
          (p.category === "Event" || p.category === "event")) ||
        (categoryFilter === "Reward Point" &&
          (p.category === "Reward Point" ||
            p.category === "reward_point" ||
            p.category === "reward point"));

      const matchStatus =
        !statusFilter ||
        statusFilter === "all" ||
        (statusFilter === "active" && isActivePeriod) ||
        (statusFilter === "inactive" && !isActivePeriod);

      return matchSearch && matchCategory && matchStatus;
    });
  }, [promos, debouncedSearch, statusFilter, categoryFilter]);

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
        header: "Judul & Kategori",
        cell: ({ row }) => {
          const isReward =
            row.original.category === "Reward Point" ||
            row.original.category === "reward_point";
          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900">
                  {row.original.title}
                </span>
                {isReward ? (
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    {row.original.points_required || 0} Poin
                  </span>
                ) : (
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                    Event
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 line-clamp-1">
                {row.original.subtitle || "-"}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "benefit_type",
        header: "Manfaat & Diskon",
        cell: ({ row }) => {
          const promo = row.original;
          const isFree =
            promo.benefit_type === "Bebas Ongkir" ||
            promo.benefit_type === "free_delivery";
          if (isFree) {
            return (
              <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
                Bebas Ongkir
              </span>
            );
          }

          const isPercent =
            promo.discount_type === "Persen" ||
            promo.discount_type === "percent";
          const isDelivery =
            promo.benefit_type === "Potongan Ongkir" ||
            promo.benefit_type === "delivery_discount";

          return (
            <div className="space-y-0.5">
              <div className="font-semibold text-rose-600 text-xs">
                {isPercent
                  ? `Diskon ${promo.discount_amount}%`
                  : `- ${formatRupiah(promo.discount_amount)}`}
              </div>
              <div className="text-[10.5px] text-slate-500 font-medium">
                {isDelivery ? "Ongkir" : "Layanan"}
                {isPercent && promo.max_discount ? (
                  <span className="text-slate-600 font-medium ml-1">
                    (Maks. {formatRupiah(promo.max_discount)})
                  </span>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "min_order_amount",
        header: "Min. Belanja",
        cell: ({ row }) => (
          <span className="text-slate-700 font-medium text-xs">
            {row.original.min_order_amount > 0
              ? formatRupiah(row.original.min_order_amount)
              : "Tanpa Minimal"}
          </span>
        ),
      },
      {
        accessorKey: "start_date",
        header: "Periode Berlaku",
        cell: ({ row }) => {
          const promo = row.original;
          const today = new Date().toISOString().slice(0, 10);
          const isExpired =
            promo.end_date && String(promo.end_date).slice(0, 10) < today;
          const isNotStarted =
            promo.start_date && String(promo.start_date).slice(0, 10) > today;

          return (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[11px] text-slate-700 font-medium">
                <Calendar size={12} className="text-slate-400" />
                <span>
                  {formatDateId(promo.start_date)} -{" "}
                  {formatDateId(promo.end_date)}
                </span>
              </div>
              {isExpired ? (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  Kedaluwarsa
                </span>
              ) : isNotStarted ? (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                  Akan Datang
                </span>
              ) : (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Sedang Berjalan
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => {
          const promo = row.original;
          const today = new Date().toISOString().slice(0, 10);
          const start = promo.start_date
            ? String(promo.start_date).slice(0, 10)
            : "";
          const end = promo.end_date ? String(promo.end_date).slice(0, 10) : "";
          const isActivePeriod =
            (!start || start <= today) && (!end || end >= today);

          return isActivePeriod ? (
            <Badge variant="success">Aktif</Badge>
          ) : (
            <Badge variant="danger">Nonaktif</Badge>
          );
        },
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
            {/* Row 1: Informasi Dasar & Kategori */}
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

              {/* 2. Kode Voucher */}
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
                  placeholder="Kode Voucher"
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

              {/* 3. Kategori Promo (Event vs Poin Reward) */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Kategori Voucher <span className="text-rose-500">*</span>
                </label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select
                      key={field.value || "empty"}
                      value={
                        field.value === "reward_point" ||
                        field.value === "Reward Point"
                          ? "Reward Point"
                          : field.value === "event" || field.value === "Event"
                            ? "Event"
                            : ""
                      }
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        clearable={Boolean(field.value)}
                        onClear={() => field.onChange("")}
                        className={cn(
                          "w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-800 h-[34px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-none",
                          errors.category
                            ? "border-rose-400 bg-rose-50/30"
                            : "border-slate-300",
                        )}
                      >
                        <SelectValue placeholder="Pilih Kategori Voucher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Event">Event</SelectItem>
                        <SelectItem value="Reward Point">
                          Reward Point
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.category.message}
                  </p>
                )}
              </div>

              {/* 4. Jenis Manfaat (Benefit Type) */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Jenis Manfaat <span className="text-rose-500">*</span>
                </label>
                <Controller
                  control={control}
                  name="benefit_type"
                  render={({ field }) => (
                    <Select
                      key={field.value || "empty"}
                      value={
                        field.value === "free_delivery" ||
                        field.value === "Bebas Ongkir"
                          ? "Bebas Ongkir"
                          : field.value === "delivery_discount" ||
                              field.value === "Potongan Ongkir"
                            ? "Potongan Ongkir"
                            : field.value === "service_discount" ||
                                field.value === "Potongan Harga"
                              ? "Potongan Harga"
                              : ""
                      }
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        clearable={Boolean(field.value)}
                        onClear={() => field.onChange("")}
                        className={cn(
                          "w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-800 h-[34px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-none",
                          errors.benefit_type
                            ? "border-rose-400 bg-rose-50/30"
                            : "border-slate-300",
                        )}
                      >
                        <SelectValue placeholder="Pilih Jenis Manfaat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Potongan Harga">
                          Potongan Harga
                        </SelectItem>
                        <SelectItem value="Bebas Ongkir">
                          Bebas Ongkir
                        </SelectItem>
                        <SelectItem value="Potongan Ongkir">
                          Potongan Ongkir
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.benefit_type && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.benefit_type.message}
                  </p>
                )}
              </div>

              {/* 5. Tipe Diskon (Nominal vs Persen) */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Tipe Diskon
                </label>
                <Controller
                  control={control}
                  name="discount_type"
                  render={({ field }) => {
                    const isFree =
                      watchBenefitType === "Bebas Ongkir" ||
                      watchBenefitType === "free_delivery";
                    return (
                      <Select
                        disabled={isFree}
                        key={field.value || "empty"}
                        value={
                          isFree
                            ? "Nominal"
                            : field.value === "percent" ||
                                field.value === "Persen"
                              ? "Persen"
                              : field.value === "fixed" ||
                                  field.value === "Nominal"
                                ? "Nominal"
                                : ""
                        }
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          clearable={!isFree && Boolean(field.value)}
                          onClear={() => field.onChange("")}
                          className={cn(
                            "w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-800 h-[34px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-none disabled:bg-slate-100 disabled:opacity-60",
                            errors.discount_type
                              ? "border-rose-400 bg-rose-50/30"
                              : "border-slate-300",
                          )}
                        >
                          <SelectValue placeholder="Pilih Tipe Diskon" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Nominal">
                            Nominal Tetap (Rp)
                          </SelectItem>
                          <SelectItem value="Persen">Persentase (%)</SelectItem>
                        </SelectContent>
                      </Select>
                    );
                  }}
                />
                {errors.discount_type && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.discount_type.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Perhitungan Nilai, Syarat Belanja, & Poin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
              {/* 1. Nilai / Besar Diskon */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  {watchBenefitType === "Bebas Ongkir" ||
                  watchBenefitType === "free_delivery"
                    ? "Diskon (Bebas Ongkir)"
                    : watchDiscountType === "Persen" ||
                        watchDiscountType === "percent"
                      ? "Persentase Diskon (%) *"
                      : "Nominal Diskon (Rp) *"}
                </label>
                <input
                  type="number"
                  min="0"
                  max={
                    watchDiscountType === "Persen" ||
                    watchDiscountType === "percent"
                      ? 100
                      : undefined
                  }
                  disabled={
                    watchBenefitType === "Bebas Ongkir" ||
                    watchBenefitType === "free_delivery"
                  }
                  {...register("discount_amount")}
                  placeholder="0"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors disabled:bg-slate-100 disabled:opacity-60",
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

              {/* 2. Maksimal Diskon (Jika Persen) */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Maks. Diskon (Rp){" "}
                  <span className="text-slate-400 font-normal">
                    {watchDiscountType === "Persen" ||
                    watchDiscountType === "percent"
                      ? "(Opsional)"
                      : "(N/A)"}
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={
                    !(
                      watchDiscountType === "Persen" ||
                      watchDiscountType === "percent"
                    ) ||
                    watchBenefitType === "Bebas Ongkir" ||
                    watchBenefitType === "free_delivery"
                  }
                  {...register("max_discount")}
                  placeholder="0"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors disabled:bg-slate-100 disabled:opacity-60",
                    errors.max_discount
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.max_discount && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.max_discount.message}
                  </p>
                )}
              </div>

              {/* 3. Min. Belanja (Rp) */}
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

              {/* 4. Poin Dibutuhkan (Khusus Kategori Reward Poin) */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Poin Dibutuhkan{" "}
                  {watchCategory === "Reward Point" ||
                  watchCategory === "reward_point" ? (
                    <span className="text-amber-600">*</span>
                  ) : (
                    <span className="text-slate-400 font-normal">(N/A)</span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={
                    !(
                      watchCategory === "Reward Point" ||
                      watchCategory === "reward_point"
                    )
                  }
                  {...register("points_required")}
                  placeholder="0"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors disabled:bg-slate-100 disabled:opacity-60",
                    errors.points_required
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.points_required && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.points_required.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: Tanggal Mulai, Tanggal Selesai, & Keterangan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-start">
              {/* 1. Tanggal Mulai Berlaku (start_date) */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Tanggal Mulai <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  {...register("start_date")}
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none transition-colors",
                    errors.start_date
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.start_date && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.start_date.message}
                  </p>
                )}
              </div>

              {/* 2. Tanggal Berakhir Berlaku (end_date) */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Tanggal Berakhir <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  min={watchStartDate || undefined}
                  {...register("end_date")}
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none transition-colors",
                    errors.end_date
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.end_date && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.end_date.message}
                  </p>
                )}
              </div>

              {/* 3. Keterangan / Subtitle */}
              <div className="sm:col-span-2">
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
            {/* Filter Kategori */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600 font-bold">Kategori:</span>
              <Select
                key={categoryFilter || "empty"}
                value={categoryFilter || ""}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger
                  clearable={Boolean(categoryFilter)}
                  onClear={() => setCategoryFilter("")}
                  className="w-[140px] h-8 rounded-lg bg-slate-50 border-slate-200 text-xs font-semibold text-slate-800"
                >
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Event">Event</SelectItem>
                  <SelectItem value="Reward Point">Reward Point</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600 font-bold">Status:</span>
              <Select
                key={statusFilter || "empty"}
                value={statusFilter || ""}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger
                  clearable={Boolean(statusFilter)}
                  onClear={() => setStatusFilter("")}
                  className="w-[130px] h-8 rounded-lg bg-slate-50 border-slate-200 text-xs font-semibold text-slate-800"
                >
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
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
