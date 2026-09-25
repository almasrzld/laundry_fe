/**
 * Helper Crypto untuk frontend (kompatibel dengan algoritma enkripsi backend & PHP)
 * Digunakan untuk enkripsi dan dekripsi data ID jika diperlukan di client-side.
 */
export class Crypto {
  static enkripsi(input: string | number, shift: number = 3): string {
    const strInput = String(input);
    let output = '';
    for (let i = 0; i < strInput.length; i++) {
      const charCode = strInput.charCodeAt(i) - shift;
      output += String.fromCharCode(charCode);
    }

    const str1 = output.substring(0, 1);
    const str2 = output.substring(1);
    const midRand = Math.floor(100000 + Math.random() * 900000).toString();
    const mid = str1 + midRand + str2;

    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const startRand = Math.floor(1111 + Math.random() * 8888).toString();
    const endRand = Math.floor(10101 + Math.random() * 89898).toString();

    const fullStr = startRand + yy + mid + mm + endRand;
    return typeof window !== 'undefined'
      ? btoa(fullStr)
      : Buffer.from(fullStr, 'latin1').toString('base64');
  }

  static dekripsi(input: string, shift: number = 3): string {
    if (!input) return '';
    try {
      const normalized = input.trim().replace(/ /g, '+');
      let str = typeof window !== 'undefined'
        ? atob(normalized)
        : Buffer.from(normalized, 'base64').toString('latin1');

      // Potong 6 karakter awal (prefix random + tahun)
      str = str.substring(6);
      // Potong 7 karakter akhir (bulan + random suffix)
      str = str.substring(0, str.length - 7);
      // Buang 6 digit random
      const str1 = str.substring(0, 1);
      const str2 = str.substring(7);
      str = str1 + str2;

      let output = '';
      for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i) + shift;
        output += String.fromCharCode(charCode);
      }
      return output;
    } catch (_) {
      return input;
    }
  }

  static encryptId(id: number | string | null | undefined): string {
    if (id === null || id === undefined || id === '') return '';
    return Crypto.enkripsi(id);
  }

  static decryptId(encryptedId: string): number | null {
    if (!encryptedId) return null;
    const dec = Crypto.dekripsi(encryptedId);
    const parsed = parseInt(dec, 10);
    return isNaN(parsed) ? null : parsed;
  }
}
