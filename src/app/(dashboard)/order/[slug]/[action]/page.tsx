import { Suspense } from 'react';
import { OrderFormSubmit } from '@/features/Dashboard/Orders';

export default function OrderActionPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-slate-400 text-xs animate-pulse">
          Memuat data pesanan...
        </div>
      }
    >
      <OrderFormSubmit />
    </Suspense>
  );
}
