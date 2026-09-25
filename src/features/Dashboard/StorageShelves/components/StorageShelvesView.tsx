"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Search, Edit3, Trash2, Save, Loader2, Boxes } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import { StorageShelfItem, ShelfTypeItem } from "@/types";
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
  useStorageShelvesQuery,
  useSaveStorageShelfMutation,
  useDeleteStorageShelfMutation,
  useShelfTypesQuery,
  fetchNextShelfCode,
} from "@/hooks/useMasterQuery";
import { generateNextShelfCode, getNumericShelfTypeId } from "@/lib/shelfCode";
import { Crypto } from "@/lib/crypto";

const shelfSchema = z.object({
  name: z.string().min(1, "Jenis/Nama rak wajib dipilih"),
  code: z.string().min(1, "Kode rak wajib diisi"),
  capacity: z.coerce.number().min(0, "Kapasitas minimal 0"),
  location_notes: z.string().optional(),
  is_active: z.boolean().default(true),
});

type ShelfFormData = z.infer<typeof shelfSchema>;

export const StorageShelvesView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: shelves = [], isLoading: isLoadingShelves } =
    useStorageShelvesQuery();
  const { data: shelfTypes = [], isLoading: isLoadingTypes } =
    useShelfTypesQuery();

  const saveShelfMutation = useSaveStorageShelfMutation();
  const deleteShelfMutation = useDeleteStorageShelfMutation();

  const [editingShelf, setEditingShelf] = useState<StorageShelfItem | null>(
    null,
  );
  const [selectedTypeId, setSelectedTypeId] = useState<number | string>(1);

  // Helper untuk mendapatkan numeric ID dari jenis rak
  const getShelfTypeRawId = (st: ShelfTypeItem, idx: number): number => {
    return st.raw_id ?? Crypto.decryptId(st.id) ?? idx + 1;
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

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    clearErrors,
    formState: { errors },
  } = useForm<ShelfFormData>({
    resolver: zodResolver(shelfSchema) as any,
    mode: "onSubmit",
    defaultValues: {
      name: "",
      code: "",
      capacity: 0,
      location_notes: "",
      is_active: true,
    },
  });

  const currentFormName = watch("name");

  // Ketika nama jenis rak di form berubah, ambil kode sequence berikutnya dari database
  const handleShelfTypeChange = async (selectedName: string) => {
    setValue("name", selectedName, { shouldValidate: true });
    clearErrors("name");
    const matchedType = shelfTypes.find((st) => st.name === selectedName);
    if (matchedType) {
      const idx = shelfTypes.indexOf(matchedType);
      const rawId = getShelfTypeRawId(matchedType, idx);
      setSelectedTypeId(rawId);
      if (!editingShelf) {
        // Ambil nomor urut berikutnya dari server (menghitung seluruh data termasuk data terhapus)
        const serverCode = await fetchNextShelfCode(rawId);
        const fallbackCode = generateNextShelfCode(shelves, rawId);
        setValue("code", serverCode || fallbackCode);
      }
    } else {
      if (!editingShelf) {
        setValue("code", "");
      }
    }
  };

  const handleEditShelf = (shelf: StorageShelfItem) => {
    setEditingShelf(shelf);
    const matchedType = shelfTypes.find((st) => st.name === shelf.name);
    if (matchedType) {
      const idx = shelfTypes.indexOf(matchedType);
      setSelectedTypeId(getShelfTypeRawId(matchedType, idx));
    }
    reset({
      name: shelf.name,
      code: shelf.code,
      capacity: shelf.capacity ?? 0,
      location_notes: shelf.location_notes || "",
      is_active: Boolean(shelf.is_active),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingShelf(null);
    reset({
      name: "",
      code: "",
      capacity: 0,
      location_notes: "",
      is_active: true,
    });
  };

  const onSubmit = async (data: ShelfFormData) => {
    try {
      const finalCode = (
        data.code || (editingShelf ? editingShelf.code : "")
      ).trim();

      await saveShelfMutation.mutateAsync({
        data: {
          name: data.name.trim(),
          code: finalCode,
          capacity: isNaN(Number(data.capacity)) ? 0 : Number(data.capacity),
          location_notes: data.location_notes?.trim() || null,
          is_active: Boolean(data.is_active),
        },
        editingId: editingShelf ? editingShelf.id : null,
      });

      toast.success(
        editingShelf
          ? `Rak "${data.name}" (${finalCode}) berhasil diperbarui!`
          : `Rak "${data.name}" (${finalCode}) berhasil ditambahkan!`,
      );
      handleCancelEdit();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data rak penyimpanan");
    }
  };

  const handleTriggerDelete = (shelf: StorageShelfItem) => {
    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Rak Penyimpanan",
      description: `Apakah Anda yakin ingin menghapus master rak "${shelf.name}" (${shelf.code})?`,
      variant: "delete",
      confirmText: "Ya, Hapus Rak",
      onConfirm: async () => {
        try {
          await deleteShelfMutation.mutateAsync(shelf.id);
          toast.success(`Rak "${shelf.name}" berhasil dihapus.`);
        } catch (err: any) {
          toast.error(err.message || "Gagal menghapus rak");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Filtered dataset
  const filteredShelves = useMemo(() => {
    return shelves.filter((s) => {
      const q = debouncedSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.location_notes && s.location_notes.toLowerCase().includes(q));

      const matchType =
        typeFilter === "all" ||
        s.name.toLowerCase() === typeFilter.toLowerCase();

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && Boolean(s.is_active)) ||
        (statusFilter === "inactive" && !Boolean(s.is_active));

      return matchSearch && matchType && matchStatus;
    });
  }, [shelves, debouncedSearch, statusFilter, typeFilter]);

  const columns = useMemo<ColumnDef<StorageShelfItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Jenis & Lokasi Rak",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div>
              <div className="font-bold text-slate-900">
                {row.original.name}
              </div>
              <div className="text-[11px] text-slate-500 line-clamp-1">
                {row.original.location_notes || "-"}
              </div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "code",
        header: "Kode Rak",
        cell: ({ row }) => (
          <span className="text-xs font-mono font-bold text-slate-800">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: "capacity",
        header: "Kapasitas Maksimal",
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-slate-800">
            {row.original.capacity ?? 0} Slot
          </span>
        ),
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge variant="success">Siap Pakai</Badge>
          ) : (
            <Badge variant="danger">Penuh / Nonaktif</Badge>
          ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleEditShelf(s)}
                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Rak"
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleTriggerDelete(s)}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Hapus Rak"
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
            <span>Operasional</span>
            <span>/</span>
            <span>Rak Penyimpanan</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Rak Penyimpanan
          </h1>
        </div>
      </div>

      {/* 2. Main Card Wrapper */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5 shadow-sm">
        {/* Form Rak Input Inline */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 text-xs">
            <h2 className="text-sm font-bold text-slate-900">
              {editingShelf ? (
                <span>
                  Mode Edit:{" "}
                  <strong className="text-blue-600">{editingShelf.name}</strong>{" "}
                  <span className="text-slate-500 font-mono text-[11px]">
                    ({editingShelf.code})
                  </span>
                </span>
              ) : (
                "Tambah Rak Penyimpanan Baru"
              )}
            </h2>
            {editingShelf && (
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
              {/* 1. Nama / Jenis Rak (Dropdown dari Master Jenis Rak) */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Jenis Rak <span className="text-rose-500">*</span>
                </label>
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <Select
                      key={field.value || "empty"}
                      value={field.value || ""}
                      onValueChange={handleShelfTypeChange}
                    >
                      <SelectTrigger
                        clearable={Boolean(field.value)}
                        onClear={() => handleShelfTypeChange("")}
                        className={cn(
                          "w-full bg-white border rounded-md px-3 py-2 text-xs text-slate-800 h-[34px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-none",
                          errors.name
                            ? "border-rose-400 bg-rose-50/30"
                            : "border-slate-300",
                        )}
                      >
                        <SelectValue
                          placeholder={
                            shelfTypes.length === 0
                              ? "Tidak ada pilihan data"
                              : "Pilih Jenis Rak"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {shelfTypes.length === 0 ? (
                          <div className="py-2.5 px-3 text-center text-xs text-slate-400 italic select-none">
                            Tidak ada pilihan data
                          </div>
                        ) : (
                          shelfTypes.map((st) => (
                            <SelectItem key={st.id} value={st.name}>
                              {st.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.name && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* 2. Kode Rak (Auto-Generated & Readonly) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-900">
                    Kode Rak <span className="text-rose-500">*</span>
                  </label>
                </div>
                <input
                  type="text"
                  {...register("code")}
                  placeholder="Generated by System"
                  readOnly
                  tabIndex={-1}
                  className={cn(
                    "w-full h-[34px] bg-slate-100/90 border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-600 font-mono select-none cursor-not-allowed focus:outline-none placeholder:font-sans placeholder:text-slate-400",
                    errors.code && "border-rose-400 bg-rose-50/30",
                  )}
                />
                {errors.code && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errors.code.message}
                  </p>
                )}
              </div>

              {/* 3. Kapasitas */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Kapasitas
                </label>
                <input
                  type="number"
                  min="0"
                  {...register("capacity")}
                  placeholder="0"
                  className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* 4. Lokasi / Catatan */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Lokasi di Outlet
                </label>
                <input
                  type="text"
                  {...register("location_notes")}
                  placeholder="Lokasi di Outlet"
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
                        <SelectItem value="1">Siap Pakai</SelectItem>
                        <SelectItem value="0">Nonaktif / Penuh</SelectItem>
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
                disabled={saveShelfMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 h-[34px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {saveShelfMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>{editingShelf ? "Simpan Perubahan" : "Simpan"}</span>
                  </>
                )}
              </Button>
              {editingShelf && (
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
              placeholder="Cari nama rak, kode, lokasi..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Filter Jenis Rak */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600 font-bold">Jenis:</span>
              <Select
                key={typeFilter}
                value={typeFilter}
                onValueChange={setTypeFilter}
              >
                <SelectTrigger
                  clearable={typeFilter !== "all"}
                  onClear={() => setTypeFilter("all")}
                  className="w-[140px] h-8 rounded-lg bg-slate-50 border-slate-200 text-xs font-semibold text-slate-800"
                >
                  <SelectValue placeholder="Semua Jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  {shelfTypes.map((st) => (
                    <SelectItem key={st.id} value={st.name}>
                      {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Status */}
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
                  <SelectItem value="active">Siap Pakai</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredShelves}
          isLoading={isLoadingShelves}
          emptyMessage="Tidak ada data rak penyimpanan yang ditemukan."
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
        isLoading={deleteShelfMutation.isPending}
      />
    </div>
  );
};
