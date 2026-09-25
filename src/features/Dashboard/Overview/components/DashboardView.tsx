"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Receipt,
  Users,
  Shirt,
  ArrowRight,
  ShieldAlert,
  Waves,
  CheckCircle2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Order, ServiceItem, SystemUser } from "@/types";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Badge } from "@/components/Badge";
import { useAuthStore } from "@/store/useAuthStore";
import { useHasPermission } from "@/hooks/useUserManagementQuery";

export const DashboardView: React.FC = () => {
  const { currentRoleName } = useAuthStore();
  const hasAdminAccess = useHasPermission("admin.akses.index");
  const hasOrderAccess = useHasPermission("order.index");
  const hasServiceAccess = useHasPermission("service.index");

  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ordersData, servicesData, usersData] = await Promise.all([
          hasOrderAccess ? apiFetch<Order[]>("/orders").catch(() => []) : Promise.resolve([]),
          hasServiceAccess ? apiFetch<ServiceItem[]>("/services").catch(() => []) : Promise.resolve([]),
          hasAdminAccess ? apiFetch<SystemUser[]>("/system/users?tab=active").catch(() => []) : Promise.resolve([]),
        ]);
        setOrders(ordersData);
        setServices(servicesData);
        setUsers(usersData);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [hasAdminAccess, hasOrderAccess, hasServiceAccess]);

  const totalRevenue = orders.reduce(
    (sum, o) =>
      sum + (o.price_per_unit * o.quantity + o.delivery_fee - o.discount),
    0,
  );
  const activeOrdersCount = orders.filter(
    (o) => o.status !== "completed" && o.status !== "cancelled",
  ).length;
  const washingOrdersCount = orders.filter(
    (o) => o.status === "washing" || o.status === "Sedang Dicuci",
  ).length;
  const completedOrdersCount = orders.filter(
    (o) => o.status === "completed" || o.status === "Pesanan Selesai",
  ).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold">
              <Waves size={14} />
              <span>Sistem Operasional Almas Laundry</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
              Selamat Datang di Portal {hasAdminAccess ? "Admin" : (currentRoleName || "Operasional")}
            </h1>
          </div>

          {hasAdminAccess && (
            <div className="flex items-center gap-3">
              <Link
                href="/system/user-management"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-600/20 cursor-pointer"
              >
                <Users size={16} />
                <span>User Management</span>
              </Link>
              <Link
                href="/system/menu-list"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <span>Menu & Sidebar</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Omzet (Hanya jika memiliki izin order.index) */}
        {hasOrderAccess && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Total Nilai Transaksi
              </span>
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center border border-sky-200">
                <TrendingUp size={18} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                {isLoading ? "..." : formatRupiah(totalRevenue || 0)}
              </h3>
              <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-semibold">
                <span>●</span> Total Transaksi
              </p>
            </div>
          </div>
        )}

        {/* Card 2: Pesanan Aktif (Hanya jika memiliki izin order.index) */}
        {hasOrderAccess && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Pesanan Dalam Proses
              </span>
              <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center border border-cyan-200">
                <Receipt size={18} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                {isLoading ? "..." : `${activeOrdersCount} Pesanan`}
              </h3>
              <p className="text-[11px] text-sky-600 mt-1 font-semibold">
                {washingOrdersCount > 0
                  ? `${washingOrdersCount} Sedang dicuci`
                  : "Semua proses lancar"}
              </p>
            </div>
          </div>
        )}

        {/* Card 3: Total Pengguna Aktif (Khusus Admin) */}
        {hasAdminAccess && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                User Aktif Terdaftar
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <Users size={18} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                {isLoading ? "..." : `${users.length} Akun`}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Termasuk Super Admin & Staff
              </p>
            </div>
          </div>
        )}

        {/* Card 4: Pesanan Selesai (Jika non-admin tapi punya izin order) */}
        {!hasAdminAccess && hasOrderAccess && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Pesanan Selesai
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                {isLoading ? "..." : `${completedOrdersCount} Pesanan`}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Layanan selesai diproses
              </p>
            </div>
          </div>
        )}

        {/* Card 5: Katalog Layanan (Hanya jika memiliki izin service.index) */}
        {hasServiceAccess && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Katalog Layanan Aktif
              </span>
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center border border-sky-200">
                <Shirt size={18} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                {isLoading ? "..." : `${services.length} Paket`}
              </h3>
              <p className="text-[11px] text-sky-600 mt-1 font-semibold">
                Kiloan, Satuan, Sepatu & Jas
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Layout: Orders & System Status */}
      {(hasOrderAccess || hasAdminAccess) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Recent Orders (Hanya jika memiliki izin order.index) */}
          {hasOrderAccess && (
            <div
              className={`${
                hasAdminAccess ? "lg:col-span-2" : "lg:col-span-3"
              } bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Pesanan Laundry Terkini
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tracking status proses cucian secara real-time
                  </p>
                </div>
                <Link
                  href="/order"
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  <span>Lihat Semua</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-600 bg-slate-50 border-b border-slate-200 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Invoice</th>
                      <th className="py-3 px-4">Layanan</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {isLoading && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Memuat pesanan...
                        </td>
                      </tr>
                    )}
                    {!isLoading && orders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Belum ada data pesanan.
                        </td>
                      </tr>
                    )}
                    {!isLoading &&
                      orders.slice(0, 5).map((ord) => {
                        const total =
                          ord.price_per_unit * ord.quantity +
                          ord.delivery_fee -
                          ord.discount;
                        return (
                          <tr
                            key={ord.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-sky-700">
                              {ord.invoice_no}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-800">
                              {ord.service_name}
                              <span className="block text-[10px] text-slate-500">
                                {ord.quantity} {ord.unit}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {formatRupiah(total)}
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge
                                variant={
                                  (ord.order_status?.badge_variant as any) ||
                                  (ord.status_badge_variant as any) ||
                                  (ord.status === "completed" ||
                                  ord.status === "Pesanan Selesai"
                                    ? "success"
                                    : ord.status === "washing" ||
                                        ord.status === "Sedang Dicuci"
                                      ? "primary"
                                      : "warning")
                                }
                                customColor={
                                  ord.order_status?.color_hex ||
                                  ord.status_color_hex ||
                                  null
                                }
                              >
                                {ord.status}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500">
                              {formatDate(ord.order_date)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Right Column: System Module Quick Status (Khusus Role dengan hak akses admin.akses.index) */}
          {hasAdminAccess && (
            <div
              className={`${
                !hasOrderAccess ? "lg:col-span-3" : ""
              } bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm`}
            >
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-sky-600" />
                  <span>System & RBAC Status</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Integrasi modul dinamis & audit security
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      User Management
                    </span>
                    <Badge variant="success">4 Tab Aktif</Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    User Aktif, User Keluar, Master Role & Matriks Hak Akses.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Dynamic Menu List
                    </span>
                    <Badge variant="primary">2 Tab Aktif</Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Daftar Menu terpusat & Manajemen Hierarki Sidebar per Role.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Standard Audit Columns
                    </span>
                    <Badge variant="info">Aktif di 11 Tabel</Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    `created_at`, `creator`, `updated_at`, `update_pic`,
                    `deleted_at`, `delete_pic`.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Strict Query Security
                    </span>
                    <Badge variant="success">100% No SELECT *</Badge>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Semua query database dieksekusi dengan penyebutan kolom
                    eksplisit.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
