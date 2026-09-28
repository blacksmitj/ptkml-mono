import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Applicant } from "@/types";

/**
 * Menghitung jumlah logbook kunjungan luring individu yang berstatus APPROVED.
 * Jika applicant memiliki properti `offlineIndividualVisitCount` atau `mentoringCount`,
 * nilai tersebut dapat digunakan sebagai fallback jika list logbook belum di-hydrate.
 */
export function getOfflineIndividualVisitCount(applicant: Partial<Applicant> | any): number {
  if (!applicant) return 0;

  if (Array.isArray(applicant.logbooks) && applicant.logbooks.length > 0) {
    const approvedVisits = applicant.logbooks.filter((item: any) => {
      const lb = item.logbook || item;
      return (
        lb.verificationStatus === "APPROVED" &&
        lb.deliveryMethod === "OFFLINE" &&
        lb.meetingType === "INDIVIDUAL"
      );
    });
    return approvedVisits.length;
  }

  if (typeof applicant.offlineIndividualVisitCount === "number") {
    return applicant.offlineIndividualVisitCount;
  }

  if (typeof applicant.mentoringCount === "number") {
    return applicant.mentoringCount;
  }

  return 0;
}

/**
 * Kembalikan class warna shadcn berdasarkan jumlah kunjungan:
 * 0: Merah (destructive)
 * 1: Oranye
 * 2: Biru muda (sky)
 * >= 3: Biru (primary)
 */
export function getVisitCountColorClasses(count: number) {
  if (count <= 0) {
    return {
      badge: "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20",
      text: "text-destructive",
      border: "border-destructive/30",
      dot: "bg-destructive",
    };
  }
  if (count === 1) {
    return {
      badge: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400",
      text: "text-orange-600 dark:text-orange-400",
      border: "border-orange-500/30",
      dot: "bg-orange-500",
    };
  }
  if (count === 2) {
    return {
      badge: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:bg-sky-500/20 dark:text-sky-400",
      text: "text-sky-600 dark:text-sky-400",
      border: "border-sky-500/30",
      dot: "bg-sky-500",
    };
  }
  return {
    badge: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 shadow-xs font-bold",
    text: "text-emerald-700 dark:text-emerald-300 font-bold",
    border: "border-emerald-500/40",
    dot: "bg-emerald-500",
  };
}

interface VisitCountBadgeProps {
  count: number;
  className?: string;
  suffix?: string;
  showDot?: boolean;
}

export function VisitCountBadge({
  count,
  className,
  suffix = "Kali",
  showDot = false,
}: VisitCountBadgeProps) {
  const colors = getVisitCountColorClasses(count);

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold transition-colors gap-1.5",
        colors.badge,
        className
      )}
    >
      {showDot && (
        <span className={cn("size-1.5 rounded-full", colors.dot)} />
      )}
      <span>{count} {suffix}</span>
    </Badge>
  );
}
