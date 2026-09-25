"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Edit3, Trash2, Search, Filter, Eye } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { ServiceItem } from "@/types";
import { formatRupiah } from "@/lib/utils";
import { Badge } from "@/components/Badge";
import { DynamicIcon } from "@/components/DynamicIcon";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { useDebounce } from "use-debounce";
import {
  useServicesQuery,
  useDeleteServiceMutation,
} from "@/hooks/useServiceQuery";
import { useServiceCategoriesQuery } from "@/hooks/useMasterQuery";

export const ServicesView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [categoryFilter, setCategoryFilter] = useState("all");

  // React Query hooks
  const {
    data: services = [],
    isLoading,
    error,
  } = useServicesQuery(categoryFilter, debouncedSearch);

  const { data: dbCategories = [] } = useServiceCategoriesQuery();
  const deleteServiceMutation = useDeleteServiceMutation();

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string>("");

  const handleTriggerDelete = (item: ServiceItem) => {
    setDeleteTargetId(item.id);
    setDeleteTargetName(item.name);
  };

  const handleExecuteDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteServiceMutation.mutateAsync(deleteTargetId);
      setDeleteTargetId(null);
      toast.success("Layanan berhasil dinonaktifkan/dihapus.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus layanan");
    }
  };

  const categories = useMemo(() => {
    const list = [{ id: "all", label: "Semua Kategori" }];
    dbCategories
      .filter((c) => c.is_active !== false)
      .forEach((c) => {
        list.push({ id: c.code, label: c.name });
      });
    return list;
  }, [dbCategories]);

  // TanStack Table Column Definitions for Services
  const columns = useMemo<ColumnDef<ServiceItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Paket / Layanan",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-100 border border-sky-300 text-sky-800 flex items-center justify-center shrink-0">
                <DynamicIcon name={item.icon_code} size={18} />
              </div>
              <div>
                <div className="font-bold text-slate-900">{item.name}</div>
                <div className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">
                  {item.description || "-"}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: "Kategori & Status",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="primary">{item.category}</Badge>
              {item.is_popular ? (
                <Badge variant="warning">★ Populer</Badge>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "price",
        header: "Tarif / Harga",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="font-extrabold text-sky-700">
              {formatRupiah(item.price)}
              <span className="text-xs font-normal text-slate-500">
                {" "}
                / {item.unit}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "duration",
        header: "Estimasi Durasi",
        cell: ({ row }) => (
          <span className="text-slate-700 font-medium">
            {row.original.duration || "-"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Link
                href={`/service/${encodeURIComponent(item.id)}/detail`}
                className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                title="Lihat Detail Layanan"
              >
                <Eye size={15} />
              </Link>
              <Link
                href={`/service/${encodeURIComponent(item.id)}/edit`}
                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Layanan"
              >
                <Edit3 size={15} />
              </Link>
              <button
                onClick={() => handleTriggerDelete(item)}
                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Hapus Layanan"
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
            <span>Master Data</span>
            <span>/</span>
            <span>Katalog Layanan</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Paket & Tarif Layanan Laundry
          </h1>
        </div>

        {/* Navigasi Tambah Layanan */}
        <Link
          href="/service/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-600/20 cursor-pointer"
        >
          <Plus size={16} />
          <span>Tambah Layanan Baru</span>
        </Link>
      </div>

      {/* Fitur Search (dengan Debounce) & Filter Kategori */}
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
            placeholder="Cari nama atau paket laundry..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter size={14} className="text-slate-400 mr-1 hidden sm:inline" />
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                categoryFilter === cat.id
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* TanStack Table: Services Catalog */}
      <DataTable
        columns={columns}
        data={services}
        isLoading={isLoading}
        emptyMessage="Tidak ada layanan laundry yang sesuai dengan filter atau pencarian."
        pageSize={10}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        variant="delete"
        isLoading={deleteServiceMutation.isPending}
        title="Hapus Layanan Laundry"
        description={`Apakah Anda yakin ingin menonaktifkan atau menghapus layanan "${deleteTargetName}"? Data transaksi lama tetap tersimpan aman.`}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleExecuteDelete}
      />
    </div>
  );
};
