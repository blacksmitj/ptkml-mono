import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusType =
  // VerificationStatus
  | "APPROVED"
  | "REJECTED"
  | "PENDING"
  | "DRAFT"
  // ApplicantStatus
  | "ACTIVE"
  | "DROPPED"
  // FollowUpStatus
  | "SUBMITTED"
  // Roles
  | "UNIVERSITY_ADMIN"
  | "UNIVERSITY_SUPERVISOR"
  | "MENTOR"
  | "SUPER_ADMIN"
  | "WORKSPACE_SUPERVISOR"
  | "USER"
  // Priority
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  // Presence / Other
  | "FOUND"
  | "NOT_FOUND"
  | "VALID"
  | "DUPLICATE"
  | string;

interface StatusConfig {
  label: string;
  badgeClassName: string;
  dotClassName: string;
}

const statusConfigMap: Record<string, StatusConfig> = {
  // VerificationStatus
  APPROVED: {
    label: "Disetujui",
    badgeClassName:
      "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:border-emerald-700/50 dark:text-emerald-400 dark:bg-emerald-500/15",
    dotClassName: "bg-emerald-500 dark:bg-emerald-400",
  },
  REJECTED: {
    label: "Ditolak",
    badgeClassName:
      "bg-rose-500/10 text-rose-700 border-rose-300 dark:border-rose-700/50 dark:text-rose-400 dark:bg-rose-500/15",
    dotClassName: "bg-rose-500 dark:bg-rose-400",
  },
  PENDING: {
    label: "Menunggu",
    badgeClassName:
      "bg-amber-500/10 text-amber-700 border-amber-300 dark:border-amber-700/50 dark:text-amber-400 dark:bg-amber-500/15",
    dotClassName: "bg-amber-500 dark:bg-amber-400 animate-pulse",
  },
  DRAFT: {
    label: "Draf",
    badgeClassName:
      "bg-slate-500/10 text-slate-700 border-slate-300 dark:border-slate-700/50 dark:text-slate-400 dark:bg-slate-500/15",
    dotClassName: "bg-slate-500 dark:bg-slate-400",
  },

  // ApplicantStatus
  ACTIVE: {
    label: "Aktif",
    badgeClassName:
      "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:border-emerald-700/50 dark:text-emerald-400 dark:bg-emerald-500/15",
    dotClassName: "bg-emerald-500 dark:bg-emerald-400",
  },
  DROPPED: {
    label: "Tidak Aktif",
    badgeClassName:
      "bg-rose-500/10 text-rose-700 border-rose-300 dark:border-rose-700/50 dark:text-rose-400 dark:bg-rose-500/15",
    dotClassName: "bg-rose-500 dark:bg-rose-400",
  },

  // FollowUpStatus
  SUBMITTED: {
    label: "Terkirim",
    badgeClassName:
      "bg-blue-500/10 text-blue-700 border-blue-300 dark:border-blue-700/50 dark:text-blue-400 dark:bg-blue-500/15",
    dotClassName: "bg-blue-500 dark:bg-blue-400",
  },

  // Roles
  UNIVERSITY_ADMIN: {
    label: "Admin Universitas",
    badgeClassName:
      "bg-indigo-500/10 text-indigo-700 border-indigo-300 dark:border-indigo-700/50 dark:text-indigo-400 dark:bg-indigo-500/15",
    dotClassName: "bg-indigo-500 dark:bg-indigo-400",
  },
  UNIVERSITY_SUPERVISOR: {
    label: "Pengawas Universitas",
    badgeClassName:
      "bg-purple-500/10 text-purple-700 border-purple-300 dark:border-purple-700/50 dark:text-purple-400 dark:bg-purple-500/15",
    dotClassName: "bg-purple-500 dark:bg-purple-400",
  },
  MENTOR: {
    label: "Pendamping",
    badgeClassName:
      "bg-sky-500/10 text-sky-700 border-sky-300 dark:border-sky-700/50 dark:text-sky-400 dark:bg-sky-500/15",
    dotClassName: "bg-sky-500 dark:bg-sky-400",
  },
  SUPER_ADMIN: {
    label: "Super Admin",
    badgeClassName:
      "bg-violet-500/10 text-violet-700 border-violet-300 dark:border-violet-700/50 dark:text-violet-400 dark:bg-violet-500/15",
    dotClassName: "bg-violet-500 dark:bg-violet-400",
  },
  WORKSPACE_SUPERVISOR: {
    label: "Pengawas Workspace",
    badgeClassName:
      "bg-teal-500/10 text-teal-700 border-teal-300 dark:border-teal-700/50 dark:text-teal-400 dark:bg-teal-500/15",
    dotClassName: "bg-teal-500 dark:bg-teal-400",
  },
  USER: {
    label: "Pengguna",
    badgeClassName:
      "bg-zinc-500/10 text-zinc-700 border-zinc-300 dark:border-zinc-700/50 dark:text-zinc-400 dark:bg-zinc-500/15",
    dotClassName: "bg-zinc-500 dark:bg-zinc-400",
  },

  // Priority
  HIGH: {
    label: "Tinggi",
    badgeClassName:
      "bg-rose-500/10 text-rose-700 border-rose-300 dark:border-rose-700/50 dark:text-rose-400 dark:bg-rose-500/15",
    dotClassName: "bg-rose-500 dark:bg-rose-400",
  },
  MEDIUM: {
    label: "Sedang",
    badgeClassName:
      "bg-amber-500/10 text-amber-700 border-amber-300 dark:border-amber-700/50 dark:text-amber-400 dark:bg-amber-500/15",
    dotClassName: "bg-amber-500 dark:bg-amber-400",
  },
  LOW: {
    label: "Rendah",
    badgeClassName:
      "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:border-emerald-700/50 dark:text-emerald-400 dark:bg-emerald-500/15",
    dotClassName: "bg-emerald-500 dark:bg-emerald-400",
  },

  // Presence / Status
  FOUND: {
    label: "Ditemukan",
    badgeClassName:
      "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:border-emerald-700/50 dark:text-emerald-400 dark:bg-emerald-500/15",
    dotClassName: "bg-emerald-500 dark:bg-emerald-400",
  },
  NOT_FOUND: {
    label: "Tidak Ditemukan",
    badgeClassName:
      "bg-rose-500/10 text-rose-700 border-rose-300 dark:border-rose-700/50 dark:text-rose-400 dark:bg-rose-500/15",
    dotClassName: "bg-rose-500 dark:bg-rose-400",
  },
  VALID: {
    label: "Valid",
    badgeClassName:
      "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:border-emerald-700/50 dark:text-emerald-400 dark:bg-emerald-500/15",
    dotClassName: "bg-emerald-500 dark:bg-emerald-400",
  },
  DUPLICATE: {
    label: "Duplikat",
    badgeClassName:
      "bg-rose-500/10 text-rose-700 border-rose-300 dark:border-rose-700/50 dark:text-rose-400 dark:bg-rose-500/15",
    dotClassName: "bg-rose-500 dark:bg-rose-400",
  },
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
  label?: string;
  showDot?: boolean;
  size?: "sm" | "md";
}

export function StatusBadge({
  status,
  label,
  showDot = true,
  size = "md",
  className,
  ...props
}: StatusBadgeProps) {
  const normalizedKey = typeof status === "string" ? status.trim().toUpperCase() : "";
  const config = statusConfigMap[normalizedKey] || {
    label: status ? String(status).replace(/_/g, " ") : "-",
    badgeClassName:
      "bg-muted/40 text-muted-foreground border-border/60 dark:bg-muted/20 dark:text-muted-foreground",
    dotClassName: "bg-muted-foreground/60",
  };

  const displayText = label ?? config.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium border rounded-full transition-colors select-none",
        size === "sm"
          ? "text-[11px] px-2 py-0.5"
          : "text-xs px-2.5 py-0.5",
        config.badgeClassName,
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn(
            "rounded-full shrink-0",
            size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
            config.dotClassName
          )}
          aria-hidden="true"
        />
      )}
      <span className="truncate">{displayText}</span>
    </span>
  );
}
