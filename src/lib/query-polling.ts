import { VerificationStatus } from "@/types";

/**
 * Mendeteksi apakah ada status verifikasi PENDING di dalam data tunggal atau list.
 * Mengembalikan 5000 (5 detik) jika ada status PENDING, atau false jika tidak ada.
 */
export function getPendingVerificationRefetchInterval(data: any): number | false {
  if (!data) return false;

  // Jika data berupa array (contoh: list response langsung)
  if (Array.isArray(data)) {
    const hasPending = data.some((item) => item?.verificationStatus === VerificationStatus.PENDING);
    return hasPending ? 5000 : false;
  }

  // Jika data berupa objek paginasi (contoh: { data: [...], meta: ... })
  if (data.data && Array.isArray(data.data)) {
    const hasPending = data.data.some((item: any) => item?.verificationStatus === VerificationStatus.PENDING);
    return hasPending ? 5000 : false;
  }

  // Jika data tunggal (detail page)
  if (data.verificationStatus === VerificationStatus.PENDING) {
    return 5000;
  }

  return false;
}
