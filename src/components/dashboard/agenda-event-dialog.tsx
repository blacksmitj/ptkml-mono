"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, ExternalLink } from "lucide-react";
import { formatFullDateWithDay } from "@/lib/format-date";
import { MonthDashboardEvent } from "@/hooks/use-dashboard-events";

interface AgendaEventDialogProps {
  event: MonthDashboardEvent | null;
  onClose: () => void;
}

export function AgendaEventDialog({ event, onClose }: AgendaEventDialogProps) {
  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        {event && (
          <>
            <DialogHeader className="space-y-1.5 text-left">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    event.status === "COMPLETED"
                      ? "secondary"
                      : event.daysRemaining <= 2
                      ? "destructive"
                      : "outline"
                  }
                  className="text-[10px]"
                >
                  {event.status === "COMPLETED"
                    ? "Sudah Terpenuhi"
                    : event.daysRemaining <= 0
                    ? "Batas Waktu Hari Ini"
                    : `${event.daysRemaining} Hari Lagi`}
                </Badge>

                {event.targetRole && (
                  <Badge variant="outline" className="text-[10px]">
                    Target: {event.targetRole}
                  </Badge>
                )}
              </div>

              <DialogTitle className="text-base font-bold text-foreground pt-1">
                {event.title}
              </DialogTitle>

              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1 pt-0.5 font-mono">
                <Calendar className="size-3.5" />
                {formatFullDateWithDay(event.targetDate)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {event.description ? (
                <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-xs text-foreground leading-relaxed">
                  {event.description}
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
                  onClick={onClose}
                >
                  Tutup
                </Button>

                {event.actionUrl && (
                  <Button asChild size="sm" className="gap-1.5 font-semibold">
                    <Link
                      href={event.actionUrl}
                      onClick={onClose}
                    >
                      {event.actionLabel || "Buka Halaman Aksi"}
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
