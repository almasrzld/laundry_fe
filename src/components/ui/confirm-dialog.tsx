'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, CheckCircle2, Info, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type ConfirmVariant = 'create' | 'update' | 'delete' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText = 'Batal',
  variant = 'create',
  isLoading = false,
}) => {
  const getVariantDetails = () => {
    switch (variant) {
      case 'delete':
        return {
          icon: <Trash2 className="w-6 h-6 text-rose-600" />,
          iconBg: 'bg-rose-100 border-rose-200',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
          defaultTitle: 'Konfirmasi Penghapusan',
          defaultDescription: 'Apakah Anda yakin ingin menghapus data ini? Aksi ini tidak dapat dibatalkan.',
          defaultConfirmText: 'Ya, Hapus',
        };
      case 'update':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          iconBg: 'bg-amber-100 border-amber-200',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
          defaultTitle: 'Konfirmasi Perubahan Data',
          defaultDescription: 'Apakah Anda yakin ingin menyimpan perubahan pada data ini?',
          defaultConfirmText: 'Ya, Perbarui',
        };
      case 'create':
      default:
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-sky-600" />,
          iconBg: 'bg-sky-100 border-sky-200',
          confirmBtn: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20',
          defaultTitle: 'Konfirmasi Tambah Data',
          defaultDescription: 'Apakah Anda yakin data yang diinputkan sudah sesuai dan ingin disimpan ke sistem?',
          defaultConfirmText: 'Ya, Simpan',
        };
    }
  };

  const v = getVariantDetails();

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl border border-slate-200 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-start gap-4">
            <div className={cn('w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs', v.iconBg)}>
              {v.icon}
            </div>
            <div className="flex-1 space-y-1">
              <DialogPrimitive.Title className="text-base font-bold text-slate-900">
                {title || v.defaultTitle}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-slate-600 leading-relaxed">
                {description || v.defaultDescription}
              </DialogPrimitive.Description>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isLoading}
              onClick={onClose}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isLoading}
              onClick={async () => {
                await onConfirm();
              }}
              className={cn(
                'text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5',
                v.confirmBtn
              )}
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>{confirmText || v.defaultConfirmText}</span>
              )}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
