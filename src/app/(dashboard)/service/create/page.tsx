import { Suspense } from 'react';
import { ServiceFormSubmit } from '@/features/Dashboard/Services';

export default function ServiceCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-slate-400 text-xs animate-pulse">
          Memuat formulir layanan...
        </div>
      }
    >
      <ServiceFormSubmit />
    </Suspense>
  );
}
