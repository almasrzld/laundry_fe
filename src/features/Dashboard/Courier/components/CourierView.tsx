"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Truck,
  Users,
  Coins,
  Star,
  Search,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  Eye,
  Calendar,
  MapPin,
  Building2,
  Check,
  XCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import {
  useCouriersQuery,
  useCourierSummaryQuery,
  useCourierTasksQuery,
  useWithdrawalsQuery,
  useUpdateWithdrawalStatusMutation,
  CourierUser,
  WithdrawalRequest,
} from "@/hooks/useCourierQuery";
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
import { Order } from "@/types";

export const CourierView: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"couriers" | "tasks" | "withdrawals">(
    "couriers",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourierFilter, setSelectedCourierFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [selectedWithdrawalStatusFilter, setSelectedWithdrawalStatusFilter] =
    useState("all");

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
    variant: "create",
    onConfirm: async () => {},
  });

  const [rejectWithdrawalModal, setRejectWithdrawalModal] = useState<{
    isOpen: boolean;
    item: WithdrawalRequest | null;
    reason: string;
    error: string;
  }>({
    isOpen: false,
    item: null,
    reason: "",
    error: "",
  });

  const { data: summary, isLoading: isLoadingSummary } = useCourierSummaryQuery();
  const { data: couriers = [], isLoading: isLoadingCouriers } = useCouriersQuery();
  const { data: tasks = [], isLoading: isLoadingTasks } = useCourierTasksQuery();
  const { data: withdrawals = [], isLoading: isLoadingWithdrawals } =
    useWithdrawalsQuery();

  const updateWithdrawalStatusMutation = useUpdateWithdrawalStatusMutation();

  const pendingWithdrawalsCount = useMemo(() => {
    return withdrawals.filter((w) => w.status === "pending").length;
  }, [withdrawals]);

  // Filter couriers
  const filteredCouriers = useMemo(() => {
    return couriers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    });
  }, [couriers, searchQuery]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchCourier =
        selectedCourierFilter === "all" ||
        t.courier_name?.toLowerCase() === selectedCourierFilter.toLowerCase();

      if (!matchCourier) return false;

      if (selectedStatusFilter === "active") {
        const isCompleted =
          t.status?.toLowerCase().includes("selesai") ||
          t.status_code === "pesanan-selesai" ||
          t.status_code === "completed";
        if (isCompleted) return false;
      } else if (selectedStatusFilter === "completed") {
        const isCompleted =
          t.status?.toLowerCase().includes("selesai") ||
          t.status_code === "pesanan-selesai" ||
          t.status_code === "completed";
        if (!isCompleted) return false;
      }

      if (!q) return true;

      return (
        t.invoice_no?.toLowerCase().includes(q) ||
        (t.courier_name || "").toLowerCase().includes(q) ||
        (t.customer_name || t.user_name || "").toLowerCase().includes(q) ||
        (t.pickup_address || "").toLowerCase().includes(q) ||
        (t.service_name || "").toLowerCase().includes(q)
      );
    });
  }, [tasks, searchQuery, selectedCourierFilter, selectedStatusFilter]);

  // Filter withdrawals
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((w) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesStatus =
        selectedWithdrawalStatusFilter === "all" ||
        w.status === selectedWithdrawalStatusFilter;

      if (!matchesStatus) return false;
      if (!q) return true;

      return (
        w.user_name?.toLowerCase().includes(q) ||
        w.user_phone?.toLowerCase().includes(q) ||
        w.bank_name?.toLowerCase().includes(q) ||
        w.account_number?.toLowerCase().includes(q) ||
        w.account_name?.toLowerCase().includes(q)
      );
    });
  }, [withdrawals, searchQuery, selectedWithdrawalStatusFilter]);

  const handleTriggerApproveWithdrawal = (w: WithdrawalRequest) => {
    setConfirmDialog({
      isOpen: true,
      title: "Setujui Penarikan Dana",
      description: `Apakah Anda yakin ingin menyetujui transfer penarikan dana sebesar ${formatRupiah(w.amount)} ke rekening ${w.bank_name} ${w.account_number} (a/n ${w.account_name}) milik ${w.user_name}?`,
      variant: "create",
      confirmText: "Ya, Setujui & Selesai",
      onConfirm: async () => {
        try {
          await updateWithdrawalStatusMutation.mutateAsync({
            withdrawalId: w.id,
            status: "completed",
            adminNotes: "Transfer disetujui & diselesaikan oleh Admin",
          });
          toast.success(
            `Penarikan dana sebesar ${formatRupiah(w.amount)} untuk ${w.user_name} berhasil disetujui!`,
          );
        } catch (err: any) {
          toast.error(err.message || "Gagal menyetujui penarikan dana");
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleTriggerRejectWithdrawal = (w: WithdrawalRequest) => {
    setRejectWithdrawalModal({
      isOpen: true,
      item: w,
      reason: "",
      error: "",
    });
  };

  const handleConfirmRejectWithdrawal = async () => {
    if (!rejectWithdrawalModal.item) return;
    if (!rejectWithdrawalModal.reason.trim()) {
      setRejectWithdrawalModal((prev) => ({
        ...prev,
        error: "Keterangan / alasan penolakan wajib diisi agar kurir mengetahui penyebabnya.",
      }));
      return;
    }

    try {
      await updateWithdrawalStatusMutation.mutateAsync({
        withdrawalId: rejectWithdrawalModal.item.id,
        status: "rejected",
        adminNotes: rejectWithdrawalModal.reason.trim(),
      });
      toast.info(
        `Pengajuan penarikan dana untuk ${rejectWithdrawalModal.item.user_name} telah ditolak. Saldo telah dikembalikan ke akun kurir.`,
      );
      setRejectWithdrawalModal({ isOpen: false, item: null, reason: "", error: "" });
    } catch (err: any) {
      toast.error(err.message || "Gagal menolak penarikan dana");
    }
  };

  // Standard TanStack Table Columns: Couriers Tab
  const courierColumns = useMemo<ColumnDef<CourierUser>[]>(
    () => [
      {
        accessorKey: "name",
        id: "name",
        header: "Nama Staf Kurir",
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 font-bold flex items-center justify-center border border-sky-200 shrink-0">
                {c.name ? c.name[0].toUpperCase() : "K"}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs">{c.name}</div>
                <div className="text-[11px] text-slate-400">{c.email}</div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "phone",
        header: "Kontak",
        cell: ({ row }) => {
          const phone = row.original.phone;
          if (!phone) return <span className="text-slate-400 font-medium">-</span>;
          return (
            <div className="flex items-center gap-2">
              <Phone size={12} className="text-slate-400 shrink-0" />
              <span className="font-medium text-slate-700 text-xs">{phone}</span>
              <a
                href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                title="Chat WhatsApp"
              >
                <MessageCircle size={13} />
              </a>
            </div>
          );
        },
      },
      {
        accessorKey: "total_orders",
        header: () => <div className="text-center">Total Tugas</div>,
        cell: ({ row }) => (
          <div className="text-center font-bold text-slate-800 text-xs">
            {row.original.total_orders}
          </div>
        ),
      },
      {
        accessorKey: "completed_orders",
        header: () => <div className="text-center">Selesai</div>,
        cell: ({ row }) => (
          <div className="text-center font-bold text-emerald-600 text-xs">
            {row.original.completed_orders}
          </div>
        ),
      },
      {
        accessorKey: "total_tips",
        header: "Total Tips Diterima",
        cell: ({ row }) => (
          <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
            {formatRupiah(row.original.total_tips || 0)}
          </span>
        ),
      },
      {
        accessorKey: "average_rating",
        header: "Rating Pelanggan",
        cell: ({ row }) => {
          const rating = row.original.average_rating;
          if (!rating || rating <= 0) {
            return <span className="text-slate-400 font-medium">-</span>;
          }
          return (
            <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs">
              <Star size={13} className="fill-amber-400 text-amber-400 shrink-0" />
              <span>{rating} / 5.0</span>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedCourierFilter(c.name);
                  setActiveTab("tasks");
                }}
                className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                title="Lihat Daftar Tugas Kurir Ini"
              >
                <Eye size={15} />
              </button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [],
  );

  // Standard TanStack Table Columns: Delivery Tasks Tab
  const taskColumns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        accessorKey: "order_date",
        header: "Tanggal & Nota",
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div>
              <div className="font-mono font-bold text-sky-700 text-xs">
                {t.invoice_no}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                <Calendar size={11} />
                <span>{formatDate(t.order_date)}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "courier_name",
        header: "Kurir Bertugas",
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div>
              <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Truck size={13} className="text-sky-600 shrink-0" />
                <span>{t.courier_name}</span>
              </div>
              {t.courier_phone && (
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {t.courier_phone}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "customer_address",
        header: "Pelanggan & Alamat",
        cell: ({ row }) => {
          const t = row.original;
          const custName = t.customer_name || t.user_name;
          const custPhone = t.customer_phone || t.user_phone;
          const address = t.pickup_address || t.delivery_address;
          return (
            <div className="max-w-[200px]">
              <div className="font-bold text-slate-900 text-xs truncate">
                {custName || "-"}
              </div>
              {custPhone && (
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {custPhone}
                </div>
              )}
              {address && (
                <div
                  className="text-[11px] text-slate-400 flex items-start gap-1 mt-0.5 line-clamp-1"
                  title={address}
                >
                  <MapPin size={11} className="shrink-0 mt-0.5 text-slate-400" />
                  <span className="truncate">{address}</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "service_name",
        header: "Layanan & Qty",
        cell: ({ row }) => {
          const t = row.original;
          return (
            <div>
              <div className="font-semibold text-slate-800 text-xs">
                {t.service_name}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {t.quantity} {t.unit}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status Pengerjaan",
        cell: ({ row }) => {
          const t = row.original;
          return (
            <Badge variant={(t.status_badge_variant as any) || "info"}>
              {t.status_name || t.status}
            </Badge>
          );
        },
      },
      {
        accessorKey: "tip_amount",
        header: "Tips Pelanggan",
        cell: ({ row }) => {
          const tip = row.original.tip_amount;
          if (!tip || tip <= 0) {
            return <span className="text-slate-400 font-medium text-xs">-</span>;
          }
          return (
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-xs">
              {formatRupiah(tip)}
            </span>
          );
        },
      },
      {
        accessorKey: "rating",
        header: "Rating & Ulasan",
        cell: ({ row }) => {
          const t = row.original;
          if (!t.rating) {
            return <span className="text-slate-400 font-medium text-xs">-</span>;
          }
          return (
            <div>
              <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span>{t.rating} / 5</span>
              </div>
              {t.review && (
                <div
                  className="text-[10px] text-slate-600 italic line-clamp-1 mt-0.5 max-w-[140px]"
                  title={t.review}
                >
                  &ldquo;{t.review}&rdquo;
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
          const task = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() =>
                  router.push(`/courier/${encodeURIComponent(task.id)}/detail`)
                }
                className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                title="Lihat Detail Tugas Kurir"
              >
                <Eye size={15} />
              </button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [router],
  );

  // Standard TanStack Table Columns: Withdrawals Tab
  const withdrawalColumns = useMemo<ColumnDef<WithdrawalRequest>[]>(
    () => [
      {
        accessorKey: "created_at",
        header: "Waktu Pengajuan",
        cell: ({ row }) => {
          const w = row.original;
          return (
            <div>
              <div className="font-semibold text-slate-800 text-xs whitespace-nowrap">
                {formatDate(w.created_at)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                ID: #{w.id_withdrawal_requests || w.id}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "user_name",
        header: "Pemohon (Kurir)",
        cell: ({ row }) => {
          const w = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-300 text-sky-800 font-bold flex items-center justify-center text-xs shrink-0">
                {w.user_name ? w.user_name[0].toUpperCase() : "U"}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs">
                  {w.user_name}
                </div>
                <div className="text-[11px] text-slate-500">
                  {w.user_phone || w.user_email}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "amount",
        header: "Nominal Penarikan",
        cell: ({ row }) => {
          const w = row.original;
          return (
            <div className="font-bold text-slate-900 text-xs">
              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {formatRupiah(w.amount)}
              </span>
            </div>
          );
        },
      },
      {
        id: "bank_info",
        header: "Rekening / E-Wallet Tujuan",
        cell: ({ row }) => {
          const w = row.original;
          return (
            <div>
              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Building2 size={13} className="text-sky-600 shrink-0" />
                <span>{w.bank_name}</span>
                <span className="font-mono text-slate-600">
                  - {w.account_number}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                a/n <strong className="text-slate-700">{w.account_name}</strong>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          if (status === "completed") {
            return (
              <Badge variant="success" className="whitespace-nowrap">
                Selesai Ditransfer
              </Badge>
            );
          }
          if (status === "rejected") {
            return (
              <Badge variant="destructive" className="whitespace-nowrap">
                Ditolak
              </Badge>
            );
          }
          return (
            <Badge variant="warning" className="whitespace-nowrap animate-pulse">
              Menunggu Verifikasi
            </Badge>
          );
        },
      },
      {
        accessorKey: "admin_notes",
        header: "Catatan & Verifikator",
        cell: ({ row }) => {
          const w = row.original;
          return (
            <div className="max-w-[200px] text-xs">
              {w.admin_notes ? (
                <div className="text-slate-700 italic line-clamp-2">
                  &ldquo;{w.admin_notes}&rdquo;
                </div>
              ) : (
                <span className="text-slate-400">-</span>
              )}
              {w.processor_name && (
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Diproses: {w.processor_name}
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
          const w = row.original;
          if (w.status !== "pending") {
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
                onClick={() => handleTriggerApproveWithdrawal(w)}
                title="Setujui & Tandai Selesai Ditransfer"
                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-emerald-200"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleTriggerRejectWithdrawal(w)}
                title="Tolak Pengajuan & Kembalikan Saldo"
                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-200"
              >
                <XCircle size={14} />
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
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
            <span>Operasional Laundry</span>
            <span>/</span>
            <span>Manajemen Kurir, Tips & Penarikan Dana</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Truck size={20} />
            </div>
            <span>Manajemen Kurir & Penarikan Dana (WD)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pantau penugasan penjemputan/pengantaran cucian, performa kurir,
            akumulasi tips riil, serta persetujuan transfer penarikan dana kurir.
          </p>
        </div>
      </div>

      {/* 2. 4 Kartu Metrik Riil */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Kurir */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
            <Users size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Total Kurir Bertugas
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {isLoadingSummary ? "..." : summary?.total_couriers ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Staf kurir terdaftar
            </div>
          </div>
        </div>

        {/* Card 2: Pengantaran Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Tugas Berjalan
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {isLoadingSummary ? "..." : summary?.active_deliveries ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Dalam proses antar / jemput
            </div>
          </div>
        </div>

        {/* Card 3: Pengantaran Selesai */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Pengantaran Selesai
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {isLoadingSummary ? "..." : summary?.completed_deliveries ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Total pesanan diantar sukses
            </div>
          </div>
        </div>

        {/* Card 4: Total Tips Terkumpul */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Coins size={24} />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Total Tips dari Pelanggan
            </div>
            <div className="text-xl font-bold text-indigo-700 mt-0.5">
              {isLoadingSummary
                ? "..."
                : formatRupiah(summary?.total_tips || 0)}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
              <Star size={12} className="text-amber-500 fill-amber-500" />
              <span className="font-semibold text-slate-700">
                {summary?.average_rating
                  ? `${summary.average_rating} / 5.0`
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar Standar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === "couriers"
                ? "Cari nama, email, telepon kurir..."
                : activeTab === "tasks"
                  ? "Cari invoice, pelanggan, kurir, alamat..."
                  : "Cari nama kurir, bank, no. rekening..."
            }
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white transition-colors"
          />
        </div>

        {/* Dropdown Filters Standar (Radix UI Select) */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {activeTab === "tasks" && (
            <>
              {/* Filter Kurir */}
              <div className="w-full sm:w-44">
                <Select
                  value={selectedCourierFilter}
                  onValueChange={setSelectedCourierFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Kurir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kurir</SelectItem>
                    {couriers.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Status Tasks */}
              <div className="w-full sm:w-36">
                <Select
                  value={selectedStatusFilter}
                  onValueChange={setSelectedStatusFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status Tugas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="active">Tugas Berjalan</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {activeTab === "withdrawals" && (
            <div className="w-full sm:w-44">
              <Select
                value={selectedWithdrawalStatusFilter}
                onValueChange={setSelectedWithdrawalStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status Penarikan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Menunggu Verifikasi</SelectItem>
                  <SelectItem value="completed">Selesai Ditransfer</SelectItem>
                  <SelectItem value="rejected">Ditolak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tab Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("couriers")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "couriers"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Kurir & Tips ({couriers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "tasks"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tugas Antar-Jemput ({tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("withdrawals")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "withdrawals"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Penarikan Dana (WD)</span>
              {pendingWithdrawalsCount > 0 ? (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold animate-pulse">
                  {pendingWithdrawalsCount}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  ({withdrawals.length})
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4. TanStack DataTable Standar */}
      {activeTab === "couriers" ? (
        <DataTable
          key="couriers-table"
          columns={courierColumns}
          data={filteredCouriers}
          isLoading={isLoadingCouriers}
          emptyMessage="Tidak ada staf kurir yang sesuai dengan pencarian."
          pageSize={10}
        />
      ) : activeTab === "tasks" ? (
        <DataTable
          key="tasks-table"
          columns={taskColumns}
          data={filteredTasks}
          isLoading={isLoadingTasks}
          emptyMessage="Tidak ada tugas antar-jemput yang sesuai dengan filter atau pencarian."
          pageSize={10}
          defaultSorting={[{ id: "order_date", desc: true }]}
        />
      ) : (
        <DataTable
          key="withdrawals-table"
          columns={withdrawalColumns}
          data={filteredWithdrawals}
          isLoading={isLoadingWithdrawals}
          emptyMessage="Tidak ada riwayat pengajuan penarikan dana."
          pageSize={10}
          defaultSorting={[{ id: "created_at", desc: true }]}
        />
      )}

      {/* Standard Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        isLoading={updateWithdrawalStatusMutation.isPending}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Modal Tolak Penarikan Dana (Wajib Alasan) */}
      {rejectWithdrawalModal.isOpen && rejectWithdrawalModal.item && (
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
                    Tolak Penarikan Dana Kurir
                  </h3>
                  <p className="text-xs text-rose-700 font-medium mt-0.5">
                    {rejectWithdrawalModal.item.user_name} • {formatRupiah(rejectWithdrawalModal.item.amount)} ({rejectWithdrawalModal.item.bank_name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectWithdrawalModal({ isOpen: false, item: null, reason: "", error: "" })}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">
                  Pemberitahuan kepada Kurir:
                </p>
                <p>
                  Saldo sebesar {formatRupiah(rejectWithdrawalModal.item.amount)} akan otomatis dikembalikan ke dompet LaundryPay kurir, dan keterangan penolakan ini akan dikirimkan langsung ke notifikasi aplikasi kurir.
                </p>
              </div>

              {/* Opsi Alasan Cepat */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Alasan Cepat:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Nomor rekening bank tidak valid / tidak ditemukan",
                    "Nama pemilik rekening tidak sesuai akun kurir",
                    "Saldo dompet kurir belum mencukupi ketentuan",
                    "Gangguan jaringan transfer bank tujuan",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectWithdrawalModal((prev) => ({ ...prev, reason: preset, error: "" }))}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-left ${
                        rejectWithdrawalModal.reason === preset
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
                  value={rejectWithdrawalModal.reason}
                  onChange={(e) =>
                    setRejectWithdrawalModal((prev) => ({
                      ...prev,
                      reason: e.target.value,
                      error: e.target.value.trim() ? "" : prev.error,
                    }))
                  }
                  placeholder="Tuliskan alasan penolakan penarikan dana..."
                  className={`w-full text-xs rounded-xl border p-3 focus:outline-hidden focus:ring-2 transition-all ${
                    rejectWithdrawalModal.error
                      ? "border-rose-300 focus:ring-rose-400 bg-rose-50/30"
                      : "border-slate-300 focus:ring-sky-500 focus:border-sky-500 bg-white"
                  }`}
                />
                {rejectWithdrawalModal.error && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {rejectWithdrawalModal.error}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={updateWithdrawalStatusMutation.isPending}
                onClick={() => setRejectWithdrawalModal({ isOpen: false, item: null, reason: "", error: "" })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={updateWithdrawalStatusMutation.isPending}
                onClick={handleConfirmRejectWithdrawal}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                {updateWithdrawalStatusMutation.isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    <span>Tolak & Kembalikan Saldo</span>
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
