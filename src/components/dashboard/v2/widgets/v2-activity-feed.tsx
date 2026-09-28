import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface V2ActivityItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  status: "emerald" | "blue" | "amber" | "indigo" | "destructive" | string;
}

export interface V2ActivityFeedProps {
  items?: V2ActivityItem[];
  isLoading?: boolean;
  title?: string;
  icon?: React.ReactNode;
  maxDisplay?: number;
  className?: string;
}

export function V2ActivityFeed({
  items = [],
  isLoading = false,
  title = "Aktivitas & Log Sistem",
  icon,
  maxDisplay = 6,
  className,
}: V2ActivityFeedProps) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
    blue: "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]",
    amber: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]",
    indigo: "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]",
    destructive: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
  };

  const formatDistanceToNow = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Baru saja";
      if (diffMins < 60) return `${diffMins}m lalu`;
      if (diffHours < 24) return `${diffHours}j lalu`;
      if (diffDays === 1) return "Kemarin";
      if (diffDays < 7) return `${diffDays}h lalu`;
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return "";
    }
  };

  const displayItems = items.slice(0, maxDisplay);

  return (
    <Card className={cn("border-border/60 shadow-2xs", className)}>
      <CardHeader className="pb-3 border-b border-border/40">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
          {icon || <ClockIcon className="size-4 text-primary" />}
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4 pb-2">
        <div className="space-y-3.5 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="relative pl-6 flex items-start gap-2.5">
                <span className="absolute left-0.75 top-1.5 size-2 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))
          ) : displayItems.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground italic pl-2">
              Belum ada aktivitas terbaru
            </div>
          ) : (
            displayItems.map((act) => (
              <div key={act.id} className="relative pl-6 flex items-start gap-2.5 text-xs">
                <span
                  className={cn(
                    "absolute left-0.75 top-1.5 size-2 rounded-full",
                    colorMap[act.status] || "bg-muted"
                  )}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-foreground">{act.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                      {formatDistanceToNow(act.timestamp)}
                    </span>
                  </div>
                  {act.description && (
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                      {act.description}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
