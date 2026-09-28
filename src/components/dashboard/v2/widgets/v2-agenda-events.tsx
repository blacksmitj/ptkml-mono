"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  BellIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  ArrowRightIcon,
  ExternalLinkIcon,
  SparklesIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/use-app-store";
import {
  useDashboardEventsMonth,
  MonthDashboardEvent,
} from "@/hooks/use-dashboard-events";
import { cn } from "@/lib/utils";

export interface V2AgendaEventsProps {
  maxDisplay?: number;
  className?: string;
}

export function V2AgendaEvents({
  maxDisplay = 4,
  className,
}: V2AgendaEventsProps) {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const [selectedEvent, setSelectedEvent] =
    React.useState<MonthDashboardEvent | null>(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data, isLoading } = useDashboardEventsMonth(
    currentWorkspaceId || undefined,
    year,
    month
  );

  // Filter & sort upcoming / active events
  const upcomingEvents = React.useMemo(() => {
    const list = data?.events || [];
    return [...list]
      .sort((a, b) => {
        // Pending first, then by daysRemaining ascending
        if (a.status !== b.status) {
          return a.status === "PENDING" ? -1 : 1;
        }
        return a.daysRemaining - b.daysRemaining;
      })
      .slice(0, maxDisplay);
  }, [data, maxDisplay]);

  const totalPending = (data?.events || []).filter(
    (e) => e.status === "PENDING"
  ).length;

  return (
    <>
      <Card
        className={cn(
          "border-border/60 shadow-2xs flex flex-col justify-between h-full bg-card",
          className
        )}
      >
        <CardHeader className="p-4 pb-3 border-b border-border/40 flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0 shadow-2xs">
              <BellIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold tracking-tight text-foreground truncate">
                Pengingat & Agenda
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground truncate">
                {format(now, "MMMM yyyy", { locale: localeId })}
              </CardDescription>
            </div>
          </div>

          {totalPending > 0 ? (
            <Badge
              variant="outline"
              className="text-[11px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 px-2 py-0.5 shrink-0"
            >
              {totalPending} Aktif
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[11px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-2 py-0.5 shrink-0"
            >
              Semua Selesai
            </Badge>
          )}
        </CardHeader>

        <CardContent className="p-3 sm:p-4 space-y-2.5 flex-1 flex flex-col justify-between">
          <div className="space-y-2.5">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-border/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ))
            ) : upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                  <CheckCircle2Icon className="size-5 text-emerald-500" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">
                    Tidak ada agenda mendesak
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Semua jadwal bulan ini telah dipenuhi atau belum diagendakan.
                  </p>
                </div>
              </div>
            ) : (
              upcomingEvents.map((evt) => {
                const isCompleted = evt.status === "COMPLETED";
                const isUrgent = !isCompleted && evt.daysRemaining <= 2;
                const isWarning = !isCompleted && evt.daysRemaining > 2;

                return (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "group relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer text-left",
                      "hover:shadow-xs hover:-translate-y-0.5",
                      isCompleted
                        ? "bg-muted/15 border-border/40 text-muted-foreground"
                        : isUrgent
                        ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/10"
                        : "bg-card border-border/60 hover:border-primary/40 hover:bg-muted/20"
                    )}
                  >
                    {/* Date badge on left */}
                    <div
                      className={cn(
                        "flex flex-col items-center justify-center rounded-lg p-1.5 shrink-0 min-w-10 border text-center font-mono",
                        isCompleted
                          ? "bg-muted/30 border-border/30 text-muted-foreground"
                          : isUrgent
                          ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                          : "bg-primary/10 border-primary/20 text-primary"
                      )}
                    >
                      <span className="text-[9px] uppercase font-semibold leading-none">
                        {format(new Date(evt.targetDate), "MMM", {
                          locale: localeId,
                        })}
                      </span>
                      <span className="text-sm font-extrabold leading-none mt-1">
                        {format(new Date(evt.targetDate), "dd")}
                      </span>
                    </div>

                    {/* Middle: Title & Target */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4
                          className={cn(
                            "text-xs font-bold truncate leading-tight",
                            isCompleted
                              ? "line-through text-muted-foreground"
                              : "text-foreground group-hover:text-primary transition-colors"
                          )}
                        >
                          {evt.title}
                        </h4>

                        {/* Status chip */}
                        {isCompleted ? (
                          <Badge
                            variant="secondary"
                            className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 px-1.5 py-0 shrink-0"
                          >
                            Selesai
                          </Badge>
                        ) : isUrgent ? (
                          <Badge
                            variant="destructive"
                            className="text-[9px] font-semibold px-1.5 py-0 shrink-0 animate-pulse"
                          >
                            {evt.daysRemaining <= 0
                              ? "Hari ini"
                              : `${evt.daysRemaining} hari lagi`}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-medium text-muted-foreground px-1.5 py-0 shrink-0 font-mono"
                          >
                            {evt.daysRemaining} hari
                          </Badge>
                        )}
                      </div>

                      {evt.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {evt.description}
                        </p>
                      )}
                    </div>

                    <ArrowRightIcon className="size-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all self-center shrink-0" />
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <SparklesIcon className="size-3 text-amber-500" />
              Klik agenda untuk detail
            </span>
            <span className="font-mono">{upcomingEvents.length} ditampilkan</span>
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog Detail Event */}
      <Dialog
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <DialogContent className="max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader className="space-y-1.5 text-left">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      selectedEvent.status === "COMPLETED"
                        ? "secondary"
                        : selectedEvent.daysRemaining <= 2
                        ? "destructive"
                        : "outline"
                    }
                    className="text-[10px]"
                  >
                    {selectedEvent.status === "COMPLETED"
                      ? "Sudah Terpenuhi"
                      : selectedEvent.daysRemaining <= 0
                      ? "Batas Waktu Hari Ini"
                      : `${selectedEvent.daysRemaining} Hari Lagi`}
                  </Badge>

                  {selectedEvent.targetRole && (
                    <Badge variant="outline" className="text-[10px]">
                      Target: {selectedEvent.targetRole}
                    </Badge>
                  )}
                </div>

                <DialogTitle className="text-base font-bold text-foreground pt-1">
                  {selectedEvent.title}
                </DialogTitle>

                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1 pt-0.5 font-mono">
                  <CalendarIcon className="size-3.5" />
                  {format(
                    new Date(selectedEvent.targetDate),
                    "EEEE, dd MMMM yyyy",
                    { locale: localeId }
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {selectedEvent.description ? (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs text-foreground leading-relaxed">
                    {selectedEvent.description}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Tidak ada rincian catatan tambahan untuk agenda ini.
                  </p>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEvent(null)}
                  >
                    Tutup
                  </Button>

                  {selectedEvent.actionUrl && (
                    <Button asChild size="sm" className="gap-1.5 font-semibold">
                      <Link
                        href={selectedEvent.actionUrl}
                        onClick={() => setSelectedEvent(null)}
                      >
                        {selectedEvent.actionLabel || "Buka Halaman Aksi"}
                        <ExternalLinkIcon className="size-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
