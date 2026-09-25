"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Save, Search, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DynamicIcon } from "@/components/DynamicIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { serviceFormSchema, ServiceFormSchema } from "@/schemas/service.schema";
import {
  useServiceByIdQuery,
  useSaveServiceMutation,
} from "@/hooks/useServiceQuery";
import { useIconsQuery } from "@/hooks/useIconQuery";
import {
  useUnitsQuery,
  useServiceCategoriesQuery,
} from "@/hooks/useMasterQuery";

interface ServiceFormSubmitProps {
  serviceId?: string;
}

export const ServiceFormSubmit: React.FC<ServiceFormSubmitProps> = ({
  serviceId: propServiceId,
}) => {
  const router = useRouter();
  const params = useParams();
  const rawSlug = params?.slug as string | undefined;
  const rawAction = params?.action as string | undefined;

  const isCreate =
    !propServiceId &&
    (!rawSlug ||
      rawSlug === "create" ||
      rawSlug === "new" ||
      rawSlug === "form-submit" ||
      rawAction === "create");

  const effectiveServiceId =
    propServiceId ||
    (!isCreate && rawSlug ? decodeURIComponent(rawSlug) : undefined);

  const isDetail = !isCreate && Boolean(effectiveServiceId) && rawAction === "detail";
  const isEdit = !isCreate && Boolean(effectiveServiceId) && (rawAction === "edit" || !rawAction);

  // React Query Hook for detail
  const { data: initialService, isLoading: isLoadingDetail } =
    useServiceByIdQuery(effectiveServiceId);
  const saveServiceMutation = useSaveServiceMutation();

  // React Query Hook for master icons, units, categories
  const { data: dbIcons = [] } = useIconsQuery();
  const { data: dbUnits = [] } = useUnitsQuery();
  const { data: dbCategories = [] } = useServiceCategoriesQuery();

  const [iconSearchQuery, setIconSearchQuery] = useState("");
  const [iconCategoryFilter, setIconCategoryFilter] = useState("all");

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingData, setPendingData] = useState<ServiceFormSchema | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<ServiceFormSchema>({
    resolver: zodResolver(serviceFormSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      price: "" as any,
      units_id: "",
      unit_id: "",
      unit: "",
      service_categories_id: "",
      service_category_id: "",
      category_id: "",
      category: "",
      icons_id: null,
      icon_id: null,
      icon_code: "",
      duration: "",
      is_popular: 0,
    },
  });

  const selectedIcon = watch("icon_code");
  const serviceName = watch("name");

  const availableIcons = React.useMemo(() => {
    return dbIcons.filter(
      (ic) =>
        Boolean(ic.is_active) ||
        (selectedIcon && ic.code.toLowerCase() === selectedIcon.toLowerCase()),
    );
  }, [dbIcons, selectedIcon]);

  const iconCategories = React.useMemo(() => {
    const cats = Array.from(
      new Set(
        availableIcons
          .map((ic) => ic.category)
          .filter((c): c is string => Boolean(c && c.trim())),
      ),
    );
    return ["all", ...cats];
  }, [availableIcons]);

  const filteredIcons = React.useMemo(() => {
    return availableIcons.filter((ic) => {
      const q = iconSearchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        ic.name.toLowerCase().includes(q) ||
        ic.code.toLowerCase().includes(q) ||
        (ic.category && ic.category.toLowerCase().includes(q));
      const matchCategory =
        iconCategoryFilter === "all" || ic.category === iconCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [availableIcons, iconSearchQuery, iconCategoryFilter]);

  const currentIconObj = availableIcons.find(
    (ic) => ic.code.toLowerCase() === (selectedIcon || "").toLowerCase(),
  );

  useEffect(() => {
    if (initialService) {
      let resolvedUnit = initialService.unit || "";
      let resolvedUnitsId =
        initialService.units_id || initialService.unit_id || "";
      if (dbUnits.length > 0) {
        const foundU = dbUnits.find(
          (u) =>
            u.id === String(initialService.unit_id) ||
            u.id === String(initialService.units_id) ||
            u.code.toLowerCase() === resolvedUnit.toLowerCase() ||
            (u.symbol &&
              u.symbol.toLowerCase() === resolvedUnit.toLowerCase()) ||
            u.name.toLowerCase() === resolvedUnit.toLowerCase(),
        );
        if (foundU) {
          resolvedUnitsId = foundU.id;
          resolvedUnit = foundU.code;
        }
      }

      let resolvedCategory = initialService.category || "";
      let resolvedCategoriesId =
        initialService.service_categories_id ||
        initialService.service_category_id ||
        initialService.category_id ||
        "";
      if (dbCategories.length > 0) {
        const foundC = dbCategories.find(
          (c) =>
            c.id === String(initialService.service_category_id) ||
            c.id === String(initialService.category_id) ||
            c.id === String(initialService.service_categories_id) ||
            c.code.toLowerCase() === resolvedCategory.toLowerCase() ||
            c.name.toLowerCase() === resolvedCategory.toLowerCase(),
        );
        if (foundC) {
          resolvedCategoriesId = foundC.id;
          resolvedCategory = foundC.code;
        }
      }

      let resolvedIconCode = initialService.icon_code || "";
      let resolvedIconsId =
        initialService.icons_id || initialService.icon_id || null;
      if (dbIcons.length > 0) {
        const foundI = dbIcons.find(
          (i) =>
            i.id === String(initialService.icon_id) ||
            i.id === String(initialService.icons_id) ||
            i.code.toLowerCase() === resolvedIconCode.toLowerCase(),
        );
        if (foundI) {
          resolvedIconsId = foundI.id;
          resolvedIconCode = foundI.code;
        }
      }

      reset({
        name: initialService.name || "",
        description: initialService.description || "",
        price:
          initialService.price !== undefined
            ? Number(initialService.price)
            : ("" as any),
        units_id: resolvedUnitsId,
        unit_id: String(resolvedUnitsId),
        unit: resolvedUnit,
        service_categories_id: resolvedCategoriesId,
        service_category_id: String(resolvedCategoriesId),
        category_id: String(resolvedCategoriesId),
        category: resolvedCategory,
        icons_id: resolvedIconsId,
        icon_id: resolvedIconsId ? String(resolvedIconsId) : null,
        icon_code: resolvedIconCode,
        duration: initialService.duration || "",
        is_popular: initialService.is_popular ? 1 : 0,
      });
    }
  }, [initialService, dbUnits, dbCategories, dbIcons, reset]);

  const onValidSubmit = (data: ServiceFormSchema) => {
    setPendingData(data);
    setShowConfirmDialog(true);
  };

  const handleExecuteSave = async () => {
    if (!pendingData) return;
    try {
      await saveServiceMutation.mutateAsync({
        serviceData: pendingData,
        editingId: effectiveServiceId,
      });
      setShowConfirmDialog(false);
      toast.success(
        isEdit
          ? "Layanan berhasil diperbarui!"
          : "Layanan baru berhasil ditambahkan!",
      );
      router.push("/service");
    } catch (err: any) {
      setShowConfirmDialog(false);
      const errMsg = err.message || "Gagal menyimpan data layanan";
      const lower = errMsg.toLowerCase();
      if (lower.includes("nama") || lower.includes("name")) {
        setError("name", { message: errMsg });
      }
      toast.error(errMsg);
    }
  };

  if (effectiveServiceId && isLoadingDetail) {
    return (
      <div className="py-16 text-center text-slate-400 text-xs animate-pulse">
        Memuat data formulir layanan...
      </div>
    );
  }

  if (effectiveServiceId && !isLoadingDetail && !initialService) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-4">
          <Link
            href="/service"
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
              <span>Katalog Layanan</span>
              <span>/</span>
              <span>Error</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
              Layanan Tidak Ditemukan
            </h1>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto font-bold text-lg">
            !
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Data Layanan Tidak Tersedia
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Layanan tidak ditemukan atau telah dihapus.
            </p>
          </div>
          <Link
            href="/service"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-600/20 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Katalog Layanan</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back & Breadcrumb Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/service"
          className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
          title="Kembali ke Katalog Layanan"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
            <span>Katalog Layanan</span>
            <span>/</span>
            <span>
              {isDetail
                ? "Detail Layanan"
                : isEdit
                  ? "Edit Layanan"
                  : "Tambah Layanan Baru"}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
            {isDetail
              ? `Detail Layanan: ${initialService?.name || serviceName || ""}`
              : isEdit
                ? `Edit Layanan: ${initialService?.name || serviceName || ""}`
                : "Formulir Input Layanan Baru"}
          </h1>
        </div>
      </div>

      {/* Main Card Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {isDetail ? "Informasi Lengkap Layanan" : "Detail Paket Layanan"}
          </h2>
        </div>

        <form
          onSubmit={handleSubmit(onValidSubmit)}
          className="space-y-5 text-xs"
        >
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              Nama Layanan / Paket {!isDetail && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="text"
              disabled={isDetail}
              {...register("name")}
              placeholder="Nama Layanan / Paket"
              className={`w-full border rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none transition-all ${
                isDetail
                  ? "bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed"
                  : errors.name
                    ? "border-rose-400 bg-rose-50/20"
                    : "bg-slate-50 border-slate-200 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
              }`}
            />
            {errors.name && !isDetail && (
              <p className="text-[11px] text-rose-500 mt-1 font-semibold">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              Deskripsi Lengkap Layanan
            </label>
            <textarea
              rows={3}
              disabled={isDetail}
              {...register("description")}
              placeholder="Jelaskan proses cuci, deterjen yang digunakan, serta garansi..."
              className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none transition-all ${
                isDetail
                  ? "bg-slate-100 text-slate-700 cursor-not-allowed"
                  : "bg-slate-50 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
              }`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                Tarif / Harga (Rp) {!isDetail && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="number"
                min={0}
                disabled={isDetail}
                placeholder="0"
                {...register("price", { valueAsNumber: true })}
                className={`w-full border rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none transition-all ${
                  isDetail
                    ? "bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed font-semibold text-sky-800"
                    : errors.price
                      ? "border-rose-400 bg-rose-50/20"
                      : "bg-slate-50 border-slate-200 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
                }`}
              />
              {errors.price && !isDetail && (
                <p className="text-[11px] text-rose-500 mt-1 font-semibold">
                  {errors.price.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-700 font-bold">
                  Satuan Ukur {!isDetail && <span className="text-rose-500">*</span>}
                </label>
                {!isDetail && (
                  <Link
                    href="/master/satuan"
                    className="text-[11px] text-sky-600 hover:text-sky-700 font-semibold hover:underline"
                  >
                    + Master Satuan
                  </Link>
                )}
              </div>
              <Controller
                control={control}
                name="unit"
                render={({ field }) => (
                  <Select
                    key={field.value || "empty"}
                    disabled={isDetail}
                    value={field.value || ""}
                    onValueChange={(val) => {
                      field.onChange(val);
                      const found = dbUnits.find(
                        (u) =>
                          u.code.toLowerCase() === val.toLowerCase() ||
                          (u.symbol && u.symbol.toLowerCase() === val.toLowerCase()) ||
                          u.name.toLowerCase() === val.toLowerCase() ||
                          u.id === val,
                      );
                      if (found) {
                        setValue("units_id", found.id, { shouldValidate: true, shouldDirty: true });
                        setValue("unit_id", found.id, { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                  >
                    <SelectTrigger
                      clearable={!isDetail && Boolean(field.value)}
                      onClear={() => {
                        field.onChange("");
                        setValue("units_id", "", { shouldValidate: true, shouldDirty: true });
                        setValue("unit_id", "", { shouldValidate: true, shouldDirty: true });
                      }}
                      className={`w-full rounded-xl px-4 py-2.5 text-slate-900 h-10 ${
                        isDetail ? "bg-slate-100 border-slate-200 cursor-not-allowed" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <SelectValue
                        placeholder={
                          dbUnits.length === 0
                            ? "Tidak ada pilihan data"
                            : "Pilih Satuan Ukur"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {dbUnits.length === 0 ? (
                        <div className="py-2.5 px-3 text-center text-xs text-slate-400 italic select-none">
                          Tidak ada pilihan data
                        </div>
                      ) : (
                        <>
                          {dbUnits
                            .filter(
                              (u) =>
                                Boolean(u.is_active) ||
                                (field.value &&
                                  (u.code.toLowerCase() ===
                                    field.value.toLowerCase() ||
                                    u.symbol?.toLowerCase() ===
                                      field.value.toLowerCase())),
                            )
                            .map((u) => (
                              <SelectItem key={u.id} value={u.code}>
                                {u.name}{" "}
                                {u.symbol ? `(${u.symbol})` : `(${u.code})`}
                              </SelectItem>
                            ))}
                          {field.value &&
                            !dbUnits.some(
                              (u) =>
                                u.code.toLowerCase() ===
                                field.value.toLowerCase(),
                            ) && (
                              <SelectItem value={field.value}>
                                {field.value}
                              </SelectItem>
                            )}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.unit && !isDetail && (
                <p className="text-[11px] text-rose-500 mt-1 font-semibold">
                  {errors.unit.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-700 font-bold">
                  Kategori Layanan {!isDetail && <span className="text-rose-500">*</span>}
                </label>
                {!isDetail && (
                  <Link
                    href="/master/kategori-layanan"
                    className="text-[11px] text-sky-600 hover:text-sky-700 font-semibold hover:underline"
                  >
                    + Master Kategori
                  </Link>
                )}
              </div>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select
                    key={field.value || "empty"}
                    disabled={isDetail}
                    value={field.value || ""}
                    onValueChange={(val) => {
                      field.onChange(val);
                      const found = dbCategories.find(
                        (c) =>
                          c.code.toLowerCase() === val.toLowerCase() ||
                          c.name.toLowerCase() === val.toLowerCase() ||
                          c.id === val,
                      );
                      if (found) {
                        setValue("service_categories_id", found.id, { shouldValidate: true, shouldDirty: true });
                        setValue("service_category_id", found.id, { shouldValidate: true, shouldDirty: true });
                        setValue("category_id", found.id, { shouldValidate: true, shouldDirty: true });
                      }
                    }}
                  >
                    <SelectTrigger
                      clearable={!isDetail && Boolean(field.value)}
                      onClear={() => {
                        field.onChange("");
                        setValue("service_categories_id", "", { shouldValidate: true, shouldDirty: true });
                        setValue("service_category_id", "", { shouldValidate: true, shouldDirty: true });
                        setValue("category_id", "", { shouldValidate: true, shouldDirty: true });
                      }}
                      className={`w-full rounded-xl px-4 py-2.5 text-slate-900 h-10 ${
                        isDetail ? "bg-slate-100 border-slate-200 cursor-not-allowed" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <SelectValue
                        placeholder={
                          dbCategories.length === 0
                            ? "Tidak ada pilihan data"
                            : "Pilih Kategori"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {dbCategories.length === 0 ? (
                        <div className="py-2.5 px-3 text-center text-xs text-slate-400 italic select-none">
                          Tidak ada pilihan data
                        </div>
                      ) : (
                        <>
                          {dbCategories
                            .filter(
                              (c) =>
                                Boolean(c.is_active) ||
                                (field.value &&
                                  (c.code.toLowerCase() ===
                                    field.value.toLowerCase() ||
                                    c.name.toLowerCase() ===
                                      field.value.toLowerCase())),
                            )
                            .map((c) => (
                              <SelectItem key={c.id} value={c.code}>
                                {c.name}
                              </SelectItem>
                            ))}
                          {field.value &&
                            !dbCategories.some(
                              (c) =>
                                c.code.toLowerCase() ===
                                field.value.toLowerCase(),
                            ) && (
                              <SelectItem value={field.value}>
                                {field.value}
                              </SelectItem>
                            )}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && !isDetail && (
                <p className="text-[11px] text-rose-500 mt-1 font-semibold">
                  {errors.category.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                Estimasi Durasi Waktu {!isDetail && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                disabled={isDetail}
                {...register("duration")}
                placeholder="Estimasi Durasi Waktu"
                className={`w-full border rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none transition-all ${
                  isDetail
                    ? "bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed"
                    : errors.duration
                      ? "border-rose-400 bg-rose-50/20"
                      : "bg-slate-50 border-slate-200 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
                }`}
              />
              {errors.duration && !isDetail && (
                <p className="text-[11px] text-rose-500 mt-1 font-semibold">
                  {errors.duration.message}
                </p>
              )}
            </div>
          </div>

          {/* Ikon Representasi Layanan */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
              <div>
                <label className="block text-slate-800 font-bold text-xs">
                  Ikon Representasi Layanan {!isDetail && <span className="text-rose-500">*</span>}
                </label>
                <p className="text-[11px] text-slate-500">
                  Ikon representasi visual yang tampil pada katalog layanan dan nota.
                </p>
              </div>

              {!isDetail && (
                <Link
                  href="/master/icon"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition-colors w-fit"
                  title="Buka halaman Master Ikon di tab baru"
                >
                  <span>Kelola Master Ikon</span>
                  <ExternalLink size={12} />
                </Link>
              )}
            </div>

            {/* Selected Icon Preview Card */}
            <div className="flex items-center justify-between gap-3 p-3 bg-sky-50/60 border border-sky-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0 ${
                    selectedIcon
                      ? "bg-sky-600 text-white shadow-sky-600/20"
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}
                >
                  {selectedIcon ? (
                    <DynamicIcon name={selectedIcon} size={22} />
                  ) : (
                    <Sparkles size={20} className="text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-sky-700">
                    Ikon Terpilih
                  </div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    {selectedIcon ? (
                      <>
                        <span>{currentIconObj?.name || selectedIcon}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-sky-100 text-sky-800 rounded font-semibold">
                          {selectedIcon}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400 font-normal italic">
                        Belum ada ikon dipilih
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {currentIconObj?.category && (
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full hidden sm:inline-block">
                  Kategori: {currentIconObj.category}
                </span>
              )}
            </div>
            {errors.icon_code && !isDetail && (
              <p className="text-[11px] text-rose-500 font-semibold mt-1">
                {errors.icon_code.message}
              </p>
            )}

            {/* Search & Category Filter for Icons (Only in Edit / Create mode) */}
            {!isDetail && (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={iconSearchQuery}
                      onChange={(e) => setIconSearchQuery(e.target.value)}
                      placeholder="Cari ikon (nama, kode, atau kategori)..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white transition-all"
                    />
                    {iconSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setIconSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none max-w-full">
                    {iconCategories.slice(0, 7).map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setIconCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                          iconCategoryFilter === cat
                            ? "bg-sky-600 text-white shadow-xs font-semibold"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {cat === "all" ? "Semua" : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1.5 border border-slate-200 rounded-xl bg-slate-50/50">
                  {filteredIcons.map((ic) => {
                    const isSelected =
                      (selectedIcon || "").toLowerCase() ===
                      ic.code.toLowerCase();
                    return (
                      <button
                        type="button"
                        key={ic.id || ic.code}
                        onClick={() => {
                          setValue("icon_code", ic.code, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                          if (ic.id) {
                            setValue("icons_id", ic.id, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                            setValue("icon_id", String(ic.id), {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer group ${
                          isSelected
                            ? "bg-sky-50 border-sky-500 text-sky-900 ring-2 ring-sky-500/20 shadow-xs"
                            : "bg-white border-slate-200 text-slate-700 hover:border-sky-300 hover:bg-sky-50/30"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-sky-600 text-white"
                              : "bg-slate-100 text-slate-600 group-hover:bg-sky-100 group-hover:text-sky-700"
                          }`}
                        >
                          <DynamicIcon name={ic.code} size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold truncate leading-tight">
                            {ic.name || ic.code}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">
                            {ic.code}
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {filteredIcons.length === 0 && (
                    <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                      Tidak ada ikon yang sesuai dengan kata kunci &quot;
                      {iconSearchQuery}&quot;.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <label className={`inline-flex items-center gap-2.5 ${isDetail ? "cursor-not-allowed" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                disabled={isDetail}
                {...register("is_popular")}
                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 disabled:opacity-60"
              />
              <span className="text-slate-700 font-medium">
                Tampilkan Label Populer / Unggulan
              </span>
            </label>
          </div>

          {/* Bottom Actions (Hanya pada mode Edit dan Tambah) */}
          {!isDetail && (
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <Link
                href="/service"
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
              >
                Batal
              </Link>
              <Button
                type="submit"
                disabled={saveServiceMutation.isPending}
                className="px-6 py-2.5 h-auto bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-xl font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:cursor-not-allowed"
              >
                {saveServiceMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>
                      {isEdit ? "Perbarui Layanan" : "Simpan Layanan"}
                    </span>
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* Confirm Dialog */}
      {!isDetail && (
        <ConfirmDialog
          isOpen={showConfirmDialog}
          variant={isEdit ? "update" : "create"}
          isLoading={saveServiceMutation.isPending}
          title={
            isEdit ? "Konfirmasi Perbarui Layanan" : "Konfirmasi Tambah Layanan"
          }
          description={`Apakah Anda yakin ingin ${isEdit ? "memperbarui" : "menyimpan"} layanan "${pendingData?.name || ""}" ke dalam katalog?`}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={handleExecuteSave}
        />
      )}
    </div>
  );
};
