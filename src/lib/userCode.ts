import { SystemUser, Role } from "@/types";
import { Crypto } from "@/lib/crypto";

/**
 * Format Kode Pengguna: AABBCCCCC
 * - AA    : Kode role (start dari 10, kelipatan 5: 10, 15, 20, 25, 30..., dinamis sesuai urutan role)
 * - BB    : 2 digit tahun pendaftaran akun (contoh: 2026 -> 26)
 * - CCCCC : 5 digit sequence / ID numerik pengguna (contoh: ID 1 -> 00001)
 *
 * Catatan: Kode role ditentukan sepenuhnya secara dinamis dari master data role yang ada di sistem/database,
 * tanpa hardcode nama atau kode role apapun.
 */

// Registry dinamis di memori untuk menyimpan mapping role tak terduga secara runtime
const dynamicRoleMap = new Map<string, string>();

/**
 * Reset cache registry role jika master role di-reload
 */
export function resetDynamicRoleRegistry(): void {
  dynamicRoleMap.clear();
}

/**
 * Menghasilkan 2 digit kode role (AA) secara dinamis:
 * - Start dari 10
 * - Kelipatan 5 (10, 15, 20, 25, 30, ...)
 * - Berdasarkan urutan role di master roles (roles array dari server)
 */
export function getRoleCodeNumber(
  roleIdentifier?: string | null,
  roles?: Role[],
): string {
  if (!roleIdentifier) return "10";

  const normalized = String(roleIdentifier).toLowerCase().trim();

  // 1. Dinamis berdasarkan urutan pembuatan role (created_at atau ID database tertua lebih dahulu)
  if (roles && roles.length > 0) {
    // Urutkan secara kronologis: role yang pertama kali dibuat berada di posisi awal
    const chronologicallySortedRoles = [...roles].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA > 0 && timeB > 0 && timeA !== timeB) {
        return timeA - timeB; // Terlama / pertama kali dibuat di depan
      }

      // Fallback ke ID database asli jika timestamp sama atau belum ada
      const idA =
        typeof a.id === "number"
          ? a.id
          : (Crypto.decryptId(a.id) ?? parseInt(String(a.id), 10) ?? 0);
      const idB =
        typeof b.id === "number"
          ? b.id
          : (Crypto.decryptId(b.id) ?? parseInt(String(b.id), 10) ?? 0);
      return idA - idB;
    });

    const roleIndex = chronologicallySortedRoles.findIndex((r) => {
      const rCode = (r.code || "").toLowerCase().trim();
      const rId = String(r.id);
      const rName = (r.name || "").toLowerCase().trim();
      return rCode === normalized || rId === normalized || rName === normalized;
    });

    if (roleIndex !== -1) {
      // Role pertama yang dibuat (index 0) = 10, role kedua (index 1) = 15, dst.
      const calculated = 10 + roleIndex * 5;
      const codeStr = String(calculated).padStart(2, "0");
      dynamicRoleMap.set(normalized, codeStr);
      return codeStr;
    }
  }

  // 2. Jika pernah didaftarkan di runtime registry, gunakan nilai tersebut
  if (dynamicRoleMap.has(normalized)) {
    return dynamicRoleMap.get(normalized)!;
  }

  // 3. Cek apakah roleIdentifier adalah numeric ID atau encrypted ID
  const numericId =
    typeof roleIdentifier === "number"
      ? roleIdentifier
      : parseInt(roleIdentifier, 10) || Crypto.decryptId(roleIdentifier);

  if (numericId && !isNaN(numericId) && numericId > 0) {
    const calculated = 10 + (numericId - 1) * 5;
    const codeStr = String(calculated).padStart(2, "0");
    dynamicRoleMap.set(normalized, codeStr);
    return codeStr;
  }

  // 4. Daftarkan secara dinamis role baru yang belum terdaftar ke registry runtime
  const baseOffset = roles && roles.length > 0 ? roles.length : 0;
  const newIndex = baseOffset + dynamicRoleMap.size;
  const dynamicallyAssigned = String(10 + newIndex * 5).padStart(2, "0");
  dynamicRoleMap.set(normalized, dynamicallyAssigned);

  return dynamicallyAssigned;
}

/**
 * Menghasilkan 2 digit tahun pendaftaran akun (BB)
 * Contoh: Tahun 2026 -> "26"
 */
