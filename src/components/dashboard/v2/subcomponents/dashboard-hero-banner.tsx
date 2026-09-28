import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SunIcon,
  SunsetIcon,
  MoonIcon,
  SparklesIcon,
  RefreshCwIcon,
  PlusIcon,
  LayersIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface DashboardHeroBannerProps {
  userName?: string;
  role: string | null;
  workspaceName?: string;
  universityName?: string;
  greeting: {
    text: string;
    description: string;
    iconName: string;
  };
  onRefresh?: () => void;
  isRefreshing?: boolean;
  memberId?: string;
  quickStat?: {
    label: string;
    value: string | number;
  };
}

export function DashboardHeroBanner({
  userName,
  role,
  workspaceName,
  universityName,
  greeting,
  onRefresh,
  isRefreshing = false,
  memberId,
  quickStat,
}: DashboardHeroBannerProps) {
  const getRoleBadge = (r: string | null) => {
    switch (r) {
      case "SUPER_ADMIN":
        return { label: "Super Admin", variant: "default" as const, color: "bg-purple-600 hover:bg-purple-700 dark:bg-purple-600/80 dark:text-purple-100 dark:border-purple-500/40" };
      case "WORKSPACE_SUPERVISOR":
        return { label: "Supervisor Global", variant: "default" as const, color: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600/80 dark:text-blue-100 dark:border-blue-500/40" };
      case "UNIVERSITY_ADMIN":
        return { label: "Admin Universitas", variant: "default" as const, color: "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600/80 dark:text-emerald-100 dark:border-emerald-500/40" };
      case "UNIVERSITY_SUPERVISOR":
        return { label: "Supervisor Univ", variant: "default" as const, color: "bg-teal-600 hover:bg-teal-700 dark:bg-teal-600/80 dark:text-teal-100 dark:border-teal-500/40" };
      case "MENTOR":
        return { label: "Pendamping TKM", variant: "default" as const, color: "bg-amber-600 hover:bg-amber-700 dark:bg-amber-600/80 dark:text-amber-100 dark:border-amber-500/40" };
      default:
        return { label: "Pengguna", variant: "outline" as const, color: "" };
    }
  };

  const roleInfo = getRoleBadge(role);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-card via-card/95 to-muted/30 dark:from-card dark:via-card/90 dark:to-accent/20 p-6 sm:p-8 shadow-xs dark:shadow-md">
      {/* Subtle background glow effect */}
      <div className="pointer-events-none absolute -right-12 -top-12 size-64 rounded-full bg-primary/10 dark:bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 -bottom-8 size-48 rounded-full bg-amber-500/5 dark:bg-amber-500/10 blur-2xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left side: Greetings and Context */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 dark:bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground dark:text-muted-foreground shadow-2xs backdrop-blur-xs">
              {greeting.iconName === "sun" ? (
                <SunIcon className="size-3.5 text-amber-500" />
              ) : greeting.iconName === "sunset" ? (
                <SunsetIcon className="size-3.5 text-orange-500" />
              ) : (
                <MoonIcon className="size-3.5 text-indigo-400" />
              )}
              <span>{greeting.text}</span>
            </div>

            <Badge
              className={cn("font-medium text-white shadow-2xs border", roleInfo.color)}
            >
              {roleInfo.label}
            </Badge>

            {universityName && (
              <Badge variant="outline" className="text-xs font-medium bg-background/50 dark:bg-muted/30 border-border/70 dark:text-foreground">
                {universityName}
              </Badge>
            )}

            {workspaceName && (
              <Badge variant="secondary" className="text-xs font-medium text-muted-foreground dark:text-foreground/80 dark:bg-muted/60 border border-transparent dark:border-border/40 flex items-center gap-1">
                <LayersIcon className="size-3" />
                {workspaceName}
              </Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {userName ? (
              <>
                Hai, <span className="text-primary dark:text-primary-foreground font-extrabold">{userName}</span>
              </>
            ) : (
              "Dashboard Pendampingan"
            )}
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {greeting.description}
          </p>
        </div>

        {/* Right side: Action buttons & Quick Stat */}
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
          {quickStat && (
            <div className="hidden md:flex flex-col items-end px-4 py-1.5 rounded-xl border border-border/60 bg-background/80 dark:bg-card/80 backdrop-blur-xs shadow-2xs">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                {quickStat.label}
              </span>
              <span className="text-lg font-bold font-mono text-foreground">
                {quickStat.value}
              </span>
            </div>
          )}

          {role === "MENTOR" && (
            <Button asChild size="sm" className="gap-1.5 shadow-2xs font-semibold">
              <Link href="/logbooks/new">
                <PlusIcon className="size-4" />
                Tambah Logbook
              </Link>
            </Button>
          )}

          {onRefresh && (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="text-muted-foreground hover:text-foreground"
              title="Perbarui data"
            >
              <RefreshCwIcon
                className={cn("size-3.5", isRefreshing && "animate-spin")}
              />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
