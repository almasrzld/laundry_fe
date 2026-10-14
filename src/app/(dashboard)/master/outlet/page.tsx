import React from 'react';
import { Metadata } from 'next';
import { OutletsView } from '@/features/Dashboard/Master';

export const metadata: Metadata = {
  title: 'Master Outlet - Almas Laundry Management',
  description: 'Kelola data cabang outlet dan titik koordinat GPS lokasi',
};

export default function MasterOutletPage() {
  return <OutletsView />;
}
