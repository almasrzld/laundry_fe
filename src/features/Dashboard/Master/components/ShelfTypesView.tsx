"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Search, Edit3, Trash2, Save, Loader2, Layers } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import { ShelfTypeItem } from "@/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, ConfirmVariant } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import {
  useShelfTypesQuery,
  useSaveShelfTypeMutation,
  useDeleteShelfTypeMutation,
} from "@/hooks/useMasterQuery";
import {
  shelfTypeFormSchema,
  ShelfTypeFormSchema,
} from "@/schemas/shelfType.schema";
import { Crypto } from "@/lib/crypto";

export const ShelfTypesView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);

  const { data: shelfTypes = [], isLoading } = useShelfTypesQuery();
  const saveMutation = useSaveShelfTypeMutation();
  const deleteMutation = useDeleteShelfTypeMutation();

  const [editingItem, setEditingItem] = useState<ShelfTypeItem | null>(null);

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
    formState: { errors },
  } = useForm<ShelfTypeFormSchema>({
    resolver: zodResolver(shelfTypeFormSchema) as any,
    defaultValues: {
      name: "",
    },
  });

  const handleEdit = (item: ShelfTypeItem) => {
    setEditingItem(item);
    reset({
      name: item.name,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    reset({
      name: "",
    });
  };

  const onSubmit = async (data: ShelfTypeFormSchema) => {
    try {
      await saveMutation.mutateAsync({
        data: {
          name: data.name.trim(),
        },
        editingId: editingItem ? editingItem.id : null,
      });

      toast.success(
        editingItem
          ? `Jenis rak "${data.name}" berhasil diperbarui!`
          : `Jenis rak "${data.name}" berhasil ditambahkan!`,
      );
      handleCancelEdit();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan master jenis rak");
    }
  };

  const handleTriggerDelete = (item: ShelfTypeItem) => {
    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Jenis Rak",
      description: `Apakah Anda yakin ingin menghapus master jenis rak "${item.name}"?`,
      variant: "delete",
      confirmText: "Ya, Hapus Jenis Rak",
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(item.id);
          toast.success(`Jenis rak "${item.name}" berhasil dihapus.`);
        } catch (err: any) {
          toast.error(err.message || "Gagal menghapus jenis rak");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    return shelfTypes.filter((s) => {
      const q = debouncedSearch.trim().toLowerCase();
      return !q || s.name.toLowerCase().includes(q);
    });
  }, [shelfTypes, debouncedSearch]);

  const columns = useMemo<ColumnDef<ShelfTypeItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nama Jenis Rak",
        cell: ({ row }) => {
          const item = row.original;
          const rawId =
            item.raw_id ?? Crypto.decryptId(item.id) ?? row.index + 1;
          return (
            <div className="flex items-center gap-3">
              <div>
                <div>{item.name}</div>
              </div>
            </div>
          );
        },
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
                onClick={() => handleEdit(s)}
                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Jenis Rak"
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleTriggerDelete(s)}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Hapus Jenis Rak"
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
            <span>Master Jenis Rak</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Master Jenis Rak
          </h1>
        </div>
      </div>

      {/* 2. Main Card Wrapper */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5 shadow-sm">
        {/* Form Input Inline */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 text-xs">
            <h2 className="text-sm font-bold text-slate-900">
              {editingItem ? (
                <span>
                  Mode Edit:{" "}
                  <strong className="text-blue-600">{editingItem.name}</strong>
                </span>
              ) : (
                "Tambah Master Jenis Rak Baru"
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

          <form onSubmit={handleSubmit(onSubmit)} className="text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2.5">
              <div className="flex-1 w-full sm:max-w-md">
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Nama Jenis Rak <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("name")}
                  placeholder="Nama Jenis Rak"
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

              {/* Tombol Simpan & Batal di samping input */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 h-[34px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
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
                    className="px-3 h-[34px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors cursor-pointer"
                  >
                    Batal
                  </Button>
                )}
              </div>
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
              placeholder="Cari jenis rak..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
          emptyMessage="Tidak ada data master jenis rak yang ditemukan."
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
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
