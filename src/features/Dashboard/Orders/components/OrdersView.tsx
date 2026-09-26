"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Truck,
  Eye,
  Edit3,
  Calendar,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Order } from "@/types";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Badge } from "@/components/Badge";
import { DataTable } from "@/components/ui/data-table";
import { useDebounce } from "use-debounce";
import { useOrdersQuery } from "@/hooks/useOrderQuery";
import { useOrderStatusesQuery } from "@/hooks/useMasterQuery";

export const OrdersView: React.FC = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // React Query hooks
  const { data: orders = [], isLoading } = useOrdersQuery();
  const { data: masterStatuses = [] } = useOrderStatusesQuery();

  // Active master statuses sorted by step_order
  const activeMasterStatuses = useMemo(() => {
    return masterStatuses
      .filter((s) => Boolean(s.is_active))
      .sort((a, b) => (Number(a.step_order) || 0) - (Number(b.step_order) || 0));
  }, [masterStatuses]);

  // Filter Orders data based on status & search
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.invoice_no.toLowerCase().includes(q) ||
        o.service_name.toLowerCase().includes(q) ||
        (o.courier_name && o.courier_name.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === "all") return true;
      if (statusFilter === "active") {
        const isFinished =
          o.status === "completed" ||
          o.status === "Pesanan Selesai" ||
          o.status_code === "pesanan-selesai" ||
          o.status_code === "completed" ||
          o.status === "cancelled" ||
          o.status_code === "cancelled";
        return !isFinished;
      }

      const matchesId =
        String(o.order_statuses_id) === String(statusFilter) ||
        String(o.status_id) === String(statusFilter);

      const matchesCodeOrName =
        o.status_code?.toLowerCase() === statusFilter.toLowerCase() ||
        o.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesId || matchesCodeOrName;
    });
  }, [orders, statusFilter, debouncedSearch]);

  // TanStack Table Column Definitions
  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        accessorKey: "order_date",
        header: "Tanggal Pesanan",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 font-medium text-slate-700 whitespace-nowrap">
            <Calendar size={13} className="text-sky-600 shrink-0" />
            <span>{formatDate(row.original.order_date)}</span>
          </div>
        ),
      },
      {
        accessorKey: "invoice_no",
        header: "Invoice",
        cell: ({ row }) => (
          <span className="font-mono font-bold text-sky-700">
            {row.original.invoice_no}
          </span>
        ),
      },
      {
        accessorKey: "service_name",
        header: "Layanan & Berat",
        cell: ({ row }) => {
          const ord = row.original;
          return (
            <div>
              <div className="font-bold text-slate-900">{ord.service_name}</div>
              <div className="text-[11px] text-slate-500">
                {ord.quantity} {ord.unit} • {formatRupiah(ord.price_per_unit)}/
                {ord.unit}
              </div>
            </div>
          );
        },
      },
      {
        id: "total_biaya",
        header: "Total Biaya",
        accessorFn: (row) =>
          row.price_per_unit * row.quantity + row.delivery_fee - row.discount,
        cell: ({ row }) => {
          const ord = row.original;
          const total =
            ord.price_per_unit * ord.quantity + ord.delivery_fee - ord.discount;
          return (
            <span className="font-bold text-slate-900">
              {formatRupiah(total)}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status Pengerjaan",
        cell: ({ row }) => {
          const ord = row.original;
          const matched = masterStatuses.find(
            (s) =>
              String(s.id) === String(ord.order_statuses_id || ord.status_id) ||
              s.name.toLowerCase() === ord.status?.toLowerCase() ||
              s.code.toLowerCase() === ord.status?.toLowerCase()
          );

          const variant =
            (matched?.badge_variant as any) ||
            (ord.order_status?.badge_variant as any) ||
            (ord.status_badge_variant as any) ||
            "info";

          const customColor =
            matched?.color_hex ||
            ord.order_status?.color_hex ||
            ord.status_color_hex ||
            null;

          return (
            <Badge variant={variant} customColor={customColor}>
              {ord.status || matched?.name || "Menunggu"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "courier_name",
        header: "Kurir Antar-Jemput",
        cell: ({ row }) => {
          const courier = row.original.courier_name;
          return courier ? (
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <Truck size={13} className="text-sky-600 shrink-0" />
              <span>{courier}</span>
            </div>
          ) : (
            <span className="text-slate-400 font-medium">-</span>
          );
        },
      },
      {
        accessorKey: "estimated_completion_date",
        header: "Estimasi Selesai",
        cell: ({ row }) => (
          <span className="text-slate-500">
            {formatDate(row.original.estimated_completion_date)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const ord = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/order/${encodeURIComponent(ord.id)}/detail`,
                  )
                }
                className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                title="Lihat Detail Pesanan"
              >
                <Eye size={15} />
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/order/${encodeURIComponent(ord.id)}/edit`,
                  )
                }
                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Status & Penugasan Kurir"
              >
                <Edit3 size={15} />
              </button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [router, masterStatuses],
  );

  // Dynamic filter tabs
  const filterTabs = useMemo<{ id: string; label: string; color?: string | null }[]>(() => {
    const baseTabs: { id: string; label: string; color?: string | null }[] = [
      { id: "all", label: "Semua Pesanan" },
      { id: "active", label: "Pesanan Aktif" },
    ];

    const statusTabs = activeMasterStatuses.map((s) => ({
      id: s.code || String(s.id),
      label: s.name,
      color: s.color_hex || null,
    }));

    return [...baseTabs, ...statusTabs];
  }, [activeMasterStatuses]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
            <span>Operasional Laundry</span>
            <span>/</span>
            <span>Manajemen Pesanan</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Daftar Pesanan & Status Cucian
          </h1>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari no. invoice, layanan, kurir..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {filterTabs.map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-sky-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. TanStack Table: Orders List */}
      <DataTable
        columns={columns}
        data={filteredOrders}
        isLoading={isLoading}
        emptyMessage="Tidak ada pesanan yang sesuai dengan filter atau pencarian."
        pageSize={10}
        defaultSorting={[{ id: "order_date", desc: true }]}
      />
    </div>
  );
};
