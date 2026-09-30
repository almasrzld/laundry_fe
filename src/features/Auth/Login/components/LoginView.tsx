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
  Volume2,
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
  const { setRole, login, isAuthenticated, isHydrated, token } = useAuthStore();

  React.useEffect(() => {
    if (isHydrated && isAuthenticated && token) {
      window.location.href = "/dashboard";
    }
  }, [isHydrated, isAuthenticated, token]);
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
  const captchaCodeRef = React.useRef<string>("");

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
    // Kombinasi huruf besar, kecil, dan angka yang mudah dibaca (tanpa karakter ambigu 0/O/o, 1/l/I)
    const chars = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }, []);

  const drawCaptcha = React.useCallback((code: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ambil lebar & tinggi kontainer aktual agar background memenuhi 100% tanpa celah samping
    const rect = canvas.getBoundingClientRect();
    const displayWidth =
      rect.width > 0 ? rect.width : canvas.parentElement?.clientWidth || 240;
    const displayHeight =
      rect.height > 0 ? rect.height : canvas.parentElement?.clientHeight || 44;

    const dpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    canvas.width = Math.floor(displayWidth * dpr);
    canvas.height = Math.floor(displayHeight * dpr);
    ctx.scale(dpr, dpr);

    // Background lembut dan bersih memenuhi 100% area canvas
    const bgGradient = ctx.createLinearGradient(
      0,
      0,
      displayWidth,
      displayHeight,
    );
    bgGradient.addColorStop(0, "#f8fafc");
    bgGradient.addColorStop(1, "#e0f2fe");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Garis grid latar belakang yang sangat halus dan rapi (tidak menutupi teks)
    ctx.strokeStyle = "rgba(186, 230, 253, 0.6)";
    ctx.lineWidth = 1;
    for (let x = 15; x < displayWidth; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, displayHeight);
      ctx.stroke();
    }
    for (let y = 10; y < displayHeight; y += 14) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(displayWidth, y);
      ctx.stroke();
    }

    // Tulis karakter dengan jelas, tegak, kontras tinggi & terpisah
    const charList = code.split("");
    const charWidth = displayWidth / charList.length;
    const colors = ["#0f172a", "#0369a1", "#1e3a8a", "#0f766e", "#1e293b"];

    charList.forEach((char, idx) => {
      ctx.save();
      const x = idx * charWidth + charWidth / 2;
      const y = displayHeight / 2;
      ctx.translate(x, y);

      // Sedikit variasi sudut sangat minimal (-2 s.d +2 derajat) agar natural namun tetap tegak jelas
      const angle = (idx % 2 === 0 ? 1 : -1) * 0.03;
      ctx.rotate(angle);

      // Font tebal, jelas, dan besar (mudah dibaca semua kalangan)
      ctx.font = "bold 24px 'Inter', system-ui, -apple-system, sans-serif";
      ctx.fillStyle = colors[idx % colors.length];
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Bayangan halus untuk keterbacaan ekstra
      ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.shadowBlur = 1;

      ctx.fillText(char, 0, 0);
      ctx.restore();
    });
  }, []);

  const refreshCaptcha = React.useCallback(() => {
    const code = generateCaptcha();
    setCaptchaCode(code);
    captchaCodeRef.current = code;
    drawCaptcha(code);
    setValue("captcha", "");
  }, [generateCaptcha, drawCaptcha, setValue]);

  React.useEffect(() => {
    refreshCaptcha();
    const handleResize = () => {
      if (captchaCodeRef.current) {
        drawCaptcha(captchaCodeRef.current);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [refreshCaptcha, drawCaptcha]);

  const speakCaptcha = React.useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.info("Fitur suara tidak didukung oleh browser ini");
      return;
    }
    if (!captchaCode) return;

    window.speechSynthesis.cancel();
    // Beri jeda koma antar huruf agar terdengar jelas dieja per karakter
    const spokenText = captchaCode.split("").join(", ");
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = 0.75; // Kecepatan nyaman untuk lansia
    utterance.lang = "id-ID";
    window.speechSynthesis.speak(utterance);
  }, [captchaCode]);

  const onSubmit = async (data: LoginSchema) => {
    if (lockoutSecondsLeft > 0) {
      toast.error(
        `Akun sedang terkunci. Silakan tunggu ${formatCountdown(lockoutSecondsLeft)} lagi.`,
      );
      return;
    }

    // Validasi case-insensitive (huruf besar/kecil tetap cocok) demi kemudahan pengguna
    if (data.captcha.trim().toUpperCase() !== captchaCode.toUpperCase()) {
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
      window.location.href = "/dashboard";
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
              <div className="relative border-2 border-sky-200/80 rounded-xl overflow-hidden bg-sky-50 shadow-inner flex-1 flex items-center justify-center h-11 select-none">
                <canvas ref={canvasRef} className="w-full h-full block" />
              </div>

              {/* Tombol Bantuan Suara (TTS) */}
              <button
                type="button"
                disabled={lockoutSecondsLeft > 0}
                onClick={speakCaptcha}
                className="h-11 w-11 flex items-center justify-center bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl border border-sky-200 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                title="Dengarkan kode"
                aria-label="Dengarkan kode"
              >
                <Volume2 size={17} />
              </button>

              {/* Tombol Ganti / Muat Ulang Kode */}
              <button
                type="button"
                disabled={lockoutSecondsLeft > 0}
                onClick={refreshCaptcha}
                className="h-11 w-11 flex items-center justify-center bg-slate-50 hover:bg-sky-50 hover:text-sky-600 text-slate-600 rounded-xl border border-slate-200 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                title="Ganti kode"
                aria-label="Ganti kode"
              >
                <RotateCw size={16} />
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
                placeholder="Ketik 5 karakter kode di atas"
                maxLength={5}
                autoComplete="off"
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold tracking-wider text-slate-900 placeholder:font-normal placeholder:tracking-normal focus:outline-none transition-colors",
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
