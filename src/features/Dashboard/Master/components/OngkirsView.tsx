"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Search, Edit3, Trash2, Save, Loader2 } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import { OngkirItem } from "@/types";
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
  useOngkirsQuery,
  useOutletsQuery,
  useUnitsQuery,
  useNextOngkirCodeQuery,
  useOngkirPreviewTiersQuery,
  useSaveOngkirMutation,
  useDeleteOngkirMutation,
} from "@/hooks/useMasterQuery";

const ongkirSchema = z
  .object({
    name_ongkir: z.string().min(1, "Nama aturan ongkir wajib diisi"),
    code_ongkir: z.string().max(3, "Kode ongkir maksimal 3 karakter").optional(),
    outlets_id: z.string().min(1, "Outlet wajib dipilih"),
    units_id: z.string().min(1, "Satuan wajib dipilih"),
    free_radius: z.coerce.number().min(0, "Radius gratis minimal 0"),
    base_radius: z.coerce.number().min(0.1, "Radius dasar harus lebih dari 0"),
    base_price: z.coerce.number().min(0, "Tarif dasar minimal 0"),
    step_radius: z.coerce
      .number()
      .min(0.1, "Kelipatan jarak tambahan harus lebih dari 0"),
    step_price: z.coerce.number().min(0, "Tarif tambahan minimal 0"),
    max_radius: z.coerce.number().min(0.1, "Batas maksimal radius minimal 0.1"),
  })
  .superRefine((data, ctx) => {
    if (data.free_radius >= data.base_radius) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Radius gratis harus lebih kecil dari radius dasar",
        path: ["free_radius"],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Radius dasar harus lebih besar dari radius gratis",
        path: ["base_radius"],
      });
    }

    if (data.max_radius <= data.base_radius) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Batas jangkauan maksimal harus lebih besar dari radius dasar",
        path: ["max_radius"],
      });
    }
  });

type OngkirFormData = z.infer<typeof ongkirSchema>;

