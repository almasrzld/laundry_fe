import { Suspense } from 'react';
import { ServicesView } from '@/features/Dashboard/Services';

export default function ServicePage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-slate-400 text-xs">Memuat katalog layanan...</div>}>
      <ServicesView />
    </Suspense>
  );
}
