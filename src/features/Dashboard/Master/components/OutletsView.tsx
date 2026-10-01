"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Search, Edit3, Trash2, Save, Loader2, ExternalLink } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import { OutletItem } from "@/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, ConfirmVariant } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import {
  useOutletsQuery,
  useSaveOutletMutation,
  useDeleteOutletMutation,
} from "@/hooks/useMasterQuery";

const outletSchema = z.object({
  name_outlet: z.string().min(1, "Nama outlet wajib diisi"),
  address: z.string().min(1, "Alamat outlet wajib diisi"),
  latitude: z.coerce.number().refine((val) => !isNaN(val) && val !== 0, {
    message: "Latitude wajib diisi dengan angka valid",
  }),
  longitude: z.coerce.number().refine((val) => !isNaN(val) && val !== 0, {
    message: "Longitude wajib diisi dengan angka valid",
  }),
  phone: z.string().optional().nullable(),
});

type OutletFormData = z.infer<typeof outletSchema>;

export const OutletsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [isLocating, setIsLocating] = useState(false);

  const { data: outlets = [], isLoading } = useOutletsQuery();
  const saveOutletMutation = useSaveOutletMutation();
  const deleteOutletMutation = useDeleteOutletMutation();

  const [editingOutlet, setEditingOutlet] = useState<OutletItem | null>(null);

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
    formState: { errors },
  } = useForm<OutletFormData>({
    resolver: zodResolver(outletSchema) as any,
    defaultValues: {
      name_outlet: "",
      address: "",
      latitude: "" as any,
      longitude: "" as any,
      phone: "",
    },
  });

  const handleEditOutlet = (item: OutletItem) => {
    setEditingOutlet(item);
    reset({
      name_outlet: item.name_outlet,
      address: item.address,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      phone: item.phone || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingOutlet(null);
    reset({
      name_outlet: "",
      address: "",
      latitude: "" as any,
      longitude: "" as any,
      phone: "",
    });
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Browser Anda tidak mendukung deteksi lokasi (Geolocation).");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setValue("latitude", lat, { shouldValidate: true });
        setValue("longitude", lng, { shouldValidate: true });

        // Reverse Geocode
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            { headers: { "User-Agent": "AlmasLaundryWeb/1.0" } },
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.display_name) {
              setValue("address", data.display_name, { shouldValidate: true });
            }
          }
        } catch (_) {}

        setIsLocating(false);
        toast.success(
          `Koordinat GPS terdeteksi: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        );
      },
      (err) => {
        setIsLocating(false);
        toast.error(`Gagal mendeteksi lokasi: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onSubmit = async (data: OutletFormData) => {
    try {
      const trimmedName = data.name_outlet.trim();
      const trimmedAddress = data.address.trim();

      await saveOutletMutation.mutateAsync({
        data: {
          name_outlet: trimmedName,
          address: trimmedAddress,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          phone: data.phone ? data.phone.trim() : null,
        },
        editingId: editingOutlet ? editingOutlet.id : null,
      });

      toast.success(
        editingOutlet
          ? `Outlet "${trimmedName}" berhasil diperbarui!`
          : `Outlet "${trimmedName}" berhasil ditambahkan!`,
      );
      handleCancelEdit();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan master outlet");
    }
  };

  const handleTriggerDelete = (item: OutletItem) => {
    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Master Outlet",
      description: `Apakah Anda yakin ingin menghapus outlet "${item.name_outlet}"?`,
      variant: "delete",
      confirmText: "Ya, Hapus Outlet",
      onConfirm: async () => {
        try {
          await deleteOutletMutation.mutateAsync(item.id);
          toast.success(
            `Master outlet "${item.name_outlet}" berhasil dihapus.`,
          );
        } catch (err: any) {
          toast.error(err.message || "Gagal menghapus outlet");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const filteredOutlets = useMemo(() => {
    return outlets.filter((o) => {
      const q = debouncedSearch.trim().toLowerCase();
      if (!q) return true;
      const name = (o.name_outlet || "").toLowerCase();
      const addr = (o.address || "").toLowerCase();
      const ph = (o.phone || "").toLowerCase();
      return name.includes(q) || addr.includes(q) || ph.includes(q);
    });
  }, [outlets, debouncedSearch]);

  const columns = useMemo<ColumnDef<OutletItem>[]>(
    () => [
      {
        accessorKey: "name_outlet",
        header: "Nama Outlet",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div>
              <span className="font-bold text-slate-900 block">
                {item.name_outlet}
              </span>
              {item.phone && (
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {item.phone}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "address",
        header: "Alamat Lengkap",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="text-xs text-slate-700 line-clamp-2 max-w-sm">
              {item.address}
            </div>
          );
        },
      },
      {
        accessorKey: "latitude",
        header: "Titik Koordinat (GPS)",
        cell: ({ row }) => {
          const item = row.original;
          const lat = Number(item.latitude) || 0;
          const lng = Number(item.longitude) || 0;
          const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          return (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-700 font-semibold">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </span>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors inline-flex items-center"
                title="Buka di Google Maps"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const item = row.original;
          const isUsed = Boolean(
            item.is_used || (item.used_count && item.used_count > 0),
          );

          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleEditOutlet(item)}
                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Master Outlet"
              >
                <Edit3 size={15} />
              </button>
              {!isUsed && (
                <button
                  type="button"
                  onClick={() => handleTriggerDelete(item)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Hapus Master Outlet"
                >
                  <Trash2 size={15} />
                </button>
              )}
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
            <span>Master Outlet</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Master Outlet
          </h1>
        </div>
      </div>

      {/* 2. Main Card Wrapper */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5 shadow-sm">
        {/* Form Input Inline */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 text-xs">
            <h2 className="text-sm font-bold text-slate-900">
              {editingOutlet ? (
                <span>
                  Mode Edit:{" "}
                  <strong className="text-blue-600">
                    {editingOutlet.name_outlet}
                  </strong>
                </span>
              ) : (
                "Tambah Master Outlet Baru"
              )}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 hover:bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200 transition-colors cursor-pointer font-medium disabled:opacity-50"
              >
                {isLocating && <Loader2 size={13} className="animate-spin" />}
                <span>Deteksi GPS Saya</span>
              </button>
              {editingOutlet && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                >
                  Batalkan Edit
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-start">
              {/* 1. Nama Outlet */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Nama Outlet <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("name_outlet")}
                  placeholder="Nama Outlet"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                    errors.name_outlet
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.name_outlet && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.name_outlet.message}
                  </p>
                )}
              </div>

              {/* 2. Alamat Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Alamat Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("address")}
                  placeholder="Alamat Lengkap"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                    errors.address
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.address && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.address.message}
                  </p>
                )}
              </div>

              {/* 3. Latitude */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Latitude <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  {...register("latitude")}
                  placeholder="Latitude"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors font-mono",
                    errors.latitude
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.latitude && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.latitude.message}
                  </p>
                )}
              </div>

              {/* 4. Longitude */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Longitude <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  {...register("longitude")}
                  placeholder="Longitude"
                  className={cn(
                    "w-full h-[34px] bg-white border rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors font-mono",
                    errors.longitude
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                      : "border-slate-300 focus:border-blue-500",
                  )}
                />
                {errors.longitude && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.longitude.message}
                  </p>
                )}
              </div>

              {/* 5. No. Telepon */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  No. Telepon
                </label>
                <input
                  type="text"
                  {...register("phone")}
                  placeholder="No. Telepon"
                  className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Tombol Simpan & Batal */}
            <div className="pt-1 flex items-center gap-2">
              <Button
                type="submit"
                disabled={saveOutletMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 h-[34px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {saveOutletMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>{editingOutlet ? "Simpan Perubahan" : "Simpan"}</span>
                  </>
                )}
              </Button>
              {editingOutlet && (
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

        {/* Toolbar Pencarian */}
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
              placeholder="Cari nama outlet, alamat, no. telepon..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredOutlets}
          isLoading={isLoading}
          emptyMessage="Tidak ada data master outlet yang ditemukan."
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
        isLoading={deleteOutletMutation.isPending}
      />
    </div>
  );
};
