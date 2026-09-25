"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Waves,
  ArrowRight,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  RotateCw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { loginSchema, LoginSchema } from "@/schemas/auth.schema";
import { useLoginMutation } from "@/hooks/useAuthMutation";
import { ForgotPasswordModal } from "@/features/Auth/ForgotPassword";
import { PermanentLockoutModal } from "./PermanentLockoutModal";
import { cn } from "@/lib/utils";

export const LoginView: React.FC = () => {
  const router = useRouter();
  const { setRole, login } = useAuthStore();
  const loginMutation = useLoginMutation();
  const [showPassword, setShowPassword] = React.useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = React.useState(false);
  const [isPermanentLockoutOpen, setIsPermanentLockoutOpen] =
    React.useState(false);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = React.useState<number>(0);
  const [attemptInfo, setAttemptInfo] = React.useState<{
    current: number;
    max: number;
    remaining: number;
  } | null>(null);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [captchaCode, setCaptchaCode] = React.useState<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema) as any,
    defaultValues: {
      email: "",
      password: "",
      captcha: "",
    },
  });

  // Countdown timer saat akun terkunci sementara
  React.useEffect(() => {
    if (lockoutSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setLockoutSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSecondsLeft]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const generateCaptcha = React.useCallback(() => {
    const chars = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    return code;
  }, []);

  const drawCaptcha = React.useCallback((code: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background solid
    ctx.fillStyle = "#f0f9ff";
    ctx.fillRect(0, 0, width, height);

    // Random noise lines
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = ["#38bdf8", "#0284c7", "#94a3b8", "#64748b"][i % 4];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width,
        Math.random() * height,
        Math.random() * width,
        Math.random() * height,
        Math.random() * width,
        Math.random() * height,
      );
      ctx.stroke();
    }

    // Random noise dots
    for (let i = 0; i < 25; i++) {
      ctx.fillStyle = ["#0284c7", "#0369a1", "#94a3b8", "#0ea5e9"][i % 4];
      ctx.beginPath();
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // Draw characters with rotation and distinct colors
    const charList = code.split("");
    const startX = 14;
    const spacing = (width - 28) / charList.length;

    charList.forEach((char, idx) => {
      ctx.save();
      const x = startX + idx * spacing + spacing / 2;
      const y = height / 2 + 1;
      ctx.translate(x, y);
      const angle = (Math.random() - 0.5) * 0.4;
      ctx.rotate(angle);

      ctx.font = `bold ${Math.floor(20 + Math.random() * 4)}px 'Inter', system-ui, sans-serif`;
      ctx.fillStyle = ["#0369a1", "#0284c7", "#0f172a", "#1e293b", "#075985"][
        idx % 5
      ];
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(char, 0, 0);
      ctx.restore();
    });
  }, []);

  React.useEffect(() => {
    const code = generateCaptcha();
    drawCaptcha(code);
  }, [generateCaptcha, drawCaptcha]);

  const refreshCaptcha = () => {
    const code = generateCaptcha();
    drawCaptcha(code);
    setValue("captcha", "");
  };

  const onSubmit = async (data: LoginSchema) => {
    if (lockoutSecondsLeft > 0) {
      toast.error(
        `Akun sedang terkunci. Silakan tunggu ${formatCountdown(lockoutSecondsLeft)} lagi.`,
      );
      return;
    }

    if (data.captcha.trim() !== captchaCode) {
      setError("captcha", {
        type: "manual",
        message: "Kode keamanan tidak sesuai",
      });
      refreshCaptcha();
      return;
    }

    try {
      const res = await loginMutation.mutateAsync({
        email: data.email.trim(),
        password: data.password,
      });

      const roleCode = res?.user?.role_code || res?.user?.role || "";
      const userName = res?.user?.name || "Pengguna";
      const userEmail = res?.user?.email || data.email;
      const token = res?.token;

      login({
        email: userEmail,
        name: userName,
        role: roleCode,
        token: token,
      });
      if (roleCode) {
        setRole(roleCode);
      }

      setAttemptInfo(null);
      setLockoutSecondsLeft(0);
      toast.success(`Selamat datang, ${userName}! Login berhasil.`);
      router.push("/dashboard");
    } catch (err: any) {
      refreshCaptcha();
      const errPayload =
        err?.error || err?.response?.data?.error || err?.data?.error;
      const errorCode = errPayload?.code;

      if (
        errorCode === "ACCOUNT_PERMANENTLY_LOCKED" ||
        errPayload?.is_permanently_locked
      ) {
        setIsPermanentLockoutOpen(true);
        setAttemptInfo(null);
        toast.error("Akun Anda telah dinonaktifkan sementara demi keamanan.");
        return;
      }

      if (errorCode === "ACCOUNT_TEMPORARILY_LOCKED") {
        const remainingSec = errPayload?.remaining_seconds || 180;
        setLockoutSecondsLeft(remainingSec);
        setAttemptInfo(null);
        toast.error(
          err?.message ||
            `Akun Anda terkunci sementara. Silakan coba lagi dalam ${formatCountdown(remainingSec)}.`,
        );
        return;
      }

      if (
        errorCode === "INVALID_CREDENTIALS" &&
        errPayload?.remaining_attempts !== undefined
      ) {
        setAttemptInfo({
          current: errPayload.current_attempt,
          max: errPayload.max_attempts,
          remaining: errPayload.remaining_attempts,
        });
      }

      toast.error(
        err?.message ||
          "Login gagal. Periksa kembali email dan kata sandi Anda.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-sky-100 p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/30 mb-2">
            <Waves size={28} className="stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Almas Laundry
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Masuk ke portal manajemen sistem & operasional laundry
          </p>
        </div>

        {/* Lockout Warning Banner */}
        {lockoutSecondsLeft > 0 && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-900 animate-in fade-in duration-200">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl shrink-0 mt-0.5">
              <Lock size={16} />
            </div>
            <div className="flex-1 space-y-1">
              <p className="font-bold text-rose-800">Akun Terkunci Sementara</p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Batas percobaan salah telah tercapai. Silakan tunggu hingga
                hitung mundur selesai untuk mencoba lagi:
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 text-white font-mono font-bold text-xs rounded-lg mt-1 shadow-xs">
                <span>Tersisa {formatCountdown(lockoutSecondsLeft)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Attempt Warning Banner */}
        {attemptInfo && lockoutSecondsLeft === 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in duration-200">
            <AlertTriangle
              size={16}
              className="text-amber-600 shrink-0 mt-0.5"
            />
            <div className="text-[11px] space-y-0.5">
              <p className="font-bold text-amber-800">
                Percobaan salah ke-{attemptInfo.current} dari {attemptInfo.max}{" "}
                kali
              </p>
              <p className="text-slate-600">
                Tersisa{" "}
                <strong className="text-amber-700">
                  {attemptInfo.remaining}
                </strong>{" "}
                kesempatan lagi sebelum akun terkunci.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Email Pengguna <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="email"
                disabled={lockoutSecondsLeft > 0}
                {...register("email")}
                placeholder="Email Pengguna"
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none transition-colors",
                  errors.email
                    ? "border-rose-400 bg-rose-50/20"
                    : "border-slate-200 focus:border-sky-600 focus:bg-white",
                  lockoutSecondsLeft > 0 &&
                    "opacity-60 cursor-not-allowed bg-slate-100",
                )}
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-rose-500 mt-1 font-semibold">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Kata Sandi <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline transition-colors cursor-pointer"
              >
                Lupa Kata Sandi?
              </button>
            </div>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type={showPassword ? "text" : "password"}
                disabled={lockoutSecondsLeft > 0}
                {...register("password")}
                placeholder="••••••••"
                className={cn(
                  "w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none transition-colors",
                  errors.password
                    ? "border-rose-400 bg-rose-50/20"
                    : "border-slate-200 focus:border-sky-600 focus:bg-white",
                  lockoutSecondsLeft > 0 &&
                    "opacity-60 cursor-not-allowed bg-slate-100",
                )}
              />
              <button
                type="button"
                disabled={lockoutSecondsLeft > 0}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer disabled:opacity-40"
                title={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                }
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-rose-500 mt-1 font-semibold">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Captcha Section */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Kode Keamanan <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2 mb-2">
              <div className="relative border border-sky-200 rounded-xl overflow-hidden bg-sky-50 shadow-inner flex-1 flex items-center justify-center h-10 select-none">
                <canvas
                  ref={canvasRef}
                  width={180}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                disabled={lockoutSecondsLeft > 0}
                onClick={refreshCaptcha}
                className="h-10 w-10 flex items-center justify-center bg-slate-50 hover:bg-sky-50 hover:text-sky-600 text-slate-500 rounded-xl border border-slate-200 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                title="Ganti kode captcha"
              >
                <RotateCw size={15} />
              </button>
            </div>
            <div className="relative">
              <ShieldCheck
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                disabled={lockoutSecondsLeft > 0}
                {...register("captcha")}
                placeholder="Masukkan 5 karakter kode di atas"
                maxLength={6}
                autoComplete="off"
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold tracking-wider text-slate-900 focus:outline-none transition-colors",
                  errors.captcha
                    ? "border-rose-400 bg-rose-50/20"
                    : "border-slate-200 focus:border-sky-600 focus:bg-white",
                  lockoutSecondsLeft > 0 &&
                    "opacity-60 cursor-not-allowed bg-slate-100",
                )}
              />
            </div>
            {errors.captcha && (
              <p className="text-[11px] text-rose-500 mt-1 font-semibold">
                {errors.captcha.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={
              loginMutation.isPending || isSubmitting || lockoutSecondsLeft > 0
            }
            className={cn(
              "w-full py-3 h-auto text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2",
              lockoutSecondsLeft > 0
                ? "bg-slate-400 hover:bg-slate-400 shadow-none cursor-not-allowed"
                : "bg-sky-600 hover:bg-sky-700 active:bg-sky-800 shadow-sky-600/30",
            )}
          >
            {loginMutation.isPending || isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Memproses...</span>
              </>
            ) : lockoutSecondsLeft > 0 ? (
              <>
                <Lock size={15} />
                <span>
                  Akun Terkunci ({formatCountdown(lockoutSecondsLeft)})
                </span>
              </>
            ) : (
              <>
                <span>Masuk ke Sistem</span>
                <ArrowRight size={16} />
              </>
            )}
          </Button>
        </form>

        {/* Modal Lupa Kata Sandi */}
        <ForgotPasswordModal
          isOpen={isForgotPasswordOpen}
          onClose={() => setIsForgotPasswordOpen(false)}
        />

        {/* Modal Akun Terkunci Permanen / Kunjungan Offline */}
        <PermanentLockoutModal
          isOpen={isPermanentLockoutOpen}
          onClose={() => setIsPermanentLockoutOpen(false)}
          onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
        />
      </div>
    </div>
  );
};
