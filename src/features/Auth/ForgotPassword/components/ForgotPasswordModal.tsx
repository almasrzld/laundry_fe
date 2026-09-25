"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Mail,
  ShieldAlert,
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

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
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

  if (!isOpen) return null;

  const handleResetAll = () => {
    setStep(1);
    setIdentifier("");
    setSessionData(null);
    setAnswer1("");
    setAnswer2("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  };

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
      handleResetAll();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Gagal mereset kata sandi. Silakan coba lagi.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="px-6 pt-6 pb-4 bg-sky-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
                <KeyRound size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold leading-none">Lupa Kata Sandi</h2>
                <p className="text-[11px] text-sky-100 mt-1">
                  Pemulihan Akun via Pertanyaan Keamanan
                </p>
              </div>
            </div>
            <button
              onClick={handleResetAll}
              className="text-white/80 hover:text-white text-lg font-bold px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Stepper Indikator */}
          <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/15 text-[11px] font-semibold">
            <div
              className={cn(
                "flex items-center gap-1.5",
                step >= 1 ? "text-white" : "text-white/50"
              )}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Identitas</span>
            </div>
            <div className="w-8 h-[1px] bg-white/20" />
            <div
              className={cn(
                "flex items-center gap-1.5",
                step >= 2 ? "text-white" : "text-white/50"
              )}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Pertanyaan</span>
            </div>
            <div className="w-8 h-[1px] bg-white/20" />
            <div
              className={cn(
                "flex items-center gap-1.5",
                step >= 3 ? "text-white" : "text-white/50"
              )}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                3
              </span>
              <span>Sandi Baru</span>
            </div>
          </div>
        </div>

        {/* Isi Modal */}
        <div className="p-6 overflow-y-auto">
          {/* LANGKAH 1: MASUKKAN EMAIL / NOMOR HP */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4 text-xs">
              <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-2xl text-sky-900 text-[11.5px] leading-relaxed">
                Masukkan <strong>Email</strong> atau <strong>Nomor HP</strong> akun Anda yang terdaftar. Sistem akan mencocokkan pertanyaan keamanan yang telah Anda atur.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
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

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  onClick={handleResetAll}
                  variant="outline"
                  className="text-xs h-9 cursor-pointer"
                >
                  Batal
                </Button>
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

          {/* LANGKAH 2: JAWAB 2 PERTANYAAN KEAMANAN */}
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
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-600 transition-colors"
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
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-600 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
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

          {/* LANGKAH 3: ATUR KATA SANDI BARU */}
          {step === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-[11px] flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Pertanyaan keamanan terverifikasi! Masukkan kata sandi baru untuk akun Anda.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="submit"
                  disabled={resetMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-5 gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {resetMutation.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <span>Simpan Kata Sandi Baru</span>
                      <CheckCircle2 size={14} />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
