"use client";

import React, { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Search, Edit3, Trash2, Save, Loader2, CreditCard } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import { PaymentMethodItem } from "@/types";
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
  usePaymentMethodsQuery,
  useSavePaymentMethodMutation,
  useDeletePaymentMethodMutation,
} from "@/hooks/useMasterQuery";

const paymentSchema = z.object({
  name: z.string().min(1, "Nama metode pembayaran wajib diisi"),
  code: z.string().min(1, "Kode pembayaran wajib diisi"),
  type: z.string().default("cash"),
  account_number: z.string().optional(),
  account_name: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export const PaymentMethodsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: payments = [], isLoading } = usePaymentMethodsQuery();
  const savePaymentMutation = useSavePaymentMethodMutation();
  const deletePaymentMutation = useDeletePaymentMethodMutation();

  const [editingPayment, setEditingPayment] =
    useState<PaymentMethodItem | null>(null);

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
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      name: "",
      code: "",
      type: "cash",
      account_number: "",
      account_name: "",
      description: "",
      is_active: true,
    },
  });

  const handleEditPayment = (pm: PaymentMethodItem) => {
    setEditingPayment(pm);
    reset({
      name: pm.name,
      code: pm.code,
      type: pm.type || "cash",
      account_number: pm.account_number || "",
      account_name: pm.account_name || "",
      description: pm.description || "",
      is_active: Boolean(pm.is_active),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingPayment(null);
    reset({
      name: "",
      code: "",
      type: "cash",
      account_number: "",
      account_name: "",
      description: "",
      is_active: true,
    });
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      await savePaymentMutation.mutateAsync({
        data: {
          name: data.name.trim(),
          code: data.code.trim(),
          type: data.type,
          account_number: data.account_number?.trim() || null,
          account_name: data.account_name?.trim() || null,
          description: data.description?.trim() || null,
          is_active: Boolean(data.is_active),
        },
        editingId: editingPayment ? editingPayment.id : null,
      });

      toast.success(
        editingPayment
          ? `Metode "${data.name}" berhasil diperbarui!`
          : `Metode pembayaran "${data.name}" berhasil ditambahkan!`,
      );
      handleCancelEdit();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan master metode pembayaran");
    }
  };

  const handleTriggerDelete = (pm: PaymentMethodItem) => {
    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Metode Pembayaran",
      description: `Apakah Anda yakin ingin menghapus master metode pembayaran "${pm.name}" (${pm.code})?`,
      variant: "delete",
      confirmText: "Ya, Hapus Metode",
      onConfirm: async () => {
        try {
          await deletePaymentMutation.mutateAsync(pm.id);
          toast.success(`Metode pembayaran "${pm.name}" berhasil dihapus.`);
        } catch (err: any) {
          toast.error(err.message || "Gagal menghapus metode pembayaran");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Filtered dataset
  const filteredPayments = useMemo(() => {
    return payments.filter((pm) => {
      const q = debouncedSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        pm.name.toLowerCase().includes(q) ||
        pm.code.toLowerCase().includes(q) ||
        (pm.account_name && pm.account_name.toLowerCase().includes(q)) ||
        (pm.account_number && pm.account_number.toLowerCase().includes(q));

      const matchType = typeFilter === "all" || pm.type === typeFilter;

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && Boolean(pm.is_active)) ||
        (statusFilter === "inactive" && !Boolean(pm.is_active));

      return matchSearch && matchType && matchStatus;
    });
  }, [payments, debouncedSearch, typeFilter, statusFilter]);

  const columns = useMemo<ColumnDef<PaymentMethodItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Metode Pembayaran",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
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
        accessorKey: "type",
        header: "Tipe & Akun",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="primary">{row.original.type.toUpperCase()}</Badge>
            {row.original.account_number && (
              <span className="text-xs font-mono text-slate-700">
                {row.original.account_number} (
                {row.original.account_name || "-"})
              </span>
            )}
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
          const pm = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleEditPayment(pm)}
                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Metode"
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleTriggerDelete(pm)}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Hapus Metode"
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
            <span>Master Metode Pembayaran</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Master Metode Pembayaran
          </h1>
        </div>
      </div>

      {/* 2. Main Card Wrapper (Satu Card Utama dengan Form dan Tabel) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5 shadow-sm">
        {/* Form Pembayaran Input Inline */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 text-xs">
            <h2 className="text-sm font-bold text-slate-900">
              {editingPayment ? (
                <span>
                  Mode Edit:{" "}
                  <strong className="text-blue-600">
                    {editingPayment.name}
                  </strong>{" "}
                  <span className="text-slate-500 font-mono text-[11px]">
                    ({editingPayment.code})
                  </span>
                </span>
              ) : (
                "Tambah Master Metode Pembayaran Baru"
              )}
            </h2>
            {editingPayment && (
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
              {/* 1. Nama Metode */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Nama Metode <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("name")}
                  placeholder="Nama Metode"
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

              {/* 2. Kode */}
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

              {/* 3. Tipe Saluran */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Tipe Saluran
                </label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select
                      key={field.value || "empty"}
                      value={field.value || "cash"}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        clearable={Boolean(field.value)}
                        onClear={() => field.onChange("cash")}
                        className="w-full bg-white border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 h-[34px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-none"
                      >
                        <SelectValue placeholder="Tipe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Tunai (Cash)</SelectItem>
                        <SelectItem value="qris">QRIS Barcode</SelectItem>
                        <SelectItem value="bank_transfer">
                          Transfer Bank
                        </SelectItem>
                        <SelectItem value="edc">EDC / Debit</SelectItem>
                        <SelectItem value="ewallet">E-Wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* 4. Nomor Rekening */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Nomor Rekening / Merchant
                </label>
                <input
                  type="text"
                  {...register("account_number")}
                  placeholder="Nomor Rekening / Merchant"
                  className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-3 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* 5. Nama Pemilik */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Atas Nama
                </label>
                <input
                  type="text"
                  {...register("account_name")}
                  placeholder="Atas Nama"
                  className="w-full h-[34px] bg-white border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
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

            {/* Tombol Simpan & Batal */}
            <div className="pt-1 flex items-center gap-2">
              <Button
                type="submit"
                disabled={savePaymentMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 h-[34px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {savePaymentMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>
                      {editingPayment ? "Simpan Perubahan" : "Simpan"}
                    </span>
                  </>
                )}
              </Button>
              {editingPayment && (
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
              placeholder="Cari nama metode, nomor rekening..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600 font-bold">Tipe:</span>
              <Select
                key={typeFilter}
                value={typeFilter}
                onValueChange={setTypeFilter}
              >
                <SelectTrigger
                  clearable={typeFilter !== "all"}
                  onClear={() => setTypeFilter("all")}
                  className="w-[130px] h-8 rounded-lg bg-slate-50 border-slate-200 text-xs font-semibold text-slate-800"
                >
                  <SelectValue placeholder="Semua Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="cash">Tunai (Cash)</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                  <SelectItem value="bank_transfer">Transfer Bank</SelectItem>
                  <SelectItem value="edc">EDC Debit</SelectItem>
                  <SelectItem value="ewallet">E-Wallet</SelectItem>
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

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredPayments}
          isLoading={isLoading}
          emptyMessage="Tidak ada data master metode pembayaran yang ditemukan."
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
        isLoading={deletePaymentMutation.isPending}
      />
    </div>
  );
};
