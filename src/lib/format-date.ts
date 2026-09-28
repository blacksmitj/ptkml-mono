import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

/**
 * Format string/Date to "dd MMM yyyy, HH:mm WIB"
 */
export function formatDateTime(dateStr?: string | Date | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return format(d, "dd MMM yyyy, HH:mm", { locale: idLocale }) + " WIB";
}

/**
 * Format string/Date to "dd MMMM yyyy"
 */
export function formatDateDisplay(dateStr?: string | Date | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return format(d, "dd MMMM yyyy", { locale: idLocale });
}

/**
 * Format string/Date to "EEEE, dd MMMM yyyy" (dengan nama hari)
 */
export function formatFullDateWithDay(dateStr?: string | Date | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return format(d, "EEEE, dd MMMM yyyy", { locale: idLocale });
}
