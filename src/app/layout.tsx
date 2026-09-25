import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '../providers/QueryProvider';
import { InactivityProvider } from '../providers/InactivityProvider';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'Almas Laundry - Admin Dashboard & System Management',
  description: 'Dashboard Admin & Sistem Manajemen Laundry Berbasis RBAC Dinamis',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="light">
      <body className="antialiased bg-slate-50 text-slate-900">
        <QueryProvider>
          <InactivityProvider>
            {children}
          </InactivityProvider>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}

