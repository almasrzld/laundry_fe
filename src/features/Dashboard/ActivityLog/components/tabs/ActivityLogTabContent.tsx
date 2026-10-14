"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Laptop,
  Smartphone,
  Copy,
  Check,
  Search,
  RotateCcw,
  Filter,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useDebounce } from "use-debounce";
import {
  useActivityLogsQuery,
  ActivityLogItem,
} from "@/hooks/useActivityLogQuery";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/Badge";

interface ActivityLogTabContentProps {
  type: "main" | "secondary";
}

const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const ActivityLogTabContent: React.FC<ActivityLogTabContentProps> = ({
  type,
}) => {
  const defaultToday = useMemo(() => getTodayString(), []);
  const [startDate, setStartDate] = useState<string>(defaultToday);
  const [endDate, setEndDate] = useState<string>(defaultToday);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useActivityLogsQuery({
    type,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: debouncedSearch || undefined,
    page: 1,
    limit: 100,
  });

  const logs = data?.data || [];

  const handleCopyIp = (ip: string) => {
    if (!ip) return;
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handleResetFilter = () => {
    const today = getTodayString();
    setStartDate(today);
    setEndDate(today);
    setSearchQuery("");
  };

  const setQuickDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    if (days > 0) {
      start.setDate(end.getDate() - days);
    }
    const format = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    setStartDate(format(start));
    setEndDate(format(end));
  };

  const setTodayDate = () => {
    const today = getTodayString();
    setStartDate(today);
    setEndDate(today);
  };

  const renderDeviceIcon = (location: string) => {
    const lower = (location || "").toLowerCase();
    if (
      lower.includes("mobile") ||
      lower.includes("android") ||
      lower.includes("ios") ||
      lower.includes("flutter")
    ) {
      return <Smartphone size={13} className="text-emerald-600 shrink-0" />;
    }
    return <Laptop size={13} className="text-sky-600 shrink-0" />;
  };

  // Standard TanStack Table Column Definitions with sorting enabled on all data columns, default on Waktu (desc)
  const columns = useMemo<ColumnDef<ActivityLogItem>[]>(
    () => [
      {
        accessorKey: "user_code",
        header: "User Kode",
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const uA = `${rowA.original.user_code || ""} ${rowA.original.user_name || ""}`.trim();
          const uB = `${rowB.original.user_code || ""} ${rowB.original.user_name || ""}`.trim();
          return uA.localeCompare(uB);
        },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex flex-col">
              <span className="font-mono font-bold text-slate-900 tracking-wide text-xs">
                {item.user_code || "-"}
              </span>
              {item.user_name && (
                <span className="text-[11px] font-medium text-slate-500 truncate max-w-[150px]">
                  {item.user_name}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "activity",
        header: "Aktivitas",
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const aA = (rowA.original.activity || "").trim();
          const aB = (rowB.original.activity || "").trim();
          return aA.localeCompare(aB);
        },
        cell: ({ row }) => {
          const item = row.original;
          const isMobile =
            (item.activity || "").toLowerCase().includes("- mobile") ||
            (item.activity || "").toLowerCase().endsWith("mobile") ||
            (item.user_agent || "").toLowerCase().includes("dart") ||
            (item.user_agent || "").toLowerCase().includes("flutter") ||
            (item.user_agent || "").toLowerCase().includes("okhttp") ||
            (item.user_agent || "").toLowerCase().includes("android") ||
            (item.user_agent || "").toLowerCase().includes("iphone");

          const cleanActivity = (item.activity || "")
            .replace(/\s*-\s*mobile\b/gi, "")
            .replace(/\s*\(\s*mobile\s*\)/gi, "")
            .trim();

          return (
            <div className="flex items-start gap-2 max-w-lg">
              <span
                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  type === "main" ? "bg-sky-600" : "bg-indigo-500"
                }`}
              />
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-800 leading-snug">
                    {cleanActivity || item.activity}
                  </span>
                  {isMobile && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-emerald-200/80">
                      <Smartphone size={11} className="text-emerald-600" />
                      Mobile App
                    </span>
                  )}
                </div>
                {(() => {
                  if (!item.payload) return null;
                  if (Array.isArray(item.payload)) {
                    const valid = item.payload.filter((x) => x !== null && x !== undefined && x !== "");
                    if (valid.length === 0) return null;
                    return (
                      <p className="text-[10.5px] font-mono text-slate-400 mt-0.5 truncate max-w-md">
                        {JSON.stringify(valid)}
                      </p>
                    );
                  }
                  if (typeof item.payload === "object") {
                    const validKeys = Object.keys(item.payload).filter(
                      (k) => item.payload[k] !== null && item.payload[k] !== undefined && item.payload[k] !== ""
                    );
                    if (validKeys.length === 0) return null;
                    const cleanObj: any = {};
                    validKeys.forEach((k) => (cleanObj[k] = item.payload[k]));
                    return (
                      <p className="text-[10.5px] font-mono text-slate-400 mt-0.5 truncate max-w-md">
                        {JSON.stringify(cleanObj)}
                      </p>
                    );
                  }
                  return (
                    <p className="text-[10.5px] font-mono text-slate-400 mt-0.5 truncate max-w-md">
                      {String(item.payload)}
                    </p>
                  );
                })()}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "date_formatted",
        header: "Tanggal",
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const tA = new Date(rowA.original.created_at).getTime();
          const tB = new Date(rowB.original.created_at).getTime();
          if (!isNaN(tA) && !isNaN(tB)) {
            return tA - tB;
          }
          return (rowA.original.date_formatted || "").localeCompare(
            rowB.original.date_formatted || ""
          );
        },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <Calendar size={13} className="text-slate-400 shrink-0" />
              <span>{item.date_formatted || "-"}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "time_formatted",
        id: "time_formatted",
        header: "Waktu",
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const tA = new Date(rowA.original.created_at).getTime();
          const tB = new Date(rowB.original.created_at).getTime();
          if (!isNaN(tA) && !isNaN(tB)) {
            return tA - tB;
          }
          return (rowA.original.time_formatted || "").localeCompare(
            rowB.original.time_formatted || ""
          );
        },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1.5 font-mono text-slate-700">
              <Clock size={13} className="text-slate-400 shrink-0" />
              <span>{item.time_formatted || "-"}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "location",
        header: "Lokasi",
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const lA = (rowA.original.location || "").trim();
          const lB = (rowB.original.location || "").trim();
          return lA.localeCompare(lB);
        },
        cell: ({ row }) => {
          const item = row.original;
          const loc = item.location;
          if (!loc) {
            return <span className="text-slate-400 font-mono text-xs">-</span>;
          }
          const isGps = loc.includes("GPS") || /-?\d+\.\d+,\s*-?\d+\.\d+/.test(loc);
          const coordMatch = loc.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
          const mapsUrl = coordMatch
            ? `https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}`
            : null;

          return (
            <div className="flex items-center gap-1.5">
              <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1.5 w-fit max-w-[220px] shadow-2xs">
                <MapPin
                  size={13}
                  className={isGps ? "text-rose-500 shrink-0" : "text-slate-400 shrink-0"}
                />
                <span className="text-[11px] font-semibold text-slate-800 truncate font-mono">
                  {loc}
                </span>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Buka Lokasi di Google Maps"
                    className="text-sky-600 hover:text-sky-800 transition-colors p-0.5 ml-0.5 shrink-0 hover:bg-sky-50 rounded"
                  >
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "ip_address",
        header: "IP Address",
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const ipA = (rowA.original.ip_address || "").trim();
          const ipB = (rowB.original.ip_address || "").trim();
          return ipA.localeCompare(ipB);
        },
        cell: ({ row }) => {
          const item = row.original;
          const clientIp = item.ip_address;
          if (!clientIp) {
            return <div className="text-slate-400 font-mono text-xs">-</div>;
          }
          return (
            <div className="flex items-center">
              <div className="inline-flex items-center gap-1.5 bg-slate-100/90 text-slate-800 font-mono text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <span>{clientIp}</span>
                <button
                  type="button"
                  onClick={() => handleCopyIp(clientIp)}
                  title="Salin IP Address"
                  className="text-slate-400 hover:text-sky-600 transition-colors p-0.5 cursor-pointer rounded"
                >
                  {copiedIp === clientIp ? (
                    <Check size={12} className="text-emerald-600" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
            </div>
          );
        },
      },
    ],
    [type, copiedIp]
  );

  return (
    <div className="space-y-4">
      {/* Standard Filter Card: Tanggal Awal & Tanggal Akhir */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 flex-1">
            {/* Tanggal Awal */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-sky-600" />
                <span>Tanggal Awal</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm"
              />
            </div>

            {/* Tanggal Akhir */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-sky-600" />
                <span>Tanggal Akhir</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm"
              />
            </div>

            {/* Pencarian */}
            <div className="sm:col-span-2 md:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Search size={13} className="text-sky-600" />
                <span>Pencarian</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari user kode atau aktivitas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Shortcut Quick Date & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter size={12} />
              <span>Shortcut:</span>
            </span>
            <button
              type="button"
              onClick={setTodayDate}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
                startDate === defaultToday && endDate === defaultToday
                  ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(7)}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
            >
              7 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(30)}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
            >
              30 Hari Terakhir
            </button>
          </div>

          <div className="flex items-center gap-2">
            {(startDate !== defaultToday || endDate !== defaultToday || searchQuery) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilter}
                className="text-xs h-8 rounded-lg flex items-center gap-1.5 text-slate-600 hover:text-red-600 hover:border-red-300 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Reset Filter</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-xs h-8 rounded-lg flex items-center gap-1.5 text-sky-700 bg-sky-50/80 hover:bg-sky-100 cursor-pointer"
            >
              <RotateCcw size={13} className={isFetching ? "animate-spin" : ""} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Standard DataTable Component with default sort on Waktu descending */}
      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        emptyMessage={
          startDate || endDate || debouncedSearch
            ? "Tidak ada aktivitas yang sesuai dengan filter tanggal atau pencarian yang dipilih."
            : `Belum ada data aktivitas pada tab ${type === "main" ? "Main Log" : "Secondary Log"}.`
        }
        pageSize={10}
        showNumberColumn={true}
        defaultSorting={[{ id: "time_formatted", desc: true }]}
      />
    </div>
  );
};
