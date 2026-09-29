"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Navigation, Copy, Check } from "lucide-react";
import { useOrderByIdQuery } from "@/hooks/useOrderQuery";
import { useOrderStatusesQuery } from "@/hooks/useMasterQuery";
import { formatRupiah, formatDate, cn } from "@/lib/utils";
import { Badge } from "@/components/Badge";

interface CourierDetailViewProps {
  orderId?: string;
}

export const CourierDetailView: React.FC<CourierDetailViewProps> = ({
  orderId: propOrderId,
}) => {
  const router = useRouter();
  const params = useParams();
  const rawSlug = params?.slug as string | undefined;
  const effectiveOrderId =
    propOrderId || (rawSlug ? decodeURIComponent(rawSlug) : "");

  const { data: order, isLoading } = useOrderByIdQuery(effectiveOrderId);
  const { data: masterStatuses = [] } = useOrderStatusesQuery();

  // State for active map tab & copy address feedback
  const [activeMapTab, setActiveMapTab] = useState<"pickup" | "delivery">("pickup");
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleCopyAddress = (text: string, type: string) => {
    if (!text || text === "-") return;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Matched status object for color & step order
  const currentMatchedStatus = useMemo(() => {
    if (!order) return null;
    return (
      masterStatuses.find(
        (s) =>
          String(s.id) === String(order.order_statuses_id || order.status_id) ||
          s.name?.toLowerCase() === order.status?.toLowerCase() ||
          s.code?.toLowerCase() === order.status?.toLowerCase()
      ) || null
    );
  }, [order, masterStatuses]);

  const activeStatuses = useMemo(() => {
    return [...masterStatuses]
      .filter((s) => s.is_active !== false)
      .sort((a, b) => (Number(a.step_order) || 0) - (Number(b.step_order) || 0));
  }, [masterStatuses]);

  if (isLoading) {
    return (
      <div className="py-16 text-center text-slate-400 text-xs animate-pulse">
        Memuat data tugas kurir...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/courier"
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
              <span>Operasional Laundry</span>
              <span>/</span>
              <span>Detail Tugas Kurir</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
              Tugas Tidak Ditemukan
            </h1>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto font-bold text-lg">
            !
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Data Tugas Kurir Tidak Tersedia
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Data tugas pesanan dengan ID &ldquo;{effectiveOrderId}&rdquo; tidak ditemukan atau telah dihapus.
            </p>
          </div>
          <Link
            href="/courier"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-colors"
          >
            Kembali ke Daftar Kurir
          </Link>
        </div>
      </div>
    );
  }

  const grandTotal =
    (order.price_per_unit || 0) * (order.quantity || 0) +
    (order.delivery_fee || 0) -
    (order.discount || 0);

  const currentDisplayStatus =
    order.status_name ||
    order.status ||
    currentMatchedStatus?.name ||
    "Menunggu Penjemputan";

  const badgeVariant =
    (currentMatchedStatus?.badge_variant as any) ||
    (order.order_status?.badge_variant as any) ||
    (order.status_badge_variant as any) ||
    "info";

  const badgeColor =
    currentMatchedStatus?.color_hex ||
    order.order_status?.color_hex ||
    order.status_color_hex ||
    null;

  const customerName = order.customer_name || order.user_name || "Pelanggan";
  const customerPhone = order.customer_phone || order.user_phone;
  const customerEmail = order.customer_email || order.user_email;
  const courierName = order.courier_name || "Belum Ditugaskan";
  const courierPhone = order.courier_phone;

  const pickupAddr = order.pickup_address || "";
  const deliveryAddr = order.delivery_address || "";
  const activeAddress = activeMapTab === "pickup" ? pickupAddr : deliveryAddr;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* 1. Header Back Navigation & Action Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/courier"
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
              <span>Operasional Laundry</span>
              <span>/</span>
              <span>Detail Tugas Kurir</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
              Invoice #{order.invoice_no || order.id}
            </h1>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          <Badge variant={badgeVariant} customColor={badgeColor}>
            {currentDisplayStatus}
          </Badge>
        </div>
      </div>

      {/* 2. Main Form / Card Wrapper */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Section 1: Ringkasan Paket & Rincian Pesanan */}
        <div>
          <div className="border-b border-slate-100 pb-4 mb-5">
            <h2 className="text-base font-bold text-slate-900">
              Informasi & Rincian Layanan Pesanan
            </h2>
          </div>

          {/* Highlight Summary Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 p-4 sm:p-5 bg-sky-50/60 border border-sky-200 rounded-xl text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">
                Layanan
              </span>
              <p className="font-bold text-slate-900 mt-1 text-sm">
                {order.service_name || "-"}
              </p>
              <p className="text-[11px] text-sky-700 font-semibold">
                {order.service_type || "Kiloan"}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">
                Jumlah / Satuan
              </span>
              <p className="font-bold text-sky-800 mt-1 text-sm">
                {order.quantity} {order.unit || "Kg"}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                @{formatRupiah(order.price_per_unit)}/{order.unit || "Kg"}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">
                Total Biaya
              </span>
              <p className="font-extrabold text-sky-700 mt-1 text-sm">
                {formatRupiah(grandTotal)}
              </p>
              <p className="text-[11px] text-emerald-600 font-medium">
                Ongkir: {formatRupiah(order.delivery_fee)}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">
                Tanggal Pesanan
              </span>
              <p className="text-slate-800 font-medium mt-1">
                {formatDate(order.order_date)}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">
                Estimasi Selesai
              </span>
              <p className="text-slate-800 font-medium mt-1">
                {formatDate(order.estimated_completion_date)}
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Staf Kurir yang Bertugas */}
        <div className="space-y-3 pt-1">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              Staf Kurir yang Bertugas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Informasi staf kurir penanggung jawab penjemputan dan pengantaran:
            </p>
          </div>

          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-base border border-sky-200 shrink-0">
                  {courierName ? courierName[0].toUpperCase() : "K"}
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Nama Petugas Kurir
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {courierName}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                    {courierPhone ? (
                      <span className="font-medium text-sky-700">
                        {courierPhone}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">
                        Nomor telepon tidak dicantumkan
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {order.courier_name && (
                <div className="flex items-center gap-2">
                  <Badge variant="success" className="text-xs">
                    Aktif Bertugas
                  </Badge>
                </div>
              )}
            </div>

            {/* Tips & Rating Kurir dari Pelanggan */}
            {(Boolean(order.rating) || (order.tip_amount && order.tip_amount > 0)) && (
              <div className="mt-4 pt-3.5 border-t border-slate-200/80 bg-amber-50/60 p-4 rounded-xl border border-amber-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {Boolean(order.rating) ? (
                    <div>
                      <span className="font-bold text-xs text-amber-900">
                        Rating: {order.rating} / 5
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Belum ada rating
                    </span>
                  )}

                  {order.tip_amount && order.tip_amount > 0 ? (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      Tips Kurir: {formatRupiah(order.tip_amount)}
                    </span>
                  ) : null}
                </div>

                {order.review && (
                  <p className="text-xs text-amber-950 mt-2 italic font-medium">
                    &ldquo;{order.review}&rdquo;
                  </p>
                )}
                {order.rated_at && (
                  <div className="text-[10px] text-amber-700 mt-1">
                    Diulas pada {formatDate(order.rated_at)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Informasi Pemesan / Pelanggan */}
        <div className="space-y-3 pt-1">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              Informasi Pemesan / Pelanggan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian akun pelanggan pemesan laundry:
            </p>
          </div>

          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-base border border-sky-200 shrink-0">
                {customerName ? customerName[0].toUpperCase() : "P"}
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Nama Pelanggan
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {customerName}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                  {customerPhone && (
                    <span className="font-medium text-sky-700">
                      {customerPhone}
                    </span>
                  )}
                  {customerEmail && (
                    <span className="text-slate-500">{customerEmail}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes from customer */}
            {order.notes && (
              <div className="mt-4 pt-3.5 border-t border-slate-200/80">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Catatan Khusus dari Pelanggan:
                </div>
                <p className="text-xs text-slate-700 italic bg-white p-3 rounded-xl border border-slate-200">
                  &ldquo;{order.notes}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Logistik, Titik Lokasi & Peta Antar-Jemput */}
        <div className="space-y-4 pt-2">
          <div className="border-b border-slate-100 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Informasi Logistik, Titik Lokasi & Peta
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Alamat penjemputan, pengantaran, dan navigasi rute Google Maps untuk kurir:
              </p>
            </div>
            {/* Map tab toggler */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveMapTab("pickup")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  activeMapTab === "pickup"
                    ? "bg-white text-sky-700 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Peta Penjemputan
              </button>
              <button
                type="button"
                onClick={() => setActiveMapTab("delivery")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  activeMapTab === "delivery"
                    ? "bg-white text-sky-700 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Peta Pengantaran
              </button>
            </div>
          </div>

          {/* Cards for Alamat Penjemputan & Pengantaran with Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Alamat Penjemputan */}
            <div
              className={cn(
                "border rounded-xl p-4 space-y-3 transition-all",
                activeMapTab === "pickup"
                  ? "bg-sky-50/40 border-sky-300 ring-2 ring-sky-500/10"
                  : "bg-slate-50 border-slate-200"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                  Alamat Penjemputan (Pickup)
                </span>
                {activeMapTab === "pickup" && (
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                    Aktif di Peta
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-800 leading-relaxed font-medium min-h-[40px]">
                {pickupAddr || "-"}
              </p>

              {pickupAddr && pickupAddr !== "-" && (
                <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pickupAddr)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Navigation size={12} />
                    <span>Petunjuk Arah</span>
                  </a>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupAddr)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <ExternalLink size={12} />
                    <span>Buka Maps</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyAddress(pickupAddr, "pickup")}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs transition-colors cursor-pointer ml-auto"
                    title="Salin Alamat Penjemputan"
                  >
                    {copiedType === "pickup" ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Alamat Pengantaran */}
            <div
              className={cn(
                "border rounded-xl p-4 space-y-3 transition-all",
                activeMapTab === "delivery"
                  ? "bg-sky-50/40 border-sky-300 ring-2 ring-sky-500/10"
                  : "bg-slate-50 border-slate-200"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                  Alamat Pengantaran (Delivery)
                </span>
                {activeMapTab === "delivery" && (
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                    Aktif di Peta
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-800 leading-relaxed font-medium min-h-[40px]">
                {deliveryAddr || "-"}
              </p>

              {deliveryAddr && deliveryAddr !== "-" && (
                <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(deliveryAddr)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Navigation size={12} />
                    <span>Petunjuk Arah</span>
                  </a>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deliveryAddr)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <ExternalLink size={12} />
                    <span>Buka Maps</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyAddress(deliveryAddr, "delivery")}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs transition-colors cursor-pointer ml-auto"
                    title="Salin Alamat Pengantaran"
                  >
                    {copiedType === "delivery" ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Embedded Google Maps Preview */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-100 shadow-xs">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="font-semibold text-slate-700 flex items-center gap-2">
                <span>Peta Interaktif:</span>
                <span className="text-sky-700 font-bold">
                  {activeMapTab === "pickup" ? "Lokasi Penjemputan" : "Lokasi Pengantaran"}
                </span>
                <span className="text-slate-400">({activeAddress || "Alamat belum diatur"})</span>
              </div>
              {activeAddress && activeAddress !== "-" && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-700 hover:text-sky-800 font-medium inline-flex items-center gap-1 hover:underline"
                >
                  <span>Buka Layar Penuh Google Maps</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>

            {activeAddress && activeAddress !== "-" ? (
              <div className="w-full h-72 sm:h-96 relative bg-slate-200">
                <iframe
                  title="Google Maps Location"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(activeAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                Tidak ada titik alamat yang dapat ditampilkan pada peta untuk kategori ini.
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Status Pengerjaan Cucian */}
        <div className="space-y-3 pt-1">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              Status Pengerjaan Cucian
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Status tahapan pengerjaan pesanan saat ini:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {activeStatuses.map((st) => {
              const isSelected =
                String(order.order_statuses_id || order.status_id) ===
                  String(st.id) ||
                order.status?.toLowerCase() === st.name.toLowerCase();

              return (
                <div
                  key={st.id || st.code}
                  className={cn(
                    "p-3 rounded-xl text-left transition-all border",
                    isSelected
                      ? "bg-sky-50 border-sky-400 font-bold opacity-100"
                      : "bg-slate-50/50 border-slate-200 text-slate-400 opacity-60"
                  )}
                >
                  <div className="font-bold text-xs text-slate-900">
                    {st.step_order ? `${st.step_order}. ` : ""}
                    {st.name}
                  </div>
                  {st.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                      {st.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 6: Rincian Biaya */}
        <div className="space-y-4 pt-2">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900">
              Rincian Pembayaran
            </h3>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 max-w-md space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>
                Biaya Layanan ({order.quantity} {order.unit || "Kg"})
              </span>
              <span className="font-semibold text-slate-900">
                {formatRupiah((order.price_per_unit || 0) * (order.quantity || 0))}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>Ongkir Kurir</span>
              <span className="font-semibold text-slate-900">
                {formatRupiah(order.delivery_fee || 0)}
              </span>
            </div>

            {(order.discount || 0) > 0 && (
              <div className="flex items-center justify-between text-rose-600">
                <span>Diskon Promo</span>
                <span className="font-semibold">
                  -{formatRupiah(order.discount || 0)}
                </span>
              </div>
            )}

            {(order.tip_amount || 0) > 0 && (
              <div className="flex items-center justify-between text-emerald-700 bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                <span className="font-bold">Tips Kurir</span>
                <span className="font-extrabold">
                  +{formatRupiah(order.tip_amount || 0)}
                </span>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
              <span className="font-bold text-slate-900">Total Pembayaran</span>
              <span className="font-black text-sky-700 text-base">
                {formatRupiah(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <Link
            href="/courier"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Kembali ke Menu Kurir
          </Link>
        </div>
      </div>
    </div>
  );
};