export const OngkirsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);

  const { data: ongkirs = [], isLoading: isLoadingOngkirs } = useOngkirsQuery();
  const { data: outlets = [], isLoading: isLoadingOutlets } = useOutletsQuery();
  const { data: units = [], isLoading: isLoadingUnits } = useUnitsQuery();

  const [editingOngkir, setEditingOngkir] = useState<OngkirItem | null>(null);

  const { data: nextCodeData, isLoading: isLoadingNextCode } =
    useNextOngkirCodeQuery({
      enabled: !editingOngkir,
    });

  const saveOngkirMutation = useSaveOngkirMutation();
  const deleteOngkirMutation = useDeleteOngkirMutation();

  const [testDistance, setTestDistance] = useState<number | string>("");

  // Map ID Outlet yang sudah digunakan oleh aturan ongkir aktif
  const usedOutletMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of ongkirs) {
      const oId = String(item.outlet_id || item.outlets_id || "");
      if (oId) {
        map.set(oId, item.name_ongkir);
      }
    }
    return map;
  }, [ongkirs]);

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
  } = useForm<OngkirFormData>({
    resolver: zodResolver(ongkirSchema) as any,
    defaultValues: {
      name_ongkir: "",
      code_ongkir: "",
      outlets_id: "",
      units_id: "",
      free_radius: "" as any,
      base_radius: "" as any,
      base_price: "" as any,
      step_radius: "" as any,
      step_price: "" as any,
      max_radius: "" as any,
    },
  });

  // Watch form values for live tier generation
  const watchedUnitsId = watch("units_id");
  const selectedUnit = useMemo(() => {
    return units.find((u) => String(u.id) === String(watchedUnitsId));
  }, [units, watchedUnitsId]);

  const unitSymbol =
    selectedUnit?.symbol || selectedUnit?.code_unit || "Satuan";

  const watchedFreeRadius = Number(watch("free_radius"));
  const watchedBaseRadius = Number(watch("base_radius"));
  const watchedBasePrice = Number(watch("base_price"));
  const watchedStepRadius = Number(watch("step_radius"));
  const watchedStepPrice = Number(watch("step_price"));
  const watchedMaxRadius = Number(watch("max_radius"));

  const hasValidInputs =
    !isNaN(watchedFreeRadius) &&
    !isNaN(watchedBaseRadius) &&
    !isNaN(watchedBasePrice) &&
    !isNaN(watchedStepRadius) &&
    !isNaN(watchedStepPrice) &&
    !isNaN(watchedMaxRadius) &&
    watchedFreeRadius >= 0 &&
    watchedBaseRadius > 0 &&
    watchedFreeRadius < watchedBaseRadius &&
    watchedStepRadius > 0 &&
    watchedStepPrice >= 0 &&
    watchedBasePrice >= 0 &&
    watchedMaxRadius > watchedBaseRadius;

  // Live tier generator query
  const { data: liveTiers = [] } = useOngkirPreviewTiersQuery({
    free_radius: watchedFreeRadius,
    base_radius: watchedBaseRadius,
    base_price: watchedBasePrice,
    step_radius: watchedStepRadius,
    step_price: watchedStepPrice,
    max_radius: watchedMaxRadius,
    unit_symbol: unitSymbol,
  });

  // Hitung hasil simulasi tester
  const simulatedCalculation = useMemo(() => {
    if (!hasValidInputs) return null;
    const d = Number(testDistance);
    if (isNaN(d) || d < 0 || testDistance === "") return null;

    if (d > watchedMaxRadius) {
      return {
        deliverable: false,
        price: 0,
        label: "Di Luar Jangkauan",
        note: `Jarak ${d.toFixed(1)} ${unitSymbol} melebihi batas maksimal pengantaran (${watchedMaxRadius} ${unitSymbol}).`,
      };
    }

    if (d <= watchedFreeRadius) {
      return {
        deliverable: true,
        price: 0,
        isFree: true,
        label: "Gratis Ongkir",
        note: `Jarak ${d.toFixed(1)} ${unitSymbol} berada dalam radius gratis (≤ ${watchedFreeRadius} ${unitSymbol}).`,
      };
    }

    if (d <= watchedBaseRadius) {
      return {
        deliverable: true,
        price: watchedBasePrice,
        isFree: false,
        label: "Tarif Dasar",
        note: `Jarak ${d.toFixed(1)} ${unitSymbol} termasuk dalam cakupan radius dasar (> ${watchedFreeRadius} - ${watchedBaseRadius} ${unitSymbol}).`,
      };
    }

    const excess = d - watchedBaseRadius;
    const steps = Math.ceil(excess / watchedStepRadius);
    const price = watchedBasePrice + steps * watchedStepPrice;

    return {
      deliverable: true,
      price,
      isFree: false,
      label: `Tarif +${steps * watchedStepRadius} ${unitSymbol}`,
      note: `Dasar Rp ${watchedBasePrice.toLocaleString("id-ID")} + (${steps}x Rp ${watchedStepPrice.toLocaleString("id-ID")}) = Rp ${price.toLocaleString("id-ID")}`,
    };
  }, [
    testDistance,
    hasValidInputs,
    watchedFreeRadius,
    watchedBaseRadius,
    watchedBasePrice,
    watchedStepRadius,
    watchedStepPrice,
    watchedMaxRadius,
    unitSymbol,
  ]);

  useEffect(() => {
    if (!editingOngkir && nextCodeData?.code) {
      setValue("code_ongkir", nextCodeData.code, {
        shouldValidate: true,
        shouldDirty: false,
      });
    }
  }, [editingOngkir, nextCodeData?.code, setValue]);

  const handleEditOngkir = (item: OngkirItem) => {
    setEditingOngkir(item);
    reset({
      name_ongkir: item.name_ongkir,
      code_ongkir: item.code_ongkir,
      outlets_id: String(item.outlet_id || item.outlets_id),
      units_id: String(item.unit_id || item.units_id),
      free_radius: Number(item.free_radius),
      base_radius: Number(item.base_radius),
      base_price: Number(item.base_price),
      step_radius: Number(item.step_radius),
      step_price: Number(item.step_price),
      max_radius: Number(item.max_radius),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingOngkir(null);
    reset({
      name_ongkir: "",
      code_ongkir: nextCodeData?.code || "",
      outlets_id: "",
      units_id: "",
      free_radius: "" as any,
      base_radius: "" as any,
      base_price: "" as any,
      step_radius: "" as any,
      step_price: "" as any,
      max_radius: "" as any,
    });
  };

  const onSubmit = async (data: OngkirFormData) => {
    try {
      const isUsedByAnother =
        usedOutletMap.has(String(data.outlets_id)) &&
        (!editingOngkir ||
          (String(editingOngkir.outlets_id) !== String(data.outlets_id) &&
            String(editingOngkir.outlet_id) !== String(data.outlets_id)));

      if (isUsedByAnother) {
        toast.error("Outlet ini sudah memiliki aturan tarif ongkir aktif.");
        return;
      }

      const trimmedName = data.name_ongkir.trim();
      const trimmedCode = (data.code_ongkir || nextCodeData?.code || "")
        .trim()
        .toUpperCase();

      await saveOngkirMutation.mutateAsync({
        data: {
          name_ongkir: trimmedName,
          code_ongkir: trimmedCode,
          outlets_id: data.outlets_id,
          units_id: data.units_id,
          free_radius: Number(data.free_radius),
          base_radius: Number(data.base_radius),
          base_price: Number(data.base_price),
          step_radius: Number(data.step_radius),
          step_price: Number(data.step_price),
          max_radius: Number(data.max_radius),
        },
        editingId: editingOngkir ? editingOngkir.id : null,
      });

      toast.success(
        editingOngkir
          ? `Aturan tarif ongkir "${trimmedName}" berhasil diperbarui!`
          : `Aturan tarif ongkir "${trimmedName}" berhasil disimpan!`,
      );
      handleCancelEdit();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan master ongkir");
    }
  };

  const handleTriggerDelete = (item: OngkirItem) => {
    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Master Ongkir",
      description: `Apakah Anda yakin ingin menghapus aturan ongkir "${item.name_ongkir}" (${item.code_ongkir})?`,
      variant: "delete",
      confirmText: "Ya, Hapus Ongkir",
      onConfirm: async () => {
        try {
          await deleteOngkirMutation.mutateAsync(item.id);
          toast.success(
            `Master ongkir "${item.name_ongkir}" berhasil dihapus.`,
          );
        } catch (err: any) {
          toast.error(err.message || "Gagal menghapus ongkir");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Filtered dataset
  const filteredOngkirs = useMemo(() => {
    return ongkirs.filter((o) => {
      const q = debouncedSearch.trim().toLowerCase();
      if (!q) return true;

      const name = (o.name_ongkir || "").toLowerCase();
      const code = (o.code_ongkir || "").toLowerCase();
      const outletName = (o.outlet_name || "").toLowerCase();
      const unitName = (o.unit_name || "").toLowerCase();
      const unitSymbolStr = (o.unit_symbol || o.unit_code || "").toLowerCase();

      return (
        name.includes(q) ||
        code.includes(q) ||
        outletName.includes(q) ||
        unitName.includes(q) ||
        unitSymbolStr.includes(q)
      );
    });
  }, [ongkirs, debouncedSearch]);

  const columns = useMemo<ColumnDef<OngkirItem>[]>(
    () => [
      {
        accessorKey: "name_ongkir",
        header: "Nama Aturan Ongkir",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-xs">
                  {item.name_ongkir}
                </span>
                <Badge variant="primary">{item.code_ongkir}</Badge>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                {item.outlet_name && <span>Outlet: {item.outlet_name}</span>}
                {item.unit_name && (
                  <span className="text-slate-400">
                    • Satuan: {item.unit_symbol || item.unit_name}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "free_radius",
        header: "Radius Gratis",
        cell: ({ row }) => {
          const item = row.original;
          const freeKm = Number(item.free_radius || 0);
          const symbol = item.unit_symbol || item.unit_code || "km";
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ≤ {freeKm} {symbol} (Gratis)
            </span>
          );
        },
      },
      {
        accessorKey: "base_price",
        header: "Tarif Dasar",
        cell: ({ row }) => {
          const item = row.original;
          const baseKm = Number(item.base_radius || 0);
          const price = Number(item.base_price || 0);
          const symbol = item.unit_symbol || item.unit_code || "km";
          return (
            <div>
              <span className="font-bold text-slate-900 text-xs">
                Rp {price.toLocaleString("id-ID")}
              </span>
              <span className="text-[10px] text-slate-500 block">
                s/d {baseKm} {symbol}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "step_price",
        header: "Kelipatan Tambahan",
        cell: ({ row }) => {
          const item = row.original;
          const stepKm = Number(item.step_radius || 0);
          const stepPrice = Number(item.step_price || 0);
          const symbol = item.unit_symbol || item.unit_code || "km";
          return (
            <div>
              <span className="font-bold text-blue-600 text-xs">
                +Rp {stepPrice.toLocaleString("id-ID")}
              </span>
              <span className="text-[10px] text-slate-500 block">
                tiap +{stepKm} {symbol}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "max_radius",
        header: "Maks. Jangkauan",
        cell: ({ row }) => {
          const maxKm = Number(row.original.max_radius || 0);
          const symbol =
            row.original.unit_symbol || row.original.unit_code || "km";
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              {maxKm} {symbol}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleEditOngkir(item)}
                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Aturan Ongkir"
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleTriggerDelete(item)}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Hapus Aturan Ongkir"
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
            <span>Master Ongkir</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Master Ongkir
          </h1>
        </div>
      </div>

      {/* 2. Main Card Wrapper */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5 shadow-sm">
        {/* Form Konfigurasi Aturan */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 text-xs">
            <h2 className="text-sm font-bold text-slate-900">
              {editingOngkir ? (
                <span>
                  Mode Edit:{" "}
                  <strong className="text-blue-600">
                    {editingOngkir.name_ongkir}
                  </strong>{" "}
                  <span className="text-slate-500 font-mono text-[11px]">
                    ({editingOngkir.code_ongkir})
                  </span>
                </span>
              ) : (
                "Tambah Master Ongkir Baru"
              )}
            </h2>
            {editingOngkir && (
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
              {/* 1. Pilih Outlet */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Outlet Cabang <span className="text-rose-500">*</span>
                </label>
                <Controller
                  control={control}
                  name="outlets_id"
                  render={({ field }) => (
                    <Select
                      key={field.value || "empty"}
                      value={field.value || ""}
                      onValueChange={(val) => {
                        field.onChange(val);
                        const matched = outlets.find(
                          (o) => String(o.id) === val,
                        );
                        if (matched && !editingOngkir) {
                          setValue(
                            "name_ongkir",
                            `Ongkir Reguler ${matched.name_outlet}`,
                          );
                        }
                      }}
                    >
                      <SelectTrigger
                        clearable={Boolean(field.value)}
                        onClear={() => field.onChange("")}
                        className={cn(
                          "w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-800 h-[34px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-none",
                          errors.outlets_id
                            ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                            : "border-slate-300",
                        )}
                      >
                        <SelectValue placeholder="Pilih Outlet" />
                      </SelectTrigger>
                      <SelectContent>
                        {outlets.length === 0 ? (
                          <div className="py-2.5 px-3 text-center text-xs text-slate-400 italic select-none">
                            {isLoadingOutlets
                              ? "Memuat outlet..."
                              : "Belum ada master outlet"}
                          </div>
                        ) : (
                          outlets.map((o) => {
                            const isUsedByAnother =
                              usedOutletMap.has(String(o.id)) &&
                              (!editingOngkir ||
                                (String(editingOngkir.outlets_id) !==
                                  String(o.id) &&
                                  String(editingOngkir.outlet_id) !==
                                    String(o.id)));

                            return (
                              <SelectItem
                                key={o.id}
                                value={String(o.id)}
                                disabled={isUsedByAnother}
                              >
                                <span
                                  className={cn(
                                    isUsedByAnother
                                      ? "text-slate-400 line-through"
                                      : "",
                                  )}
                                >
                                  {o.name_outlet}
                                </span>
                                {isUsedByAnother && (
                                  <span className="ml-2 text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                                    Sudah Digunakan
                                  </span>
                                )}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.outlets_id && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.outlets_id.message}
                  </p>
                )}
              </div>

              {/* 2. Pilih Master Satuan */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Satuan Jarak <span className="text-rose-500">*</span>
                </label>
                <Controller
                  control={control}
                  name="units_id"
                  render={({ field }) => (
                    <Select
                      key={field.value || "empty"}
                      value={field.value || ""}
                      onValueChange={(val) => field.onChange(val)}
                    >
                      <SelectTrigger
                        clearable={Boolean(field.value)}
                        onClear={() => field.onChange("")}
                        className={cn(
                          "w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-800 h-[34px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-none",
                          errors.units_id
                            ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                            : "border-slate-300",
                        )}
                      >
                        <SelectValue placeholder="Pilih Satuan" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.length === 0 ? (
                          <div className="py-2.5 px-3 text-center text-xs text-slate-400 italic select-none">
                            {isLoadingUnits
                              ? "Memuat satuan..."
                              : "Belum ada master satuan"}
                          </div>
                        ) : (
                          units.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.name_unit}{" "}
                              {u.symbol ? `(${u.symbol})` : `(${u.code_unit})`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.units_id && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.units_id.message}
                  </p>
                )}
              </div>

              {/* 3. Nama Aturan Ongkir */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Nama Aturan Ongkir <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("name_ongkir")}
                  placeholder="Nama Aturan Ongkir"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                    errors.name_ongkir
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.name_ongkir && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.name_ongkir.message}
                  </p>
                )}
              </div>

              {/* 4. Kode Ongkir */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Kode <span className="text-rose-500">*</span>
                  {!editingOngkir && (
                    <span className="ml-1 text-[10px] text-blue-600 font-semibold">
                      (Auto)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  maxLength={3}
                  {...register("code_ongkir")}
                  placeholder="Kode"
                  readOnly={!editingOngkir}
                  className={cn(
                    "w-full h-[34px] border rounded-md px-3 py-2 text-xs font-mono font-bold uppercase transition-colors placeholder:text-slate-400",
                    !editingOngkir
                      ? "bg-slate-100/90 text-slate-700 cursor-not-allowed border-slate-300 select-none"
                      : "bg-white text-slate-900 border-slate-300 focus:outline-none focus:border-blue-500",
                    errors.code_ongkir
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "",
                  )}
                />
              </div>

              {/* 5. Radius Gratis */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Radius Gratis <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min={0}
                  {...register("free_radius")}
                  placeholder="Radius Gratis"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                    errors.free_radius
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.free_radius && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.free_radius.message}
                  </p>
                )}
              </div>

              {/* 6. Radius Dasar */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Radius Dasar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min={0.1}
                  {...register("base_radius")}
                  placeholder="Radius Dasar"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                    errors.base_radius
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.base_radius && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.base_radius.message}
                  </p>
                )}
              </div>

              {/* 7. Tarif Dasar */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Tarif Dasar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min={0}
                  {...register("base_price")}
                  placeholder="Tarif Dasar"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                    errors.base_price
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.base_price && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.base_price.message}
                  </p>
                )}
              </div>

              {/* 8. Kelipatan Jarak Tambahan */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Kelipatan Jarak <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min={0.1}
                  {...register("step_radius")}
                  placeholder="Kelipatan Jarak"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                    errors.step_radius
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.step_radius && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.step_radius.message}
                  </p>
                )}
              </div>

              {/* 9. Tarif Tambahan */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Tarif Tambahan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min={0}
                  {...register("step_price")}
                  placeholder="Tarif Tambahan"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                    errors.step_price
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.step_price && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.step_price.message}
                  </p>
                )}
              </div>

              {/* 10. Maksimal Jangkauan */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Maks. Jangkauan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min={1}
                  {...register("max_radius")}
                  placeholder="Maks. Jangkauan"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                    errors.max_radius
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.max_radius && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.max_radius.message}
                  </p>
                )}
              </div>
            </div>

            {/* Tombol Simpan & Batal */}
            <div className="pt-1 flex items-center gap-2">
              <Button
                type="submit"
                disabled={saveOngkirMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 h-[34px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {saveOngkirMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>{editingOngkir ? "Simpan Perubahan" : "Simpan"}</span>
                  </>
                )}
              </Button>
              {editingOngkir && (
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

        {/* 3. SIMULASI SEQUENCE TIER & TESTER JARAK */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* A. Live Tier Table Preview */}
          <div className="lg:col-span-2 bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Simulasi Sequence Tier
              </h3>
              <span className="text-[11px] text-slate-500">
                {liveTiers.length} Tier
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-2 px-2">Kode</th>
                    <th className="py-2 px-2">Cakupan Radius</th>
                    <th className="py-2 px-2">Tarif Pengiriman</th>
                    <th className="py-2 px-2">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {liveTiers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-6 text-center text-xs"
                      >
                        {watchedFreeRadius >= watchedBaseRadius &&
                        !isNaN(watchedFreeRadius) &&
                        !isNaN(watchedBaseRadius) &&
                        watchedBaseRadius > 0 ? (
                          <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded-md py-2 px-3 inline-block font-medium">
                            ⚠️ Radius gratis ({watchedFreeRadius} {unitSymbol}) tidak boleh lebih besar atau sama dengan radius dasar ({watchedBaseRadius} {unitSymbol}).
                          </div>
                        ) : watchedMaxRadius <= watchedBaseRadius &&
                          !isNaN(watchedMaxRadius) &&
                          !isNaN(watchedBaseRadius) &&
                          watchedBaseRadius > 0 ? (
                          <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded-md py-2 px-3 inline-block font-medium">
                            ⚠️ Maksimal jangkauan ({watchedMaxRadius} {unitSymbol}) harus lebih besar dari radius dasar ({watchedBaseRadius} {unitSymbol}).
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            Lengkapi form konfigurasi di atas untuk menampilkan simulasi urutan tier otomatis.
                          </span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    liveTiers.map((tier) => (
                      <tr
                        key={tier.code}
                        className={cn(
                          "hover:bg-white/80 transition-colors",
                          tier.is_free ? "bg-emerald-50/40" : "",
                        )}
                      >
                        <td className="py-2 px-2 font-mono font-bold text-slate-700">
                          {tier.code}
                        </td>
                        <td className="py-2 px-2 font-semibold text-slate-900">
                          {tier.is_free
                            ? `0.0 - ${tier.max_distance.toFixed(1)} ${tier.unit_symbol || unitSymbol}`
                            : `> ${tier.min_distance.toFixed(1)} - ${tier.max_distance.toFixed(1)} ${tier.unit_symbol || unitSymbol}`}
                        </td>
                        <td className="py-2 px-2">
                          {tier.is_free ? (
                            <span className="inline-flex items-center font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                              Gratis (Rp 0)
                            </span>
                          ) : (
                            <span className="font-bold text-slate-900">
                              Rp {tier.price.toLocaleString("id-ID")}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-[11px] text-slate-500">
                          {tier.label}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* B. Realtime Tester Widget */}
          <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-slate-800 font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-200">
                Uji Coba Jarak
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Jarak Pengantaran ({unitSymbol})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={testDistance}
                  onChange={(e) => setTestDistance(e.target.value)}
                  placeholder={`Jarak Pengantaran (${unitSymbol})`}
                  className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {simulatedCalculation ? (
                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Status:</span>
                    <span
                      className={cn(
                        "font-bold text-[11px] px-2 py-0.5 rounded",
                        simulatedCalculation.deliverable
                          ? simulatedCalculation.isFree
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                          : "bg-rose-100 text-rose-800",
                      )}
                    >
                      {simulatedCalculation.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-800">
                      Biaya Ongkir:
                    </span>
                    <span className="text-sm font-bold text-emerald-700">
                      {simulatedCalculation.deliverable
                        ? simulatedCalculation.isFree
                          ? "Gratis"
                          : `Rp ${simulatedCalculation.price.toLocaleString("id-ID")}`
                        : "Tidak Melayani"}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 italic pt-1">
                    {simulatedCalculation.note}
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-dashed border-slate-300 rounded-lg p-3 text-center text-xs text-slate-400 italic">
                  Masukkan jarak di atas untuk menghitung simulasi ongkir.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Toolbar Pencarian & Daftar Aturan Tersimpan */}
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
              placeholder="Cari nama aturan, outlet, kode..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredOngkirs}
          isLoading={isLoadingOngkirs}
          emptyMessage="Tidak ada data master ongkir yang ditemukan."
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
        isLoading={deleteOngkirMutation.isPending}
      />
    </div>
  );
};
