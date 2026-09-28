import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "Rp 0"
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0"
  }
  return new Intl.NumberFormat("id-ID").format(value)
}

export function formatPercentage(
  value: number | null | undefined,
  maxDecimals: number = 1
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0%"
  }
  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(value)
  return `${formatted}%`
}

export function formatRole(role: string | null | undefined): string {
  if (!role) return "Pengguna";
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "WORKSPACE_SUPERVISOR":
      return "Pengawas Global";
    case "UNIVERSITY_ADMIN":
      return "Admin Universitas";
    case "UNIVERSITY_SUPERVISOR":
      return "Pengawas Universitas";
    case "MENTOR":
      return "Pendamping";
    default:
      return role.replace(/_/g, " ");
  }
}
