"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Receipt,
  Truck,
  Calendar,
  Clock,
  MapPin,
  Save,
  Loader2,
  XCircle,
} from "lucide-react";
import { formatRupiah, formatDate, cn } from "@/lib/utils";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, ConfirmVariant } from "@/components/ui/confirm-dialog";
import {
  useOrderByIdQuery,
  useUpdateOrderStatusMutation,
} from "@/hooks/useOrderQuery";
import { useOrderStatusesQuery } from "@/hooks/useMasterQuery";

interface OrderFormSubmitProps {
  orderId?: string;
}

export const OrderFormSubmit: React.FC<OrderFormSubmitProps> = ({
  orderId: propOrderId,
}) => {
  const router = useRouter();
  const params = useParams();
  const rawSlug = params?.slug as string | undefined;
  const rawAction = params?.action as string | undefined;
  const effectiveOrderId =
    propOrderId || (rawSlug ? decodeURIComponent(rawSlug) : "");
  const isEdit = rawAction === "edit";

  const { data: order, isLoading, error } = useOrderByIdQuery(effectiveOrderId);
  const { data: masterStatuses = [] } = useOrderStatusesQuery();
  const updateStatusMutation = useUpdateOrderStatusMutation();

  // Active master statuses sorted by step_order ASC
  const activeStatuses = useMemo(() => {
    return masterStatuses
      .filter((s) => Boolean(s.is_active))
      .sort(
        (a, b) => (Number(a.step_order) || 0) - (Number(b.step_order) || 0),
      );
  }, [masterStatuses]);

  const [selectedStatusId, setSelectedStatusId] = useState<string>("");
  const [selectedStatusName, setSelectedStatusName] = useState<string>("");

  useEffect(() => {
    if (order) {
      if (order.status_id || order.order_statuses_id) {
        setSelectedStatusId(String(order.status_id || order.order_statuses_id));
      }
      setSelectedStatusName(order.status || "");
    }
  }, [order]);

  // Find matched status object from master data
  const currentMatchedStatus = useMemo(() => {
    if (!order) return null;
    return (
      masterStatuses.find(
        (s) =>
          String(s.id) === String(order.order_statuses_id || order.status_id) ||
          s.name.toLowerCase() === order.status?.toLowerCase() ||
          s.code.toLowerCase() === order.status?.toLowerCase(),
      ) || null
    );
  }, [order, masterStatuses]);

  // Dynamic timeline steps connected directly to active master order statuses
  const timelineSteps = useMemo(() => {
    if (activeStatuses.length === 0 && order?.timeline) {
      return order.timeline;
    }

    const currentStepOrder =
      Number(currentMatchedStatus?.step_order) ||
      Number(order?.order_status?.step_order) ||
      Number(order?.status_step_order) ||
      1;

    const maxStepOrder = Math.max(
      ...activeStatuses.map((s) => Number(s.step_order) || 1),
      1,
    );
    const isOrderFinished =
      currentStepOrder >= maxStepOrder ||
      order?.status === "completed" ||
      order?.status === "Pesanan Selesai" ||
      order?.status_code === "pesanan-selesai" ||
      order?.status_code === "completed" ||
      currentMatchedStatus?.code === "pesanan-selesai" ||
      currentMatchedStatus?.code === "completed" ||
      Boolean(currentMatchedStatus?.name.toLowerCase().includes("selesai"));

    return activeStatuses.map((st) => {
      const stepNum = Number(st.step_order) || 1;
      const isCompleted = isOrderFinished
        ? stepNum <= currentStepOrder
        : stepNum < currentStepOrder;
      const isCurrent = isOrderFinished ? false : stepNum === currentStepOrder;

      const matchedTimeline = (order?.timeline || []).find(
        (t) =>
          String(t.order_statuses_id) === String(st.id) ||
          t.title?.toLowerCase() === st.name.toLowerCase() ||
          t.step_order === stepNum,
      );

      return {
        id: st.id,
        title: st.name,
        description:
          st.description ||
          matchedTimeline?.description ||
          "Tahapan proses SOP pengerjaan laundry",
        time:
          matchedTimeline?.time ||
          (isCompleted
            ? "Selesai"
            : isCurrent
              ? "Sedang Diproses"
              : "Antrean Alur SOP"),
        is_completed: isCompleted,
        is_current: isCurrent,
        step_order: stepNum,
      };
    });
  }, [activeStatuses, currentMatchedStatus, order]);

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
    variant: "update",
    onConfirm: async () => {},
  });

  const handleExecuteSave = async () => {
    if (!selectedStatusName && !selectedStatusId) return;
    try {
      await updateStatusMutation.mutateAsync({
        orderId: effectiveOrderId || order?.id || "",
        status: selectedStatusName,
        order_statuses_id: selectedStatusId || undefined,
      });

      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      toast.success(
        `Status pengerjaan pesanan berhasil diperbarui menjadi "${selectedStatusName}"!`,
      );
      router.push("/order");
    } catch (err: any) {
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      toast.error(err.message || "Gagal memperbarui status pesanan");
    }
  };

  const handleTriggerSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatusName && !selectedStatusId) {
      toast.error("Pilih status pengerjaan pesanan");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Perubahan Status Pesanan",
      description: `Apakah Anda yakin ingin memperbarui status pesanan ${order?.invoice_no} menjadi "${selectedStatusName}"?`,
      variant: "update",
      confirmText: "Ya, Simpan Status",
      onConfirm: async () => {
        await handleExecuteSave();
      },
    });
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-slate-400 text-xs animate-pulse">
        Memuat detail informasi pesanan...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-4">
          <Link
            href="/order"
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
              <span>Operasional Laundry</span>
              <span>/</span>
              <span>Detail Pesanan</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
              Pesanan Tidak Ditemukan
            </h1>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto font-bold text-lg">
            !
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Data Pesanan Tidak Tersedia
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Pesanan dengan ID &quot;{effectiveOrderId}&quot; tidak ditemukan
              atau telah dihapus.
            </p>
          </div>
          <Link
            href="/order"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-colors"
          >
            Kembali ke Daftar Pesanan
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
    order.status || currentMatchedStatus?.name || "Menunggu Penjemputan";
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Back Navigation & Action Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/order"
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
              <span>Operasional Laundry</span>
              <span>/</span>
              <span>{isEdit ? "Update Status Pesanan" : "Detail Pesanan"}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
              Invoice #{order.invoice_no}
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
      <form onSubmit={handleTriggerSave}>
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
                  {order.service_name}
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
                  {order.quantity} {order.unit}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  @{formatRupiah(order.price_per_unit)}/{order.unit}
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
                <p className="text-slate-800 font-medium mt-1 flex items-center gap-1.5">
                  <Calendar size={13} className="text-sky-600 shrink-0" />
                  <span>{formatDate(order.order_date)}</span>
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">
                  Estimasi Selesai
                </span>
                <p className="text-slate-800 font-medium mt-1 flex items-center gap-1.5">
                  <Clock size={13} className="text-amber-600 shrink-0" />
                  <span>{formatDate(order.estimated_completion_date)}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Pembaruan Status Pengerjaan (Aktif pada mode Edit, Readonly pada mode Detail) */}
          <div className="space-y-3 pt-1">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Status Pengerjaan Cucian</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEdit
                  ? "Pilih salah satu tahapan status SOP laundry di bawah ini untuk memperbarui proses cucian:"
                  : "Status pengerjaan pesanan saat ini:"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {activeStatuses.map((st) => {
                const isSelected = isEdit
                  ? String(selectedStatusId) === String(st.id) ||
                    selectedStatusName.toLowerCase() === st.name.toLowerCase()
                  : String(order.order_statuses_id || order.status_id) ===
                      String(st.id) ||
                    order.status?.toLowerCase() === st.name.toLowerCase();

                return (
                  <button
                    key={st.id || st.code}
                    type="button"
                    disabled={!isEdit}
                    onClick={() => {
                      if (isEdit) {
                        setSelectedStatusId(String(st.id));
                        setSelectedStatusName(st.name);
                      }
                    }}
                    className={cn(
                      "p-3 rounded-xl text-left transition-all border",
                      isEdit
                        ? isSelected
                          ? "bg-sky-50/90 border-sky-500 shadow-xs ring-2 ring-sky-500/20 cursor-pointer"
                          : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 cursor-pointer"
                        : isSelected
                          ? "bg-sky-50 border-sky-400 font-bold opacity-100"
                          : "bg-slate-50/50 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed",
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
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Logistik & Alamat Pengiriman (Informasi Pelanggan) */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Informasi Logistik & Pengantaran
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Alamat Penjemputan */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={14} className="text-amber-500 shrink-0" />
                  <span>Alamat Penjemputan</span>
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {order.pickup_address || "-"}
                </p>
              </div>

              {/* Alamat Pengantaran */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-500 shrink-0" />
                  <span>Alamat Pengantaran</span>
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {order.delivery_address || "-"}
                </p>

                {order.courier_name && (
                  <div className="flex items-center gap-2 pt-2.5 text-xs text-sky-800 font-medium border-t border-slate-200 mt-2">
                    <Truck size={15} className="text-sky-600 shrink-0" />
                    <span>
                      Kurir: <strong>{order.courier_name}</strong>{" "}
                      {order.courier_phone ? `(${order.courier_phone})` : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Catatan Pelanggan */}
              {order.notes && (
                <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Catatan Khusus Pelanggan
                  </span>
                  <p className="text-xs text-slate-700 italic leading-relaxed">
                    &ldquo;{order.notes}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Stepper Timeline (Hanya ditampilkan pada mode Detail) */}
          {!isEdit && (
            <div className="space-y-4 pt-2">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Riwayat & Timeline Pengerjaan SOP
                </h3>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-5">
                <div className="space-y-4 pl-2 border-l-2 border-slate-200 ml-2">
                  {timelineSteps.map((step, idx) => (
                    <div key={idx} className="relative pl-5">
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full absolute -left-[7px] top-1",
                          step.is_completed
                            ? "bg-sky-600 ring-4 ring-sky-100"
                            : step.is_current
                              ? "bg-amber-500 ring-4 ring-amber-100 animate-pulse"
                              : "bg-slate-300",
                        )}
                      />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs">
                          {step.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium font-mono">
                          {step.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons Footer di Mode Edit */}
          {isEdit && (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Link
                href="/order"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <XCircle size={15} />
                <span>Batal</span>
              </Link>
              <Button
                type="submit"
                disabled={updateStatusMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 h-auto bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-600/20 cursor-pointer disabled:cursor-not-allowed"
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Simpan Status</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </form>

      {/* Universal Confirm Dialog */}
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
    </div>
  );
};
