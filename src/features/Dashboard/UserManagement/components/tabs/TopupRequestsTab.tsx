"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Wallet,
  Search,
  Check,
  XCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  CreditCard,
  Building2,
  Eye,
  FileImage,
  ExternalLink,
  X,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import {
  useTopupRequestsQuery,
  useUpdateTopupStatusMutation,
  TopupRequest,
} from "@/hooks/useUserManagementQuery";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Badge } from "@/components/Badge";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog, ConfirmVariant } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { appConfig } from "@/config/app.config";

export const TopupRequestsTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProof, setSelectedProof] = useState<{
    url: string;
    title: string;
    details?: string;
    date?: string;
  } | null>(null);

  const { data: topups = [], isLoading } = useTopupRequestsQuery(
    statusFilter,
    searchQuery
  );
  const updateStatusMutation = useUpdateTopupStatusMutation();

  const getImageUrl = (path?: string | null) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const base = appConfig.backendUrl || "http://localhost:5000";
    return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: ConfirmVariant;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "Ya, Lanjutkan",
    variant: "create",
    onConfirm: async () => {},
  });

  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    item: TopupRequest | null;
    reason: string;
    error: string;
  }>({
    isOpen: false,
    item: null,
    reason: "",
    error: "",
  });

  const handleTriggerApprove = (t: TopupRequest) => {
    setConfirmDialog({
      isOpen: true,
      title: "Setujui Pengajuan Top-Up Saldo?",
      description: `Apakah Anda yakin ingin menyetujui pengisian saldo sebesar ${formatRupiah(
        t.amount
      )} untuk akun ${t.user_name} via ${t.payment_method}? Saldo LaundryPay pengguna akan langsung ditambahkan.`,
      confirmText: "Setujui & Tambah Saldo",
      variant: "create",
      onConfirm: async () => {
        try {
          await updateStatusMutation.mutateAsync({
            id: t.id,
            status: "completed",
            adminNotes: `Pengisian saldo via ${t.payment_method} disetujui`,
          });
          toast.success(
            `Pengajuan top-up ${formatRupiah(t.amount)} untuk ${t.user_name} berhasil disetujui!`
          );
        } catch (e: any) {
          toast.error(e.message || "Gagal menyetujui top-up");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleTriggerReject = (t: TopupRequest) => {
    setRejectModal({
      isOpen: true,
      item: t,
      reason: "",
      error: "",
    });
  };

  const handleConfirmReject = async () => {
    if (!rejectModal.item) return;
    if (!rejectModal.reason.trim()) {
      setRejectModal((prev) => ({
        ...prev,
        error: "Keterangan / alasan penolakan wajib diisi agar pelanggan mengetahui penyebabnya.",
      }));
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        id: rejectModal.item.id,
        status: "rejected",
        adminNotes: rejectModal.reason.trim(),
      });
      toast.success(`Pengajuan top-up dari ${rejectModal.item.user_name} telah ditolak`);
      setRejectModal({ isOpen: false, item: null, reason: "", error: "" });
    } catch (e: any) {
      toast.error(e.message || "Gagal menolak top-up");
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = topups.length;
    const pending = topups.filter((t) => t.status === "pending").length;
    const completed = topups.filter((t) => t.status === "completed").length;
    const pendingAmount = topups
      .filter((t) => t.status === "pending")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return { total, pending, completed, pendingAmount };
  }, [topups]);

  // Table columns
  const columns = useMemo<ColumnDef<TopupRequest>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: "Waktu Pengajuan",
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div>
              <div className="font-semibold text-slate-800 text-xs">
                {formatDate(t.created_at)}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                ID: #{t.id_topup_requests || t.id}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "user_name",
        header: "Pelanggan",
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div>
              <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                <User size={12} className="text-slate-400" />
                <span>{t.user_name}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {t.user_phone} • {t.user_email}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "payment_method",
        header: "Metode Pembayaran",
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
              <CreditCard size={13} className="text-sky-600 shrink-0" />
              <span>{t.payment_method}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "amount",
        header: "Nominal Top-Up",
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div>
              <div className="font-bold text-sky-700 text-xs">
                {formatRupiah(t.amount)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Saldo Saat Ini: {formatRupiah(t.laundry_pay_balance || 0)}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "proof_image",
        header: "Bukti Transfer",
        cell: ({ row }) => {
          const t = row.original;
          if (!t.proof_image) {
            return (
              <span className="text-slate-400 text-xs italic">Tanpa bukti</span>
            );
          }
          const fullUrl = getImageUrl(t.proof_image);
          return (
            <button
              type="button"
              onClick={() =>
                setSelectedProof({
                  url: fullUrl,
                  title: `Bukti Top-Up - ${t.user_name}`,
                  details: `${t.payment_method} • ${formatRupiah(t.amount)}`,
                  date: formatDate(t.created_at),
                })
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 hover:text-sky-800 border border-sky-200 rounded-lg transition-colors cursor-pointer"
            >
              <Eye size={13} />
              <span>Lihat Bukti</span>
            </button>
          );
        },
      },
      {
        accessorKey: "notes",
        header: "Catatan User",
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="max-w-[180px] text-xs text-slate-600 italic line-clamp-2">
              {t.notes ? `“${t.notes}”` : "-"}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          if (status === "pending") {
            return (
              <Badge variant="warning" className="flex items-center gap-1 w-fit">
                <Clock size={11} />
                <span>Menunggu Verifikasi</span>
              </Badge>
            );
          }
          if (status === "completed") {
            return (
              <Badge variant="success" className="flex items-center gap-1 w-fit">
                <CheckCircle2 size={11} />
                <span>Disetujui & Masuk</span>
              </Badge>
            );
          }
          return (
            <Badge variant="danger" className="flex items-center gap-1 w-fit">
              <AlertTriangle size={11} />
              <span>Ditolak</span>
            </Badge>
          );
        },
      },
      {
        accessorKey: "admin_notes",
        header: "Verifikator & Catatan",
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div className="max-w-[200px] text-xs">
              {t.admin_notes ? (
                <div className="text-slate-700 italic line-clamp-2">
                  &ldquo;{t.admin_notes}&rdquo;
                </div>
              ) : (
                <span className="text-slate-400">-</span>
              )}
              {t.processor_name && (
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Diproses: {t.processor_name}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const t = row.original;
          if (t.status !== "pending") {
            return (
              <div className="text-right text-[11px] text-slate-400 font-medium">
                Tuntas
              </div>
            );
          }
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => handleTriggerApprove(t)}
                title="Setujui & Tambahkan Saldo"
                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-emerald-200"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleTriggerReject(t)}
                title="Tolak Pengajuan Top-Up"
                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-200"
              >
                <XCircle size={14} />
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      {/* 1. Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Wallet size={18} />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Total Pengajuan</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{stats.total}</div>
          </div>
        </div>

        <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <div className="text-[11px] font-medium text-amber-800">Menunggu Verifikasi</div>
            <div className="text-lg font-bold text-amber-900 mt-0.5">{stats.pending}</div>
          </div>
        </div>

        <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-[11px] font-medium text-emerald-800">Disetujui</div>
            <div className="text-lg font-bold text-emerald-900 mt-0.5">{stats.completed}</div>
          </div>
        </div>

        <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Building2 size={18} />
          </div>
          <div>
            <div className="text-[11px] font-medium text-indigo-800">Nominal Pending</div>
            <div className="text-sm font-bold text-indigo-900 mt-0.5">
              {formatRupiah(stats.pendingAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/60 p-3 rounded-xl border border-slate-200">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, email, no HP, catatan..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-600 transition-colors"
          />
        </div>

        <div className="w-full sm:w-44 shrink-0">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8.5 rounded-xl bg-white border-slate-200 text-xs font-medium">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Menunggu Verifikasi</SelectItem>
              <SelectItem value="completed">Disetujui</SelectItem>
              <SelectItem value="rejected">Ditolak</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <DataTable columns={columns} data={topups} isLoading={isLoading} />
      </div>

      {/* 4. Standard Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        isLoading={updateStatusMutation.isPending}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* 5. Proof Image Preview Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
                  <FileImage size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {selectedProof.title}
                  </h3>
                  {selectedProof.details && (
                    <p className="text-[11px] text-slate-500">
                      {selectedProof.details} {selectedProof.date ? `• ${selectedProof.date}` : ""}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-900/5 min-h-[320px]">
              <img
                src={selectedProof.url}
                alt="Bukti Transfer Top-Up"
                className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-xs border border-slate-200 bg-white"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://placehold.co/600x400/f1f5f9/475569?text=Gagal+Memuat+Gambar+Bukti";
                }}
              />
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <a
                href={selectedProof.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 px-3 py-1.5 rounded-lg hover:bg-sky-50 transition-colors"
              >
                <ExternalLink size={13} />
                <span>Buka Gambar Asli</span>
              </a>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Tolak Pengajuan Top-Up (Wajib Alasan) */}
      {rejectModal.isOpen && rejectModal.item && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 bg-rose-50/70 border-b border-rose-100 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tolak Pengajuan Top-Up Saldo
                  </h3>
                  <p className="text-xs text-rose-700 font-medium mt-0.5">
                    {rejectModal.item.user_name} • {formatRupiah(rejectModal.item.amount)} via {rejectModal.item.payment_method}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModal({ isOpen: false, item: null, reason: "", error: "" })}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">
                  Pemberitahuan kepada Pengguna:
                </p>
                <p>
                  Keterangan penolakan yang Anda tulis akan dikirimkan langsung ke aplikasi mobile pelanggan agar mereka mengetahui alasannya.
                </p>
              </div>

              {/* Opsi Alasan Cepat */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Alasan Cepat:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Bukti transfer tidak valid / tidak terbaca",
                    "Nominal transfer tidak sesuai dengan pengajuan",
                    "Nama / nomor rekening pengirim tidak cocok",
                    "Mutasi dana belum masuk ke rekening kas",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectModal((prev) => ({ ...prev, reason: preset, error: "" }))}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-left ${
                        rejectModal.reason === preset
                          ? "bg-rose-50 border-rose-300 text-rose-700 font-semibold"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea Alasan */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Keterangan / Alasan Penolakan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectModal.reason}
                  onChange={(e) =>
                    setRejectModal((prev) => ({
                      ...prev,
                      reason: e.target.value,
                      error: e.target.value.trim() ? "" : prev.error,
                    }))
                  }
                  placeholder="Tuliskan alasan penolakan secara jelas..."
                  className={`w-full text-xs rounded-xl border p-3 focus:outline-hidden focus:ring-2 transition-all ${
                    rejectModal.error
                      ? "border-rose-300 focus:ring-rose-400 bg-rose-50/30"
                      : "border-slate-300 focus:ring-sky-500 focus:border-sky-500 bg-white"
                  }`}
                />
                {rejectModal.error && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {rejectModal.error}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={updateStatusMutation.isPending}
                onClick={() => setRejectModal({ isOpen: false, item: null, reason: "", error: "" })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={updateStatusMutation.isPending}
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    <span>Tolak Pengajuan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

