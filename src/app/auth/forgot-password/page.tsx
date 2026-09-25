import { Metadata } from 'next';
import { ForgotPasswordView } from '@/features/Auth/ForgotPassword';

export const metadata: Metadata = {
  title: 'Lupa Kata Sandi | Almas Laundry',
  description: 'Pemulihan kata sandi akun pelanggan menggunakan pertanyaan keamanan',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
