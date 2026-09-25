"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Waves,
  Mail,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCheckForgotPasswordMutation,
  useVerifySecurityQuestionsMutation,
  useResetPasswordWithTokenMutation,
} from "@/hooks/useForgotPasswordQuery";
import { cn } from "@/lib/utils";

export const ForgotPasswordView: React.FC = () => {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 State
  const [identifier, setIdentifier] = useState("");
  const [sessionData, setSessionData] = useState<{
    session_token: string;
    name: string;
    masked_email: string;
    masked_phone: string;
    question_1: string;
    question_2: string;
  } | null>(null);

  // Step 2 State
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");
  const [resetToken, setResetToken] = useState("");

  // Step 3 State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const checkMutation = useCheckForgotPasswordMutation();
  const verifyMutation = useVerifySecurityQuestionsMutation();
  const resetMutation = useResetPasswordWithTokenMutation();

  // Step 1: Submit Identifier
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error("Silakan masukkan email atau nomor HP Anda");
      return;
    }

    try {
      const res = await checkMutation.mutateAsync({ identifier: identifier.trim() });
      setSessionData(res);
      setStep(2);
      toast.success(`Akun atas nama ${res.name} ditemukan! Silakan jawab pertanyaan keamanan.`);
    } catch (err: any) {
      toast.error(err.message || "Pengguna tidak ditemukan atau belum memiliki pertanyaan keamanan.");
    }
  };

  // Step 2: Submit Answers
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer1.trim() || !answer2.trim()) {
      toast.error("Harap jawab kedua pertanyaan keamanan");
      return;
    }

    if (!sessionData?.session_token) {
      toast.error("Sesi tidak valid. Silakan ulangi.");
      setStep(1);
      return;
    }

    try {
      const res = await verifyMutation.mutateAsync({
        session_token: sessionData.session_token,
        answer_1: answer1.trim(),
        answer_2: answer2.trim(),
      });
      setResetToken(res.reset_token);
      setStep(3);
      toast.success("Verifikasi pertanyaan keamanan berhasil! Silakan buat kata sandi baru.");
    } catch (err: any) {
      toast.error(err.message || "Jawaban pertanyaan keamanan salah. Coba lagi.");
    }
  };

  // Step 3: Submit New Password
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Kata sandi baru minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi kata sandi tidak cocok");
      return;
    }
    if (!resetToken) {
      toast.error("Token reset tidak valid. Silakan ulangi.");
      setStep(1);
      return;
    }

    try {
      await resetMutation.mutateAsync({
        reset_token: resetToken,
        new_password: newPassword,
      });
      toast.success("Kata sandi berhasil direset! Silakan login dengan kata sandi baru.");
      router.push("/auth/login");
    } catch (err: any) {
      toast.error(err.message || "Gagal mereset kata sandi. Silakan coba lagi.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-sky-100 p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/30 mb-2">
            <Waves size={28} className="stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Lupa Kata Sandi
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Pemulihan kata sandi pelanggan menggunakan 2 Pertanyaan Keamanan
          </p>
        </div>

        {/* Stepper Indikator */}
        <div className="flex items-center justify-between p-3 bg-sky-50 border border-sky-100 rounded-2xl text-[11px] font-semibold text-slate-700">
          <div
            className={cn(
              "flex items-center gap-1.5",
              step >= 1 ? "text-sky-700 font-bold" : "text-slate-400"
            )}
          >
            <span
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                step >= 1 ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-600"
              )}
            >
              1
            </span>
            <span>Identitas</span>
          </div>
          <div className="w-6 sm:w-10 h-[1px] bg-slate-200" />
          <div
            className={cn(
              "flex items-center gap-1.5",
              step >= 2 ? "text-sky-700 font-bold" : "text-slate-400"
            )}
          >
            <span
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                step >= 2 ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-600"
              )}
            >
              2
            </span>
            <span>Pertanyaan</span>
          </div>
          <div className="w-6 sm:w-10 h-[1px] bg-slate-200" />
          <div
            className={cn(
              "flex items-center gap-1.5",
              step >= 3 ? "text-sky-700 font-bold" : "text-slate-400"
            )}
          >
            <span
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                step >= 3 ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-600"
              )}
            >
              3
            </span>
            <span>Sandi Baru</span>
          </div>
        </div>

        {/* LANGKAH 1 */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 text-[11.5px] leading-relaxed">
              Masukkan <strong>Email</strong> atau <strong>Nomor HP</strong> akun Anda. Kami akan mencari pertanyaan keamanan yang telah Anda atur.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email / Nomor HP <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="nama@email.com atau 08123456789"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                href="/auth/login"
                className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft size={13} />
                <span>Kembali ke Login</span>
              </Link>
              <Button
                type="submit"
                disabled={checkMutation.isPending}
                className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-9 px-5 gap-1.5 shadow-md shadow-sky-600/20 cursor-pointer"
              >
                {checkMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Memeriksa...</span>
                  </>
                ) : (
                  <>
                    <span>Lanjutkan</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* LANGKAH 2 */}
        {step === 2 && sessionData && (
          <form onSubmit={handleStep2Submit} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-[11px]">
              <div>
                <span className="text-slate-500 block">Akun Pengguna:</span>
                <strong className="text-slate-900">{sessionData.name}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Identitas:</span>
                <span className="text-slate-700 font-mono text-[10.5px]">
                  {sessionData.masked_email || sessionData.masked_phone}
                </span>
              </div>
            </div>

            {/* Pertanyaan 1 */}
            <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-start gap-1.5 text-xs font-bold text-slate-800">
                <HelpCircle size={15} className="text-sky-600 shrink-0 mt-0.5" />
                <span>1. {sessionData.question_1}</span>
              </div>
              <input
                type="text"
                value={answer1}
                onChange={(e) => setAnswer1(e.target.value)}
                placeholder="Ketik jawaban Anda..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-600 transition-colors"
              />
            </div>

            {/* Pertanyaan 2 */}
            <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-start gap-1.5 text-xs font-bold text-slate-800">
                <HelpCircle size={15} className="text-sky-600 shrink-0 mt-0.5" />
                <span>2. {sessionData.question_2}</span>
              </div>
              <input
                type="text"
                value={answer2}
                onChange={(e) => setAnswer2(e.target.value)}
                placeholder="Ketik jawaban Anda..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-600 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                onClick={() => setStep(1)}
                variant="outline"
                className="text-xs h-9 gap-1 cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Kembali</span>
              </Button>
              <Button
                type="submit"
                disabled={verifyMutation.isPending}
                className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-9 px-5 gap-1.5 shadow-md shadow-sky-600/20 cursor-pointer"
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <span>Verifikasi Jawaban</span>
                    <ShieldCheck size={14} />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* LANGKAH 3 */}
        {step === 3 && (
          <form onSubmit={handleStep3Submit} className="space-y-4 text-xs">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-[11.5px] flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Pertanyaan keamanan terverifikasi! Masukkan kata sandi baru akun Anda.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kata Sandi Baru <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showConfirmPass ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button
                type="submit"
                disabled={resetMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 px-5 gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                {resetMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan Kata Sandi Baru & Selesai</span>
                    <CheckCircle2 size={15} />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
