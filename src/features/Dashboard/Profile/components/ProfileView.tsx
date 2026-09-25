"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Calendar,
  Sparkles,
  MapPin,
  Coins,
  Wallet,
  HelpCircle,
  CheckCircle,
} from "lucide-react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatRupiah, formatDate, formatPhoneNumber } from "@/lib/utils";
import {
  useProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} from "@/hooks/useProfileQuery";
import { useAuthStore } from "@/store/useAuthStore";
import { DEFAULT_SECURITY_QUESTIONS } from "@/constants/securityQuestions";

// Skema Validasi Edit Profil
const profileSchema = z.object({
  name: z.string().trim().min(2, "Nama lengkap minimal 2 karakter"),
  email: z.string().trim().email("Format email tidak valid"),
  phone: z
    .string()
    .trim()
    .min(8, "Nomor telepon/HP minimal 8 digit")
    .max(25, "Nomor telepon/HP maksimal 25 karakter"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// Skema Validasi Ganti Password
const passwordSchema = z
  .object({
    old_password: z.string().min(1, "Password lama wajib diisi"),
    new_password: z.string().min(6, "Password baru minimal 6 karakter"),
    confirm_password: z.string().min(1, "Konfirmasi password baru wajib diisi"),
    question_1: z.string().optional(),
    answer_1: z.string().optional(),
    question_2: z.string().optional(),
    answer_2: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.new_password !== data.confirm_password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Konfirmasi password tidak cocok dengan password baru",
        path: ["confirm_password"],
      });
    }
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export const ProfileView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"info" | "security" | "addresses">("info");
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const { availableRoles, currentRole } = useAuthStore();
  const { data: profile, isLoading } = useProfileQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const changePasswordMutation = useChangePasswordMutation();

  // Deteksi role pelanggan secara dinamis tanpa hardcode kaku
  const isCustomer = React.useMemo(() => {
    if (profile?.is_customer !== undefined) return profile.is_customer;
    const targetCode = (profile?.role_code || currentRole || "").toLowerCase().trim();
    if (targetCode === "customer" || targetCode === "pelanggan") return true;
    const matched = availableRoles.find((r) => r.code?.toLowerCase().trim() === targetCode);
    if (matched) {
      const n = (matched.name || "").toLowerCase();
      return n.includes("pelanggan") || n.includes("customer");
    }
    return false;
  }, [profile, currentRole, availableRoles]);

  const needsSecurityQuestions = isCustomer && !profile?.has_security_questions;

  // Form Profil
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: errorsProfile, isDirty: isProfileDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  // Form Password
  const {
    register: registerPassword,
    control: controlPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    setError: setErrorPassword,
    formState: { errors: errorsPassword },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      old_password: "",
      new_password: "",
      confirm_password: "",
      question_1: DEFAULT_SECURITY_QUESTIONS[0],
      answer_1: "",
      question_2: DEFAULT_SECURITY_QUESTIONS[1],
      answer_2: "",
    },
  });

  // Set nilai default form saat data profile selesai dimuat
  useEffect(() => {
    if (profile) {
      resetProfile({
        name: profile.name_users || profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
      });
    }
  }, [profile, resetProfile]);

  const onSubmitProfile = async (data: ProfileFormData) => {
    try {
      await updateProfileMutation.mutateAsync({
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
      });
      toast.success("Profil Anda berhasil diperbarui!");
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui profil");
    }
  };

  const onSubmitPassword = async (data: PasswordFormData) => {
    if (needsSecurityQuestions) {
      const q1 = data.question_1?.trim();
      const a1 = data.answer_1?.trim();
      const q2 = data.question_2?.trim();
      const a2 = data.answer_2?.trim();

      if (!q1) {
        setErrorPassword("question_1", { message: "Pertanyaan keamanan 1 wajib diisi/dipilih" });
        return;
      }
      if (!a1 || a1.length < 2) {
        setErrorPassword("answer_1", { message: "Jawaban pertanyaan 1 minimal 2 karakter" });
        return;
      }
      if (!q2) {
        setErrorPassword("question_2", { message: "Pertanyaan keamanan 2 wajib diisi/dipilih" });
        return;
      }
      if (!a2 || a2.length < 2) {
        setErrorPassword("answer_2", { message: "Jawaban pertanyaan 2 minimal 2 karakter" });
        return;
      }
      if (q1.toLowerCase() === q2.toLowerCase()) {
        setErrorPassword("question_2", { message: "Pertanyaan 1 dan 2 tidak boleh sama" });
        return;
      }
    }

    try {
      await changePasswordMutation.mutateAsync({
        old_password: data.old_password,
        new_password: data.new_password,
        ...(needsSecurityQuestions
          ? {
              question_1: data.question_1?.trim(),
              answer_1: data.answer_1?.trim(),
              question_2: data.question_2?.trim(),
              answer_2: data.answer_2?.trim(),
            }
          : {}),
      });
      toast.success("Password Anda berhasil diperbarui!");
      resetPassword({
        old_password: "",
        new_password: "",
        confirm_password: "",
        question_1: DEFAULT_SECURITY_QUESTIONS[0],
        answer_1: "",
        question_2: DEFAULT_SECURITY_QUESTIONS[1],
        answer_2: "",
      });
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui password");
    }
  };

  const userName = profile?.name_users || profile?.name || "Pengguna";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-700 uppercase tracking-wider">
            <span>Pengaturan Akun</span>
            <span>/</span>
            <span>Profil Saya</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Profil Pengguna & Keamanan
          </h1>
        </div>
      </div>

      {/* 2. Ringkasan Kartu Identitas Akun */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-sky-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-sky-600/20 shrink-0">
              {userInitials || <User size={28} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {isLoading ? "Memuat profil..." : userName}
                </h2>
                {profile?.role_code && (
                  <Badge variant="primary" className="uppercase font-mono text-[10px]">
                    {profile.role_code}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{profile?.email || "-"}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1">
                  <Phone size={13} className="text-slate-400" />
                  <span>{formatPhoneNumber(profile?.phone || "") || profile?.phone || "-"}</span>
                </span>
                {profile?.created_at && (
                  <span className="flex items-center gap-1">
                    <Calendar size={13} className="text-slate-400" />
                    <span>Terdaftar sejak {formatDate(profile.created_at)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Statistik / Keanggotaan jika ada */}
          <div className="flex items-center gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            {profile?.member_tier && (
              <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center min-w-[90px]">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">
                  Tier
                </span>
                <span className="text-xs font-bold text-sky-700 flex items-center justify-center gap-1 mt-0.5">
                  <Sparkles size={12} />
                  {profile.member_tier}
                </span>
              </div>
            )}
            {profile?.laundry_pay_balance !== undefined && (
              <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center min-w-[110px]">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">
                  LaundryPay
                </span>
                <span className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1 mt-0.5">
                  <Wallet size={12} />
                  {formatRupiah(profile.laundry_pay_balance || 0)}
                </span>
              </div>
            )}
            {profile?.reward_points !== undefined && (
              <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center min-w-[90px]">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">
                  Poin
                </span>
                <span className="text-xs font-bold text-amber-600 flex items-center justify-center gap-1 mt-0.5">
                  <Coins size={12} />
                  {profile.reward_points || 0}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Tab Navigasi Pengaturan Profil */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 sm:px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer",
              activeTab === "info"
                ? "bg-white text-blue-600 border-blue-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/50",
            )}
          >
            <User size={14} />
            <span>Informasi Akun</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer",
              activeTab === "security"
                ? "bg-white text-blue-600 border-blue-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/50",
            )}
          >
            <Shield size={14} />
            <span>Keamanan & Password</span>
          </button>
          {profile?.addresses && profile.addresses.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("addresses")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer",
                activeTab === "addresses"
                  ? "bg-white text-blue-600 border-blue-600 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/50",
              )}
            >
              <MapPin size={14} />
              <span>Alamat ({profile.addresses.length})</span>
            </button>
          )}
        </div>

        {/* Isi Konten Tab */}
        <div className="p-4 sm:p-6">
          {/* TAB 1: INFORMASI PROFIL */}
          {activeTab === "info" && (
            <form
              onSubmit={handleSubmitProfile(onSubmitProfile)}
              className="max-w-2xl space-y-4 text-xs"
            >
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    {...registerProfile("name")}
                    placeholder="Nama Lengkap"
                    className={cn(
                      "w-full h-[36px] bg-white border rounded-md pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                      errorsProfile.name
                        ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                        : "border-slate-300 focus:border-blue-500",
                    )}
                  />
                </div>
                {errorsProfile.name && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errorsProfile.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Alamat Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    {...registerProfile("email")}
                    placeholder="nama@email.com"
                    className={cn(
                      "w-full h-[36px] bg-white border rounded-md pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                      errorsProfile.email
                        ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                        : "border-slate-300 focus:border-blue-500",
                    )}
                  />
                </div>
                {errorsProfile.email && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errorsProfile.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Nomor HP / WhatsApp <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    {...registerProfile("phone")}
                    placeholder="08123456789"
                    className={cn(
                      "w-full h-[36px] bg-white border rounded-md pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                      errorsProfile.phone
                        ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                        : "border-slate-300 focus:border-blue-500",
                    )}
                  />
                </div>
                {errorsProfile.phone && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1">
                    {errorsProfile.phone.message}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending || !isProfileDirty}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: KEAMANAN & PASSWORD */}
          {activeTab === "security" && (
            <div className="max-w-2xl space-y-5">
              {/* Status Pertanyaan Keamanan untuk Akun Pelanggan yang Sudah Terdaftar */}
              {isCustomer && profile?.has_security_questions && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckCircle size={16} className="text-emerald-600" />
                    <span>2 Pertanyaan Keamanan Telah Aktif</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    Pertanyaan keamanan berikut akan digunakan otomatis untuk memverifikasi akun Anda jika sewaktu-waktu lupa kata sandi:
                  </p>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-emerald-800 shrink-0">1.</span>
                      <span className="font-medium text-slate-800">
                        {profile.security_questions?.question_1 || "Pertanyaan Keamanan 1"}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-emerald-800 shrink-0">2.</span>
                      <span className="font-medium text-slate-800">
                        {profile.security_questions?.question_2 || "Pertanyaan Keamanan 2"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Banner Peringatan untuk Akun Pelanggan yang Baru Pertama Kali Ganti Password */}
              {needsSecurityQuestions && (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-sky-900 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-sky-800">
                    <HelpCircle size={16} className="text-sky-600 shrink-0" />
                    <span>Pengaturan Pertanyaan Keamanan (Wajib Pertama Kali)</span>
                  </div>
                  <p className="text-[11px] text-sky-700 leading-relaxed">
                    Khusus akun pelanggan: Karena akun baru menggunakan kata sandi bawaan, Anda wajib mengatur <strong>2 Pertanyaan Keamanan</strong> saat pertama kali mengganti kata sandi. Pertanyaan ini akan digunakan untuk memulihkan akun saat Anda lupa kata sandi di masa mendatang.
                  </p>
                </div>
              )}

              <form
                onSubmit={handleSubmitPassword(onSubmitPassword)}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Password Saat Ini (Lama) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={showOldPass ? "text" : "password"}
                      {...registerPassword("old_password")}
                      placeholder="Masukkan kata sandi saat ini"
                      className={cn(
                        "w-full h-[36px] bg-white border rounded-md pl-9 pr-10 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                        errorsPassword.old_password
                          ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                          : "border-slate-300 focus:border-blue-500",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPass(!showOldPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showOldPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errorsPassword.old_password && (
                    <p className="text-[10px] text-rose-500 font-medium mt-1">
                      {errorsPassword.old_password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Password Baru <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={showNewPass ? "text" : "password"}
                      {...registerPassword("new_password")}
                      placeholder="Minimal 6 karakter"
                      className={cn(
                        "w-full h-[36px] bg-white border rounded-md pl-9 pr-10 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                        errorsPassword.new_password
                          ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                          : "border-slate-300 focus:border-blue-500",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errorsPassword.new_password && (
                    <p className="text-[10px] text-rose-500 font-medium mt-1">
                      {errorsPassword.new_password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Konfirmasi Password Baru <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      {...registerPassword("confirm_password")}
                      placeholder="Ulangi password baru"
                      className={cn(
                        "w-full h-[36px] bg-white border rounded-md pl-9 pr-10 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                        errorsPassword.confirm_password
                          ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                          : "border-slate-300 focus:border-blue-500",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errorsPassword.confirm_password && (
                    <p className="text-[10px] text-rose-500 font-medium mt-1">
                      {errorsPassword.confirm_password.message}
                    </p>
                  )}
                </div>

                {/* FORM PERTANYAAN KEAMANAN (Jika role pelanggan & belum set pertanyaan) */}
                {needsSecurityQuestions && (
                  <div className="pt-3 border-t border-slate-200 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <HelpCircle size={15} className="text-sky-600" />
                      <span>Atur 2 Pertanyaan Keamanan</span>
                    </div>

                    {/* Pertanyaan 1 */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Pertanyaan Keamanan 1 <span className="text-rose-500">*</span>
                        </label>
                        <Controller
                          control={controlPassword}
                          name="question_1"
                          render={({ field }) => (
                            <Select
                              key={field.value || "empty1"}
                              value={field.value || DEFAULT_SECURITY_QUESTIONS[0]}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger
                                clearable={Boolean(field.value)}
                                onClear={() =>
                                  field.onChange(DEFAULT_SECURITY_QUESTIONS[0])
                                }
                                className={cn(
                                  "w-full bg-white border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 h-[36px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-none",
                                  errorsPassword.question_1 &&
                                    "border-rose-400 focus:border-rose-500 bg-rose-50/30",
                                )}
                              >
                                <SelectValue placeholder="Pilih Pertanyaan Keamanan 1" />
                              </SelectTrigger>
                              <SelectContent>
                                {DEFAULT_SECURITY_QUESTIONS.map((q) => (
                                  <SelectItem key={q} value={q}>
                                    {q}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errorsPassword.question_1 && (
                          <p className="text-[10px] text-rose-500 font-medium mt-1">
                            {errorsPassword.question_1.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Jawaban Pertanyaan 1 <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...registerPassword("answer_1")}
                          placeholder="Masukkan jawaban Anda (tidak case sensitive)"
                          className={cn(
                            "w-full h-[36px] bg-white border rounded-md px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                            errorsPassword.answer_1
                              ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                              : "border-slate-300 focus:border-blue-500",
                          )}
                        />
                        {errorsPassword.answer_1 && (
                          <p className="text-[10px] text-rose-500 font-medium mt-1">
                            {errorsPassword.answer_1.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pertanyaan 2 */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Pertanyaan Keamanan 2 <span className="text-rose-500">*</span>
                        </label>
                        <Controller
                          control={controlPassword}
                          name="question_2"
                          render={({ field }) => (
                            <Select
                              key={field.value || "empty2"}
                              value={field.value || DEFAULT_SECURITY_QUESTIONS[1]}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger
                                clearable={Boolean(field.value)}
                                onClear={() =>
                                  field.onChange(DEFAULT_SECURITY_QUESTIONS[1])
                                }
                                className={cn(
                                  "w-full bg-white border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 h-[36px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-none",
                                  errorsPassword.question_2 &&
                                    "border-rose-400 focus:border-rose-500 bg-rose-50/30",
                                )}
                              >
                                <SelectValue placeholder="Pilih Pertanyaan Keamanan 2" />
                              </SelectTrigger>
                              <SelectContent>
                                {DEFAULT_SECURITY_QUESTIONS.map((q) => (
                                  <SelectItem key={q} value={q}>
                                    {q}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errorsPassword.question_2 && (
                          <p className="text-[10px] text-rose-500 font-medium mt-1">
                            {errorsPassword.question_2.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Jawaban Pertanyaan 2 <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...registerPassword("answer_2")}
                          placeholder="Masukkan jawaban Anda (tidak case sensitive)"
                          className={cn(
                            "w-full h-[36px] bg-white border rounded-md px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors",
                            errorsPassword.answer_2
                              ? "border-rose-400 focus:border-rose-500 bg-rose-50/30"
                              : "border-slate-300 focus:border-blue-500",
                          )}
                        />
                        {errorsPassword.answer_2 && (
                          <p className="text-[10px] text-rose-500 font-medium mt-1">
                            {errorsPassword.answer_2.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium rounded-md shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Memperbarui Password...</span>
                      </>
                    ) : (
                      <>
                        <Shield size={14} />
                        <span>Perbarui Password & Keamanan</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: DAFTAR ALAMAT */}
          {activeTab === "addresses" && profile?.addresses && (
            <div className="space-y-3">
              {profile.addresses.map((addr, idx) => (
                <div
                  key={addr.id || idx}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{addr.label}</span>
                      {addr.is_default && (
                        <Badge variant="success" className="text-[10px]">
                          Utama
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">{addr.full_address}</p>
                    {addr.note && (
                      <p className="text-[11px] text-slate-400 italic">Catatan: {addr.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
