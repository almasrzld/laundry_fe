export const DEFAULT_SECURITY_QUESTIONS = [
  "Siapa nama gadis ibu kandung Anda?",
  "Di kota manakah Anda dilahirkan?",
  "Apa nama hewan peliharaan pertama Anda?",
  "Apa nama sekolah dasar (SD) tempat Anda bersekolah?",
  "Apa makanan favorit Anda sewaktu kecil?",
  "Apa nama jalan atau perumahan tempat tinggal masa kecil Anda?",
  "Apa judul film atau buku favorit pertama Anda?",
] as const;

export type SecurityQuestion = (typeof DEFAULT_SECURITY_QUESTIONS)[number];
