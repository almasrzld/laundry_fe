import { Metadata } from 'next';
import { ProfileView } from '@/features/Dashboard/Profile';

export const metadata: Metadata = {
  title: 'Profil Akun | Almas Laundry',
  description: 'Kelola informasi profil dan keamanan akun pengguna Almas Laundry',
};

export default function ProfilePage() {
  return <ProfileView />;
}
