"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  ShoppingBag,
  Truck,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  CreditCard,
  AlertTriangle,
  Gift,
  Wallet,
  Banknote,
  Search,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  useNotificationsQuery,
  useUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  NotificationItem,
} from "@/hooks/useNotificationQuery";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/utils";

function formatFullDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch (_) {
    return dateStr;
  }
}

function formatTimeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return "Baru saja";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} hari lalu`;
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch (_) {
    return "Baru saja";
  }
}

function getNotificationMeta(type: string) {
  switch (type) {
    case "order_created":
      return {
        icon: ShoppingBag,
        category: "Pesanan Baru",
        badgeVariant: "primary",
        bgColor: "bg-sky-100 text-sky-700 border-sky-200",
      };
    case "courier_assigned":
      return {
        icon: Truck,
        category: "Penugasan Kurir",
        badgeVariant: "success",
        bgColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
      };
    case "order_ready":
      return {
        icon: Sparkles,
        category: "Pesanan Siap",
        badgeVariant: "warning",
        bgColor: "bg-amber-100 text-amber-700 border-amber-200",
      };
    case "order_completed":
      return {
        icon: CheckCircle2,
        category: "Pesanan Selesai",
        badgeVariant: "success",
        bgColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
      };
    case "payment_success":
      return {
        icon: CreditCard,
        category: "Pembayaran",
        badgeVariant: "success",
        bgColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
      };
    case "topup_success":
      return {
        icon: Wallet,
        category: "Top-Up Sukses",
        badgeVariant: "success",
        bgColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
      };
    case "topup_requested":
      return {
        icon: Wallet,
        category: "Pengajuan Top-Up",
        badgeVariant: "warning",
        bgColor: "bg-amber-100 text-amber-700 border-amber-200",
      };
    case "topup_submitted":
      return {
        icon: Clock,
        category: "Pengajuan Top-Up",
        badgeVariant: "info",
        bgColor: "bg-sky-100 text-sky-700 border-sky-200",
      };
    case "topup_rejected":
      return {
        icon: AlertTriangle,
        category: "Top-Up Ditolak",
        badgeVariant: "danger",
        bgColor: "bg-rose-100 text-rose-700 border-rose-200",
      };
    case "withdrawal_requested":
      return {
        icon: Banknote,
        category: "Penarikan Dana (WD)",
        badgeVariant: "warning",
        bgColor: "bg-amber-100 text-amber-700 border-amber-200",
      };
    case "withdrawal_submitted":
      return {
        icon: Clock,
        category: "Pengajuan WD",
        badgeVariant: "info",
        bgColor: "bg-sky-100 text-sky-700 border-sky-200",
      };
    case "withdrawal_completed":
      return {
        icon: CheckCircle2,
        category: "WD Berhasil",
        badgeVariant: "success",
        bgColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
      };
    case "withdrawal_rejected":
      return {
        icon: AlertTriangle,
        category: "WD Ditolak",
        badgeVariant: "danger",
        bgColor: "bg-rose-100 text-rose-700 border-rose-200",
      };
    case "payment_expired":
    case "order_cancelled":
      return {
        icon: AlertTriangle,
        category: "Dibatalkan",
        badgeVariant: "danger",
        bgColor: "bg-rose-100 text-rose-700 border-rose-200",
      };
    case "courier_tip_received":
      return {
        icon: Gift,
        category: "Tips Kurir",
        badgeVariant: "warning",
        bgColor: "bg-amber-100 text-amber-700 border-amber-200",
      };
    default:
      return {
        icon: Bell,
        category: "Informasi",
        badgeVariant: "neutral",
        bgColor: "bg-slate-100 text-slate-700 border-slate-200",
      };
  }
}

export const NotificationsView: React.FC = () => {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<
    "all" | "unread" | "orders" | "courier_withdrawals" | "wallet"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");

  const { data: notifications = [], isLoading } = useNotificationsQuery(100);
  const { data: unreadData } = useUnreadNotificationCountQuery();
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  const unreadCount = unreadData?.unread_count || 0;

  // Stats
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.is_read).length;
    const orders = notifications.filter(
      (n) =>
        n.type === "order_created" ||
        n.type === "order_ready" ||
        n.type === "order_completed" ||
        n.type === "order_cancelled" ||
        n.orders_id ||
        n.order_id,
    ).length;
    const courierAndWd = notifications.filter(
      (n) =>
        n.type.startsWith("withdrawal_") ||
        n.type === "courier_assigned" ||
        n.type === "courier_tip_received",
    ).length;

    return { total, unread, orders, courierAndWd };
  }, [notifications]);

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Category Tab
      if (activeCategory === "unread" && notif.is_read) return false;
      if (activeCategory === "orders") {
        const isOrder =
          notif.type === "order_created" ||
          notif.type === "order_ready" ||
          notif.type === "order_completed" ||
          notif.type === "order_cancelled" ||
          Boolean(notif.orders_id || notif.order_id);
        if (!isOrder) return false;
      }
      if (activeCategory === "courier_withdrawals") {
        const isCourWd =
          notif.type.startsWith("withdrawal_") ||
          notif.type === "courier_assigned" ||
          notif.type === "courier_tip_received";
        if (!isCourWd) return false;
      }
      if (activeCategory === "wallet") {
        const isWallet =
          notif.type === "topup_success" ||
          notif.type === "payment_success" ||
          notif.type.startsWith("withdrawal_");
        if (!isWallet) return false;
      }

      // Read status dropdown
      if (readFilter === "unread" && notif.is_read) return false;
      if (readFilter === "read" && !notif.is_read) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = notif.title?.toLowerCase().includes(q);
        const matchMsg = notif.message?.toLowerCase().includes(q);
        const matchInv = notif.invoice_no?.toLowerCase().includes(q);
        if (!matchTitle && !matchMsg && !matchInv) return false;
      }

      return true;
    });
  }, [notifications, activeCategory, readFilter, searchQuery]);

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    markAllReadMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Semua notifikasi berhasil ditandai telah dibaca");
      },
    });
  };

  const handleNavigateToSource = (notif: NotificationItem) => {
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id);
    }

    if (notif.order_id || notif.orders_id) {
      const orderParam = String(notif.order_id || notif.orders_id);
      router.push(`/order/${encodeURIComponent(orderParam)}/edit`);
    } else if (
      notif.type === "withdrawal_requested" ||
      notif.type?.startsWith("withdrawal_") ||
      notif.type === "courier_assigned"
    ) {
      router.push("/courier");
    } else if (notif.type === "topup_requested" || notif.type?.startsWith("topup_")) {
      router.push("/system/user-management");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">Pusat Notifikasi</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-sky-100 text-sky-800 rounded-full border border-sky-200">
                {unreadCount} belum dibaca
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pantau seluruh riwayat pesanan masuk, penugasan kurir, penarikan dana, dan status transaksi secara real-time.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800 border border-sky-200/80 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-2xs disabled:opacity-50"
          >
            <CheckCheck size={16} />
            <span>Tandai Semua Dibaca</span>
          </button>
        )}
      </div>

      {/* 2. Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Bell size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Total Notifikasi</p>
            <p className="text-lg font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Belum Dibaca</p>
            <p className="text-lg font-bold text-sky-700">{stats.unread}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShoppingBag size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Aktivitas Pesanan</p>
            <p className="text-lg font-bold text-slate-900">{stats.orders}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Banknote size={18} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Kurir & Penarikan</p>
            <p className="text-lg font-bold text-slate-900">{stats.courierAndWd}</p>
          </div>
        </div>
      </div>

      {/* 3. Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap",
                activeCategory === "all"
                  ? "bg-sky-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900",
              )}
            >
              Semua ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("unread")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap",
                activeCategory === "unread"
                  ? "bg-sky-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900",
              )}
            >
              Belum Dibaca ({stats.unread})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("orders")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap",
                activeCategory === "orders"
                  ? "bg-sky-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900",
              )}
            >
              Pesanan ({stats.orders})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("courier_withdrawals")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap",
                activeCategory === "courier_withdrawals"
                  ? "bg-sky-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900",
              )}
            >
              Kurir & WD ({stats.courierAndWd})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("wallet")}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap",
                activeCategory === "wallet"
                  ? "bg-sky-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900",
              )}
            >
              Keuangan
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari notifikasi..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
              />
            </div>

            <div className="w-full sm:w-36 shrink-0">
              <Select
                value={readFilter}
                onValueChange={(val) => setReadFilter(val as any)}
              >
                <SelectTrigger className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs font-medium">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="unread">Belum Dibaca</SelectItem>
                  <SelectItem value="read">Sudah Dibaca</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 4. Notification Items List */}
        <div className="divide-y divide-slate-100">
          {isLoading && notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Memuat daftar notifikasi...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bell size={22} />
              </div>
              <p className="text-sm font-bold text-slate-700">Tidak ada notifikasi ditemukan</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery || activeCategory !== "all" || readFilter !== "all"
                  ? "Coba ubah kata kunci pencarian atau filter yang dipilih."
                  : "Semua pembaruan sistem dan operasional akan dicatat di sini."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const meta = getNotificationMeta(notif.type);
              const IconComp = meta.icon;
              const isUnread = !notif.is_read;

              return (
                <div
                  key={notif.id}
                  className={cn(
                    "py-4 px-3 sm:px-4 rounded-xl flex flex-col sm:flex-row sm:items-start justify-between gap-3 transition-colors group",
                    isUnread
                      ? "bg-sky-50/50 hover:bg-sky-50/80 border border-sky-100/80 my-1"
                      : "hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 shadow-2xs",
                        meta.bgColor,
                      )}
                    >
                      <IconComp size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant={meta.badgeVariant} className="text-[10px] px-2 py-0.5">
                          {meta.category}
                        </Badge>
                        <h3
                          className={cn(
                            "text-xs font-bold truncate",
                            isUnread ? "text-slate-900" : "text-slate-700",
                          )}
                        >
                          {notif.title}
                        </h3>
                        {isUnread && (
                          <span className="px-1.5 py-0.2 bg-sky-600 text-white text-[9px] font-bold rounded-full">
                            Baru
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                        {notif.message}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{formatTimeAgo(notif.created_at)}</span>
                          <span className="text-slate-300">•</span>
                          <span>{formatFullDate(notif.created_at)}</span>
                        </span>

                        {notif.invoice_no && (
                          <span className="font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200 text-[10px]">
                            #{notif.invoice_no}
                          </span>
                        )}

                        {notif.order_status && (
                          <span className="text-sky-700 font-medium">
                            • {notif.order_status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions on right */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center mt-2 sm:mt-0">
                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => markReadMutation.mutate(notif.id)}
                        className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg border border-slate-200 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Tandai sudah dibaca"
                      >
                        <Check size={13} />
                        <span>Tandai Dibaca</span>
                      </button>
                    )}

                    {(notif.order_id ||
                      notif.orders_id ||
                      notif.type.startsWith("withdrawal_") ||
                      notif.type === "topup_success" ||
                      notif.type === "courier_assigned") && (
                      <button
                        type="button"
                        onClick={() => handleNavigateToSource(notif)}
                        className="px-3 py-1.5 text-[11px] font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <span>Lihat Detail</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
