import { StorageShelfItem } from "@/types";
import { Crypto } from "@/lib/crypto";

/**
 * Format Kode Rak Penyimpanan: ABBBBB
 * - A     : ID Jenis Rak numerik (contoh: 1, 2, 3, ...)
 * - BBBBB : 5 digit sequence / nomor urut rak pada jenis rak tersebut (contoh: 00001)
 *
 * Contoh hasil:
 * - Jenis Rak ID 1 -> 100001, 100002, dst.
 * - Jenis Rak ID 2 -> 200001, 200002, dst.
 */

/**
 * Mengubah shelfTypeId (bisa berupa number, string id, atau encrypted hash) menjadi number integer murni
 */
export function getNumericShelfTypeId(shelfTypeId?: number | string | null): number {
  if (shelfTypeId === undefined || shelfTypeId === null || shelfTypeId === "") {
    return 1;
  }
  if (typeof shelfTypeId === "number") {
    return shelfTypeId > 0 ? shelfTypeId : 1;
  }
  const parsed = parseInt(shelfTypeId, 10);
  if (!isNaN(parsed) && parsed > 0 && String(parsed) === shelfTypeId.trim()) {
    return parsed;
  }
  // Coba dekripsi jika hash id
  const decrypted = Crypto.decryptId(shelfTypeId);
  if (decrypted && decrypted > 0) {
    return decrypted;
  }
  return 1;
}

/**
 * Format nomor sequence menjadi 5 digit string (BBBBB)
 */
export function formatShelfSequence(seq: number): string {
  const safeSeq = Math.max(1, Math.floor(seq || 1));
  return String(safeSeq).padStart(5, "0");
}

/**
 * Format kode rak dari prefix A (ID Jenis Rak) dan nomor sequence (BBBBB)
 * Menghasilkan: 100001, 200001, 100002, dst.
 */
export function formatShelfCode(shelfTypeId: number | string, seq: number): string {
  const prefix = getNumericShelfTypeId(shelfTypeId);
  return `${prefix}${formatShelfSequence(seq)}`;
}

/**
 * Mengekstrak nomor sequence dari kode rak untuk prefix jenis rak tertentu
 */
export function extractShelfSequenceForType(
  code: string | undefined | null,
  shelfTypeId: number | string,
): number | null {
  if (!code) return null;
  const trimmed = code.trim();
  const prefix = String(getNumericShelfTypeId(shelfTypeId));

  // Pola: diawali prefix jenis rak, diikuti 5 digit sequence
  const regex = new RegExp(`^${prefix}(\\d{5})$`);
  const match = trimmed.match(regex);
  if (match) {
    return parseInt(match[1], 10);
  }

  // Fallback jika diawali prefix dan diikuti angka
  if (trimmed.startsWith(prefix)) {
    const rest = trimmed.slice(prefix.length);
    if (/^\d+$/.test(rest)) {
      return parseInt(rest, 10);
    }
  }

  return null;
}

/**
 * Menghasilkan kode rak baru berikutnya secara otomatis (Auto Generate):
 * - Mengambil prefix A dari ID Jenis Rak yang dipilih
 * - Mencari sequence terbesar khusus pada jenis rak tersebut
 * - Sequence berikutnya = maxSequence + 1
 * - Jika data kosong / belum ada, dimulai dari 00001 (contoh: 100001)
 */
export function generateNextShelfCode(
  shelves?: StorageShelfItem[] | null,
  shelfTypeId?: number | string | null,
): string {
  const prefix = getNumericShelfTypeId(shelfTypeId);

  if (!shelves || shelves.length === 0) {
    return formatShelfCode(prefix, 1);
  }

  let maxSequence = 0;

  for (const shelf of shelves) {
    const seq = extractShelfSequenceForType(shelf.code, prefix);
    if (seq !== null && seq > maxSequence) {
      maxSequence = seq;
    }
  }

  const nextSequence = maxSequence + 1;
  return formatShelfCode(prefix, nextSequence);
}

/**
 * Parsing kode rak kembali ke komponen jenis rak dan sequence
 */
export function parseShelfCode(code: string, knownShelfTypeId?: number | string) {
  if (!code) return null;
  const prefix = knownShelfTypeId ? getNumericShelfTypeId(knownShelfTypeId) : parseInt(code.slice(0, 1), 10) || 1;
  const seq = extractShelfSequenceForType(code, prefix);
  return {
    shelfTypeId: prefix,
    sequenceNumber: seq ?? 1,
    sequenceStr: formatShelfSequence(seq ?? 1),
    fullCode: code,
  };
}
