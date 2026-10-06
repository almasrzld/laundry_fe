"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Truck,
  Calendar,
  Clock,
  MapPin,
  Save,
  Loader2,
  XCircle,
  User as UserIcon,
  Phone,
  Info,
  Trash2,
  UserCheck,
  Mail,
  MessageCircle,
  Star,
  Crown,
  CreditCard,
  CheckCircle,
  Maximize2,
  FileCheck,
  Check,
  Scale,
} from "lucide-react";
import { formatRupiah, formatDate, cn, stripCountryCode } from "@/lib/utils";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, ConfirmVariant } from "@/components/ui/confirm-dialog";
import {
  useOrderByIdQuery,
  useUpdateOrderMutation,
  usePaymentStatusQuery,
  useConfirmPaymentMutation,
} from "@/hooks/useOrderQuery";
import { useOrderStatusesQuery } from "@/hooks/useMasterQuery";
import { useActiveUsersQuery } from "@/hooks/useUserManagementQuery";
import { appConfig } from "@/config/app.config";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
} from "@/components/ui/select";

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
  const { data: paymentStatus, isLoading: isLoadingPayment } =
    usePaymentStatusQuery(effectiveOrderId);
  const { data: masterStatuses = [] } = useOrderStatusesQuery();
  const { data: activeUsers = [], isLoading: isLoadingUsers } =
    useActiveUsersQuery();
  const updateOrderMutation = useUpdateOrderMutation();
  const confirmPaymentMutation = useConfirmPaymentMutation();

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Active master statuses sorted by step_order ASC
  const activeStatuses = useMemo(() => {
    return masterStatuses
      .filter((s) => Boolean(s.is_active))
      .sort(
        (a, b) => (Number(a.step_order) || 0) - (Number(b.step_order) || 0),
      );
  }, [masterStatuses]);

  // Registered couriers (only users with courier role)
  const registeredCouriers = useMemo(() => {
    return activeUsers.filter((u) => {
      const roleCode = (u.role_code || "").toLowerCase();
      const roleName = (u.role_name || "").toLowerCase();
      return (
        roleCode === "kurir" ||
        roleCode === "courier" ||
        roleCode.includes("kurir") ||
        roleCode.includes("courier") ||
        roleName.includes("kurir") ||
        roleName.includes("courier")
      );
    });
  }, [activeUsers]);

  const [selectedStatusId, setSelectedStatusId] = useState<string>("");
  const [selectedStatusName, setSelectedStatusName] = useState<string>("");
  const [courierName, setCourierName] = useState<string>("");
  const [courierPhone, setCourierPhone] = useState<string>("");
  const [selectedCourierUserId, setSelectedCourierUserId] =
    useState<string>("");
  const [actualWeight, setActualWeight] = useState<string>("");

  const handleConfirmPayment = async () => {
    if (!effectiveOrderId) return;
    try {
      await confirmPaymentMutation.mutateAsync(effectiveOrderId);
      toast.success("Pembayaran berhasil diverifikasi & dikonfirmasi Lunas!");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengonfirmasi pembayaran.");
    }
  };

  useEffect(() => {
    if (order) {
      if (order.status_id || order.order_statuses_id) {
        setSelectedStatusId(String(order.status_id || order.order_statuses_id));
      }
      setSelectedStatusName(order.status || "");
      setActualWeight(
        order.quantity && Number(order.quantity) > 0 ? String(order.quantity) : "",
      );
      const orderCourierName = (order.courier_name || "").trim();
      const orderCourierPhone = (order.courier_phone || "").trim();
      setCourierName(orderCourierName);
      setCourierPhone(orderCourierPhone);

      if (orderCourierName || orderCourierPhone) {
        const orderPhoneClean = stripCountryCode(orderCourierPhone);
        const matchedUser = activeUsers.find((u) => {
          const nameMatches =
            orderCourierName &&
            u.name.trim().toLowerCase() === orderCourierName.toLowerCase();
          const phoneMatches =
            orderPhoneClean &&
            stripCountryCode(u.phone || "") === orderPhoneClean;
          return nameMatches || phoneMatches;
        });
        setSelectedCourierUserId(matchedUser ? String(matchedUser.id) : "");
      } else {
        setSelectedCourierUserId("");
      }
    }
  }, [order, activeUsers]);

  const handleCourierUserSelect = (userId: string) => {
    setSelectedCourierUserId(userId);
    if (!userId) {
      setCourierName("");
      setCourierPhone("");
      return;
    }
    const user = activeUsers.find((u) => String(u.id) === String(userId));
    if (user) {
      setCourierName(user.name);
      setCourierPhone(user.phone || "");
    }
  };

  const handleClearCourier = () => {
    setSelectedCourierUserId("");
    setCourierName("");
    setCourierPhone("");
  };

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

  // Currently active or selected status object
  const selectedStatusObj = useMemo(() => {
    if (!selectedStatusId && !selectedStatusName) return currentMatchedStatus;
    return (
      masterStatuses.find(
        (s) =>
          String(s.id) === String(selectedStatusId) ||
          s.name.toLowerCase() === selectedStatusName.toLowerCase() ||
          s.code.toLowerCase() === selectedStatusName.toLowerCase(),
      ) || currentMatchedStatus
    );
  }, [
    selectedStatusId,
    selectedStatusName,
    masterStatuses,
    currentMatchedStatus,
  ]);

  // Form kurir disable jika status melewati penjemputan (step > 2 atau status pencucian / proses berikutnya)
  const isCourierFormDisabled = useMemo(() => {
    const currentStep =
      Number(selectedStatusObj?.step_order) ||
      Number(currentMatchedStatus?.step_order) ||
      Number(order?.order_status?.step_order) ||
      Number(order?.status_step_order) ||
      1;

    const currentCode = (
      selectedStatusObj?.code ||
      selectedStatusName ||
      order?.status ||
      ""
    ).toLowerCase();
    const currentName = (
      selectedStatusObj?.name ||
      selectedStatusName ||
      order?.status ||
      ""
    ).toLowerCase();

    // Past pickup phase jika step_order > 2 atau nama/kode status mencakup cuci, setrika, antar, selesai
    const isPastPickup =
      currentStep > 2 ||
      currentCode.includes("cuci") ||
      currentCode.includes("setrika") ||
      currentCode.includes("antar") ||
      currentCode.includes("selesai") ||
      currentName.includes("cuci") ||
      currentName.includes("setrika") ||
      currentName.includes("antar") ||
      currentName.includes("selesai");

    return isPastPickup;
  }, [selectedStatusObj, currentMatchedStatus, order, selectedStatusName]);

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
      const isKiloan =
        (order?.unit || "").toLowerCase() === "kg" ||
        (order?.service_type || "").toLowerCase().includes("kilo");
      const parsedWeight = parseFloat(actualWeight);

      await updateOrderMutation.mutateAsync({
        orderId: effectiveOrderId || order?.id || "",
        orderData: {
          status: selectedStatusName,
          order_statuses_id: selectedStatusId || undefined,
          courier_name: courierName.trim(),
          courier_phone: courierPhone.trim(),
          ...(isKiloan && !isNaN(parsedWeight) && parsedWeight > 0
            ? { quantity: parsedWeight }
            : {}),
        },
      });

      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      toast.success(
        `Perubahan data dan status pesanan #${order?.invoice_no} berhasil disimpan!`,
      );
      router.push("/order");
    } catch (err: any) {
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      toast.error(err.message || "Gagal memperbarui data pesanan");
    }
  };

  const handleTriggerSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatusName && !selectedStatusId) {
      toast.error("Pilih status pengerjaan pesanan");
      return;
    }

    const isKiloan =
      (order?.unit || "").toLowerCase() === "kg" ||
      (order?.service_type || "").toLowerCase().includes("kilo");
    const parsedWeight = parseFloat(actualWeight);

    // Jika status yang dipilih adalah tahap Siap Diantar / Selesai dan kiloan belum ditimbang:
    const statusRequiresWeight =
      selectedStatusName.toLowerCase().includes("siap") ||
      selectedStatusName.toLowerCase().includes("selesai") ||
      selectedStatusName.toLowerCase().includes("packing") ||
      selectedStatusName.toLowerCase().includes("antar");

    if (
      isKiloan &&
      statusRequiresWeight &&
      (isNaN(parsedWeight) || parsedWeight <= 0)
    ) {
      toast.error(
        "Masukkan berat aktual hasil timbangan (kg) sebelum mengubah status ke tahap siap antar atau selesai.",
      );
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Perubahan Pesanan",
      description: `Apakah Anda yakin ingin menyimpan perubahan data pesanan ${order?.invoice_no}?`,
      variant: "update",
      confirmText: "Ya, Simpan Perubahan",
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
              <span>
                {isEdit
                  ? "Update Status & Kurir Pesanan"
                  : "Detail Informasi Pesanan"}
              </span>
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
          {/* Section 1: Ringkasan Paket & Rincian Pesanan (Read-only on both modes) */}
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
                  {Number(order.quantity) > 0
                    ? `${order.quantity} ${order.unit}`
                    : ((order.unit || "").toLowerCase() === "kg" ? "Menunggu Timbang" : `${order.quantity} ${order.unit}`)}
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
                  {Number(order.quantity) > 0
                    ? formatRupiah(grandTotal)
                    : ((order.unit || "").toLowerCase() === "kg" ? "Menunggu Timbang" : formatRupiah(grandTotal))}
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

            {/* Section Penimbangan Berat Cucian (Khusus Layanan Kg / Kiloan) */}
            {((order.unit || "").toLowerCase() === "kg" || (order.service_type || "").toLowerCase().includes("kilo")) && (
              <div className="mt-4 bg-sky-50/40 border border-sky-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200">
                      <Scale size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Penimbangan Berat Cucian (Layanan Kiloan)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Input berat riil setelah cucian selesai dipacking untuk menetapkan total tagihan pesanan.
                      </p>
                    </div>
                  </div>
                  <div>
                    {Number(order.quantity) > 0 ? (
                      <Badge variant="success" className="text-xs">
                        <CheckCircle size={12} className="mr-1 inline" />
                        Sudah Ditimbang ({order.quantity} kg)
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-xs">
                        Menunggu Penimbangan
                      </Badge>
                    )}
                  </div>
                </div>

                {isEdit ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Berat Aktual Cucian (kg)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          placeholder="Masukkan berat, contoh: 3.5"
                          value={actualWeight}
                          onChange={(e) => setActualWeight(e.target.value)}
                          className="w-full pl-3 pr-12 py-2.5 bg-white border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl text-xs font-bold text-slate-900 transition-all outline-hidden"
                        />
                        <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                          kg
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Gunakan tanda titik (.) untuk nilai desimal, misal 2.75 atau 3.5.
                      </p>
                    </div>

                    <div className="p-3.5 bg-white border border-sky-200/80 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Tarif Layanan:</span>
                        <span className="font-semibold">{formatRupiah(order.price_per_unit)} / kg</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal ({parseFloat(actualWeight) || 0} kg):</span>
                        <span className="font-bold text-slate-900">
                          {formatRupiah((parseFloat(actualWeight) || 0) * order.price_per_unit)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Ongkir & Diskon:</span>
                        <span className="font-semibold text-emerald-600">
                          +{formatRupiah(order.delivery_fee)} {order.discount > 0 ? `(-${formatRupiah(order.discount)})` : ""}
                        </span>
                      </div>
                      <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-sky-800 text-xs">
                        <span>Total Tagihan Baru:</span>
                        <span>
                          {formatRupiah(
                            Math.max(
                              0,
                              (parseFloat(actualWeight) || 0) * order.price_per_unit +
                                order.delivery_fee -
                                order.discount,
                            ),
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Hasil Timbangan Cucian:</span>
                    <span className="font-bold text-slate-900">
                      {Number(order.quantity) > 0 ? `${order.quantity} kg` : "Belum diinput petugas laundry"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Informasi Pemesan / Pelanggan */}
          <div className="space-y-3 pt-1">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Informasi Pemesan / Pelanggan</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rincian akun pelanggan yang melakukan pemesanan laundry ini:
                </p>
              </div>
              {order.customer_member_tier && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Crown size={13} className="text-amber-600" />
                  {order.customer_member_tier}
                </span>
              )}
            </div>

            <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5">
              {order.customer_name || order.user_name ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-base border border-sky-200 shrink-0">
                      {(order.customer_name ||
                        order.user_name)![0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Nama Pelanggan
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">
                        {order.customer_name || order.user_name}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                        {(order.customer_phone || order.user_phone) && (
                          <div className="flex items-center gap-1.5 font-medium text-sky-700">
                            <Phone
                              size={12}
                              className="text-sky-600 shrink-0"
                            />
                            <span>
                              {order.customer_phone || order.user_phone}
                            </span>
                          </div>
                        )}
                        {(order.customer_email || order.user_email) && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Mail
                              size={12}
                              className="text-slate-400 shrink-0"
                            />
                            <span>
                              {order.customer_email || order.user_email}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Action WhatsApp */}
                  {(order.customer_phone || order.user_phone) && (
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/${(order.customer_phone || order.user_phone || "").replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <MessageCircle size={14} />
                        <span>Chat WhatsApp Pelanggan</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">
                  Data akun pelanggan tidak tercatat pada sistem untuk pesanan
                  ini.
                </div>
              )}

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

              {/* Rating & Review Section if provided */}
              {Boolean(order.rating) && (
                <div className="mt-4 pt-3.5 border-t border-slate-200/80 bg-amber-50/60 p-4 rounded-xl border border-amber-200/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={15}
                            className={
                              i < (order.rating || 0)
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-300"
                            }
                          />
                        ))}
                      </div>
                      <span className="font-bold text-xs text-amber-900">
                        {order.rating} / 5 Bintang
                      </span>
                    </div>
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

          {/* Section: Status & Bukti Pembayaran (Manual Transfer / Proof) */}
          <div className="space-y-3 pt-1">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Informasi & Verifikasi Pembayaran</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Status pembayaran dan bukti transfer yang diunggah oleh
                  pelanggan (Format WebP &le; 1MB):
                </p>
              </div>
              <div className="flex items-center gap-2">
                {paymentStatus?.status === "PAID" ? (
                  <Badge variant="success" className="text-xs">
                    <CheckCircle size={13} className="mr-1 inline" />
                    Lunas
                  </Badge>
                ) : paymentStatus?.proof_image ? (
                  <Badge variant="warning" className="text-xs">
                    Menunggu Verifikasi Bukti
                  </Badge>
                ) : (
                  <Badge variant="danger" className="text-xs">
                    Belum Dibayar
                  </Badge>
                )}
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">
                    Metode Pembayaran
                  </span>
                  <p className="text-xs font-bold text-slate-900 mt-1">
                    {paymentStatus?.payment_method
                      ? paymentStatus.payment_method.replace(/_/g, " ")
                      : "-"}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">
                    Total Nominal Tagihan
                  </span>
                  <p className="text-xs font-bold text-sky-700 mt-1">
                    {formatRupiah(
                      order.price_per_unit * order.quantity +
                        order.delivery_fee -
                        order.discount,
                    )}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">
                    Status Verifikasi
                  </span>
                  <p className="text-xs font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                    {paymentStatus?.status === "PAID" ? (
                      <span className="text-emerald-700 font-bold">
                        Terverifikasi Lunas
                      </span>
                    ) : paymentStatus?.proof_image ? (
                      <span className="text-amber-700 font-bold">
                        Menunggu Cek Admin
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">
                        Belum Ada Bukti Bayar
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Bukti Transfer Image & Actions */}
              {paymentStatus?.proof_image ? (
                <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      onClick={() => setIsImageModalOpen(true)}
                      className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer group shrink-0"
                    >
                      <img
                        src={`${appConfig.backendUrl}${paymentStatus.proof_image}`}
                        alt="Bukti Transfer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Maximize2 size={16} />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Foto Bukti Transfer
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Gambar otomatis dikonversi ke WebP untuk performa
                        ringan.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsImageModalOpen(true)}
                        className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline mt-1.5 flex items-center gap-1 cursor-pointer"
                      >
                        <Maximize2 size={13} />
                        <span>Lihat Ukuran Penuh</span>
                      </button>
                    </div>
                  </div>

                  {paymentStatus.status !== "PAID" && (
                    <Button
                      type="button"
                      onClick={handleConfirmPayment}
                      disabled={confirmPaymentMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      {confirmPaymentMutation.isPending ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Check size={15} />
                      )}
                      <span>Konfirmasi Pembayaran Lunas</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-white border border-dashed border-slate-300 rounded-xl flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    Pelanggan belum mengunggah foto bukti pembayaran untuk
                    pesanan ini.
                  </div>
                  {paymentStatus?.status !== "PAID" && (
                    <Button
                      type="button"
                      onClick={handleConfirmPayment}
                      disabled={confirmPaymentMutation.isPending}
                      variant="outline"
                      className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-xs rounded-xl px-3.5 py-2 cursor-pointer"
                    >
                      <Check size={14} className="mr-1.5" />
                      Konfirmasi Lunas Manual
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Status Pengerjaan Cucian (Interactive on Edit mode, Readonly/Disabled on Detail mode) */}
          <div className="space-y-3 pt-1">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Status Pengerjaan Cucian</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEdit
                  ? "Pilih salah satu tahapan status SOP laundry di bawah ini untuk memperbarui proses cucian:"
                  : "Status tahapan pengerjaan pesanan saat ini:"}
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
                          ? "bg-sky-50 border-sky-400 font-bold opacity-100 cursor-default"
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

          {/* Section 3: Penugasan Kurir (Interactive Form on Edit mode, Pure Readonly on Detail mode) */}
          <div className="space-y-4 pt-1">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Penugasan Kurir Antar-Jemput</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEdit
                  ? isCourierFormDisabled
                    ? "Form penugasan kurir dinonaktifkan karena cucian sudah melewati tahap penjemputan:"
                    : "Tugaskan petugas kurir untuk penjemputan atau pengantaran pesanan ini:"
                  : "Informasi petugas kurir yang menangani pesanan ini:"}
              </p>
            </div>

            {isEdit ? (
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4">
                {isCourierFormDisabled && (
                  <div className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800">
                    <Info size={15} className="text-amber-600 shrink-0" />
                    <span>
                      Penugasan kurir dinonaktifkan karena status pesanan telah
                      berada di tahap{" "}
                      <strong>
                        {selectedStatusObj?.name || selectedStatusName}
                      </strong>
                      .
                    </span>
                  </div>
                )}

                {/* Select from registered staff */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Pilih Petugas Kurir Terdaftar
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select
                        key={selectedCourierUserId || "empty"}
                        value={selectedCourierUserId || undefined}
                        onValueChange={(val) => handleCourierUserSelect(val)}
                        disabled={
                          isCourierFormDisabled ||
                          isLoadingUsers ||
                          updateOrderMutation.isPending
                        }
                      >
                        <SelectTrigger
                          clearable={
                            !isCourierFormDisabled &&
                            Boolean(
                              selectedCourierUserId ||
                              courierName ||
                              courierPhone,
                            )
                          }
                          onClear={handleClearCourier}
                          className={cn(
                            "w-full bg-white border-slate-200 rounded-xl text-xs text-slate-900 h-10 focus:ring-1 focus:ring-sky-500 focus:border-sky-500",
                            isCourierFormDisabled &&
                              "bg-slate-100/90 text-slate-400 border-slate-200 cursor-not-allowed select-none",
                          )}
                        >
                          <SelectValue placeholder="Pilih Petugas Kurir Terdaftar" />
                        </SelectTrigger>
                        <SelectContent className="z-[60]">
                          {registeredCouriers.length > 0 ? (
                            <SelectGroup>
                              <SelectLabel>Daftar Petugas Kurir</SelectLabel>
                              {registeredCouriers.map((u) => (
                                <SelectItem key={u.id} value={String(u.id)}>
                                  {u.name} ({u.role_name || u.role_code}){" "}
                                  {u.phone ? `• ${u.phone}` : ""}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ) : (
                            <div className="py-2.5 px-3 text-center text-xs text-slate-400 italic">
                              Tidak ada data kurir aktif terdaftar
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {!isCourierFormDisabled &&
                      (courierName ||
                        courierPhone ||
                        selectedCourierUserId) && (
                        <button
                          type="button"
                          onClick={handleClearCourier}
                          className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer shrink-0"
                          title="Hapus penugasan kurir"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Input Nama Kurir */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nama Kurir
                    </label>
                    <div className="relative">
                      <UserIcon
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        placeholder="Nama Kurir"
                        disabled={
                          isCourierFormDisabled || updateOrderMutation.isPending
                        }
                        className={cn(
                          "w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-600 transition-colors",
                          isCourierFormDisabled &&
                            "bg-slate-100/90 text-slate-500 border-slate-200 cursor-not-allowed",
                        )}
                      />
                    </div>
                  </div>

                  {/* Input No. Telepon Kurir */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nomor Telepon / WhatsApp Kurir
                    </label>
                    <div
                      className={cn(
                        "flex items-center bg-white border border-slate-200 rounded-xl focus-within:border-sky-600 focus-within:ring-1 focus-within:ring-sky-500/20 transition-colors h-[42px]",
                        isCourierFormDisabled &&
                          "bg-slate-100/90 border-slate-200 cursor-not-allowed",
                      )}
                    >
                      <span className="pl-3.5 pr-1.5 text-xs text-slate-700 font-medium select-none shrink-0 flex items-center gap-1.5">
                        <Phone size={14} className="text-slate-400 shrink-0" />
                        <span>+62</span>
                      </span>
                      <input
                        type="text"
                        value={stripCountryCode(courierPhone || "")}
                        onChange={(e) => {
                          const stripped = stripCountryCode(e.target.value);
                          setCourierPhone(stripped ? `+62 ${stripped}` : "");
                        }}
                        placeholder="812-xxxx-xxxx"
                        disabled={
                          isCourierFormDisabled || updateOrderMutation.isPending
                        }
                        className={cn(
                          "w-full bg-transparent pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none",
                          isCourierFormDisabled &&
                            "cursor-not-allowed text-slate-500",
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
                      order.courier_name
                        ? "bg-sky-100 text-sky-700 border-sky-200"
                        : "bg-slate-100 text-slate-400 border-slate-200",
                    )}
                  >
                    <UserIcon size={22} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Kurir Bertugas
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {order.courier_name || "Belum ada kurir ditugaskan"}
                    </div>
                    {order.courier_phone ? (
                      <div className="text-xs text-sky-700 font-medium flex items-center gap-1.5 mt-0.5">
                        <Phone size={12} className="shrink-0" />
                        <span>{order.courier_phone}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {order.courier_name
                          ? "Nomor telepon tidak dicantumkan"
                          : "Belum ada kurir yang ditugaskan"}
                      </div>
                    )}
                  </div>
                </div>

                {order.courier_name && (
                  <div className="flex items-center gap-2">
                    <Badge variant="success" className="text-xs">
                      <UserCheck size={12} className="mr-1 inline" />
                      Aktif Bertugas
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Logistik & Alamat Pengiriman (Readonly on both modes) */}
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

          {/* Section 5: Stepper Timeline (Readonly on Detail mode) */}
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

          {/* Bottom Actions (Hanya pada mode Edit) */}
          {isEdit && (
            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <Link
                href="/order"
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </Link>
              <Button
                type="submit"
                disabled={updateOrderMutation.isPending}
                className="px-6 py-2.5 h-auto bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:cursor-not-allowed"
              >
                {updateOrderMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </form>

      {/* Universal Confirm Dialog */}
      {isEdit && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          description={confirmDialog.description}
          variant={confirmDialog.variant}
          confirmText={confirmDialog.confirmText}
          isLoading={updateOrderMutation.isPending}
          onConfirm={confirmDialog.onConfirm}
          onClose={() =>
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
          }
        />
      )}

      {/* Modal Preview Bukti Transfer (WebP Fullscreen Preview) */}
      {isImageModalOpen && paymentStatus?.proof_image && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-5 overflow-hidden shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileCheck size={16} className="text-sky-600" />
                <span>Bukti Pembayaran Pelanggan</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950/5 flex items-center justify-center max-h-[70vh]">
              <img
                src={`${appConfig.backendUrl}${paymentStatus.proof_image}`}
                alt="Bukti Transfer Full"
                className="w-full h-auto max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500 font-medium">
                Format: WebP (Dikompres &le; 1MB)
              </span>
              <Button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl px-4 py-2 cursor-pointer"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
