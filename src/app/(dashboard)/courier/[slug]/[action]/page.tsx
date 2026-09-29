import { Suspense } from 'react';
import { CourierDetailView } from '@/features/Dashboard/Courier';

export default function CourierActionPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-slate-400 text-xs animate-pulse">
          Memuat data tugas kurir...
        </div>
      }
    >
      <CourierDetailView />
    </Suspense>
  );
}