export function getUserYearCode(createdAt?: string | Date | null): string {
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      return String(d.getFullYear()).slice(-2);
    }
  }
  // Fallback ke tahun berjalan
  return String(new Date().getFullYear()).slice(-2);
}

/**
 * Menghitung nomor urut sequence pengguna khusus dalam rolenya (Per-Role Sequence)
 * Contoh: User ke-1 dalam role Super Admin -> 1, User ke-2 dalam role Super Admin -> 2
 */
export function getRoleSequence(
  user: Partial<SystemUser>,
  allUsers?: Partial<SystemUser>[],
  fallbackSeq?: number,
): number {
  if (allUsers && allUsers.length > 0) {
    const roleKey = (user.role_code || "customer").toLowerCase().trim();
    const sameRoleUsers = allUsers
      .filter(
        (item) => (item.role_code || "customer").toLowerCase().trim() === roleKey,
      )
      .sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (timeA > 0 && timeB > 0 && timeA !== timeB) return timeA - timeB;
        const idA =
          typeof a.id === "number" ? a.id : parseInt(String(a.id), 10) || 0;
        const idB =
          typeof b.id === "number" ? b.id : parseInt(String(b.id), 10) || 0;
        return idA - idB;
      });

    const foundIdx = sameRoleUsers.findIndex(
      (item) => String(item.id) === String(user.id),
    );
    if (foundIdx !== -1) {
      return foundIdx + 1;
    }
  }

  return fallbackSeq && fallbackSeq > 0 ? fallbackSeq : 1;
}

/**
 * Menghasilkan 5 digit nomor urut / sequence (CCCCC)
 * Contoh: Sequence 1 -> "00001", Sequence 2 -> "00002"
 */
export function getUserSequenceCode(
  idOrSeq?: string | number | null,
  fallbackSequence?: number,
): string {
  let seqNum: number | null = null;

  if (typeof idOrSeq === "number") {
    seqNum = idOrSeq;
  } else if (typeof idOrSeq === "string") {
    const parsed = parseInt(idOrSeq, 10);
    if (!isNaN(parsed) && parsed > 0) {
      seqNum = parsed;
    }
  }

  if (seqNum === null || isNaN(seqNum) || seqNum <= 0) {
    seqNum = fallbackSequence && fallbackSequence > 0 ? fallbackSequence : 1;
  }

  return String(seqNum).padStart(5, "0");
}

/**
 * Fungsi utama auto-generate kode user dengan format AABBCCCCC
 * - AA    : Kode role dinamis (10, 15, 20, ...)
 * - BB    : Tahun buat akun (2 digit)
 * - CCCCC : Sequence per role pengguna (5 digit, contoh: 00001 untuk user pertama pada role tsb)
 */
export function generateUserCode(
  user: Partial<SystemUser>,
  roles?: Role[],
  roleSequenceOrAllUsers?: number | Partial<SystemUser>[],
): string {
  if (user.user_code && /^\d{9}$/.test(user.user_code)) {
    return user.user_code;
  }

  const rolePart = getRoleCodeNumber(user.role_code, roles);
  const yearPart = getUserYearCode(user.created_at);

  let seqNum = 1;
  if (typeof roleSequenceOrAllUsers === "number") {
    seqNum = roleSequenceOrAllUsers;
  } else if (Array.isArray(roleSequenceOrAllUsers)) {
    seqNum = getRoleSequence(user, roleSequenceOrAllUsers);
  } else {
    seqNum = 1;
  }

  const seqPart = String(seqNum).padStart(5, "0");
  return `${rolePart}${yearPart}${seqPart}`;
}

export function formatPicCode(
  pic?: number | string | null,
  roles?: Role[],
): string {
  if (!pic) {
    return "-";
  }
  const str = String(pic);
  if (/^\d{9}$/.test(str)) {
    return str;
  }
  return str;
}

/**
 * Parsing kode user AABBCCCCC kembali ke detail komponen
 */
export function parseUserCode(code: string) {
  if (!code || code.length !== 9) return null;
  return {
    roleCode: code.substring(0, 2),
    year: code.substring(2, 4),
    sequence: code.substring(4, 9),
    fullYear: 2000 + parseInt(code.substring(2, 4), 10),
    sequenceNumber: parseInt(code.substring(4, 9), 10),
  };
}
