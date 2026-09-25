import { Suspense } from 'react';
import { ServiceFormSubmit } from '@/features/Dashboard/Services';

export default function ServiceActionPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-slate-400 text-xs animate-pulse">
          Memuat data formulir layanan...
        </div>
      }
    >
      <ServiceFormSubmit />
    </Suspense>
  );
}
