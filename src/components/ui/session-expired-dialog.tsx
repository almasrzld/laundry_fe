"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Clock, LogIn, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { appConfig } from "@/config/app.config";

export type SessionExpiredReason =
  | "inactivity"
  | "concurrent"
  | "expired"
  | "manual";

interface SessionExpiredDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  reason?: SessionExpiredReason;
  title?: string;
  message?: string;
  timeoutMs?: number;
}

export const SessionExpiredDialog: React.FC<SessionExpiredDialogProps> = ({
  isOpen,
  onConfirm,
  reason = "inactivity",
  title,
  message,
  timeoutMs = appConfig.inactivityTimeoutMs,
}) => {
  const minutes = Math.max(1, Math.round(timeoutMs / (60 * 1000)));
  const timeText = minutes === 1 ? "1 menit" : `${minutes} menit`;

  const config = React.useMemo(() => {
    switch (reason) {
      case "concurrent":
        return {
          badgeBg: "bg-rose-50 border-rose-200 text-rose-600",
          pingColor: "bg-rose-400",
          dotColor: "bg-rose-500",
          icon: <Smartphone className="w-8 h-8 text-rose-600 animate-pulse" />,
          defaultTitle: "Sesi Anda Telah Berakhir",
          defaultDescription:
            "Akun Anda telah masuk di perangkat lain. Demi keamanan akun, sesi pada perangkat ini telah dinonaktifkan.",
          buttonClass: "bg-blue-600 hover:bg-blue-700",
          buttonText: "Oke",
        };
      case "expired":
        return {
          badgeBg: "bg-amber-50 border-amber-200 text-amber-600",
          pingColor: "bg-amber-400",
          dotColor: "bg-amber-500",
          icon: <Clock className="w-8 h-8 text-amber-600 animate-pulse" />,
          defaultTitle: "Sesi Anda Telah Berakhir",
          defaultDescription:
            "Token autentikasi Anda telah kedaluwarsa. Demi keamanan akun, sesi telah diamankan secara otomatis.",
          buttonClass: "bg-blue-600 hover:bg-blue-700",
          buttonText: "Oke",
        };
      case "inactivity":
      default:
        return {
          badgeBg: "bg-amber-50 border-amber-200 text-amber-600",
          pingColor: "bg-amber-400",
          dotColor: "bg-amber-500",
          icon: <Clock className="w-8 h-8 text-amber-600 animate-pulse" />,
          defaultTitle: "Sesi Anda Telah Berakhir",
          defaultDescription: `Anda tidak melakukan aktivitas selama ${timeText}. Demi keamanan akun, sesi telah diamankan secara otomatis.`,
          buttonClass: "bg-blue-600 hover:bg-blue-700",
          buttonText: "Oke",
        };
    }
  }, [reason, timeText]);

  const displayTitle = title || config.defaultTitle;
  const displayDescription = message || config.defaultDescription;

  return (
    <DialogPrimitive.Root open={isOpen}>
      <DialogPrimitive.Portal>
        {/* Backdrop dengan Blur & Animasi Fade */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Modal Dialog Content (SweetAlert-style) */}
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className={cn(
            "fixed left-1/2 top-1/2 z-[100] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "text-center focus:outline-none",
          )}
        >
          {/* Icon Badge dengan Efek Pulse Glowing */}
          <div
            className={cn(
              "relative mx-auto w-16 h-16 rounded-2xl border-2 flex items-center justify-center shadow-inner mb-5",
              config.badgeBg,
            )}
          >
            {config.icon}
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
              <span
                className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  config.pingColor,
                )}
              />
              <span
                className={cn(
                  "relative inline-flex rounded-full h-4 w-4",
                  config.dotColor,
                )}
              />
            </span>
          </div>

          {/* Judul & Deskripsi */}
          <DialogPrimitive.Title className="text-xl font-bold text-slate-900 mb-2">
            {displayTitle}
          </DialogPrimitive.Title>

          <DialogPrimitive.Description className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
            {displayDescription}
          </DialogPrimitive.Description>

          {/* Tombol Aksi Wajib Klik */}
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "w-full py-3 px-5 text-white font-bold text-xs sm:text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 select-none active:scale-[0.98]",
              config.buttonClass,
            )}
          >
            <span>{config.buttonText}</span>
          </button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
