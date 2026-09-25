import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString?: string | Date | null): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function stripCountryCode(value: string): string {
  if (!value) return '';

  // Clean non-digits
  let digits = value.replace(/\D/g, '');

  // If starts with country code 62, remove 62
  if (digits.startsWith('62')) {
    digits = digits.slice(2);
  }
  // If starts with 0, remove 0
  while (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (!digits) return '';

  // Max 13 digits for Indonesian phone numbers after prefix
  digits = digits.slice(0, 13);

  if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  } else {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
}

export function formatPhoneNumber(value: string): string {
  const stripped = stripCountryCode(value);
  return stripped ? `+62 ${stripped}` : '';
}
