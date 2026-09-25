'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Clock, LogIn, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionExpiredDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  timeoutMs?: number;
}

export const SessionExpiredDialog: React.FC<SessionExpiredDialogProps> = ({
  isOpen,
  onConfirm,
  timeoutMs = 60 * 60 * 1000,
}) => {
  const minutes = Math.max(1, Math.round(timeoutMs / (60 * 1000)));
  const timeText = minutes === 1 ? '1 menit' : `${minutes} menit`;

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
            'fixed left-1/2 top-1/2 z-[100] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100',
            'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'text-center focus:outline-none'
          )}
        >
          {/* Icon Badge dengan Efek Pulse Glowing */}
          <div className="relative mx-auto w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600 shadow-inner mb-5">
            <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
            </span>
          </div>

          {/* Judul & Deskripsi */}
          <DialogPrimitive.Title className="text-xl font-bold text-slate-900 mb-2">
            Sesi Anda Telah Berakhir
          </DialogPrimitive.Title>

          <DialogPrimitive.Description className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
            Anda tidak melakukan aktivitas selama <span className="font-semibold text-slate-800">{timeText}</span>. Demi keamanan akun, sesi telah diamankan secara otomatis.
          </DialogPrimitive.Description>

          {/* Info Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] sm:text-xs text-slate-600 flex items-center gap-2.5 mb-6 text-left">
            <ShieldAlert size={18} className="text-amber-500 shrink-0" />
            <span>Semua sesi login sebelumnya telah ditutup. Silakan masuk kembali untuk melanjutkan.</span>
          </div>

          {/* Tombol Aksi Wajib Klik */}
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <LogIn size={16} />
            <span>OK, Saya Mengerti</span>
          </button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
