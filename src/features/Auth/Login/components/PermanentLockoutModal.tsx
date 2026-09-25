"use client";

import React from "react";
import {
  ShieldAlert,
  Store,
  MapPin,
  IdCard,
  PhoneCall,
  X,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PermanentLockoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenForgotPassword?: () => void;
}

export const PermanentLockoutModal: React.FC<PermanentLockoutModalProps> = ({
  isOpen,
  onClose,
  onOpenForgotPassword,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Ribbon / Banner */}
        <div className="relative bg-rose-600 px-6 pt-6 pb-5 text-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner shrink-0">
              <ShieldAlert size={26} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/25 text-white mb-1 tracking-wider uppercase">
                Keamanan Akun
              </span>
              <h2 className="text-lg font-black text-white leading-tight">
                Akun Terkunci Permanen
              </h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl text-xs text-rose-900 leading-relaxed space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-rose-700">
              <AlertTriangle size={15} className="shrink-0" />
              Batas Percobaan Masuk Telah Habis
            </p>
            <p className="text-slate-700 text-[11px] leading-relaxed">
              Akun Anda telah dinonaktifkan sementara oleh sistem demi keamanan
              karena telah melewati seluruh batas kesempatan percobaan kata sandi.
            </p>
          </div>

          {/* Offline Store Recovery Guide */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Store size={15} className="text-sky-600" />
              <span>Prosedur Pemulihan di Toko Offline Almas Laundry:</span>
            </h3>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-800">Datang ke Gerai / Toko Offline</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kunjungi gerai toko offline <strong>Almas Laundry</strong> terdekat pada jam operasional kami.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-800">Bawa Dokumen Identitas</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tunjukkan identitas resmi (KTP/SIM) beserta nomor HP & email yang terdaftar pada akun Anda.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-bold text-slate-800">Verifikasi & Pembukaan Akun</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Petugas admin akan memvalidasi data Anda dan mereset status penguncian akun secara aman.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alternative Option: Forgot password using security questions */}
          {onOpenForgotPassword && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                Ingat jawaban pertanyaan keamanan Anda?
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenForgotPassword();
                }}
                className="font-bold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <KeyRound size={13} />
                <span>Coba Pemulihan Mandiri</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <Button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            Mengerti & Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};
