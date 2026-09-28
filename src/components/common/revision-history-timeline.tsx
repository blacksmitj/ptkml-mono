"use client";

import React from "react";
import { formatDateTime } from "@/lib/format-date";
import {
  AlertCircle,
  CornerDownRight,
  History,
  User,
} from "lucide-react";
import { VerificationHistoryItem } from "@/types";
import { Badge } from "@/components/ui/badge";

interface RevisionHistoryTimelineProps {
  history?: VerificationHistoryItem[] | null;
  currentVerificationNote?: string | null;
  currentRebuttalNote?: string | null;
  title?: string;
  className?: string;
}

export function RevisionHistoryTimeline({
  history,
  currentVerificationNote,
  currentRebuttalNote,
  title = "Riwayat Catatan & Revisi",
  className = "",
}: RevisionHistoryTimelineProps) {
  // Normalize history list: if history is null or empty, synthesize from current notes
  const items: VerificationHistoryItem[] = React.useMemo(() => {
    if (Array.isArray(history) && history.length > 0) {
      return history;
    }

    const synthetic: VerificationHistoryItem[] = [];
    if (currentVerificationNote) {
      synthetic.push({
        id: "legacy-rejection",
        role: "UNIVERSITY_ADMIN",
        action: "REJECTED",
        authorName: "Admin Universitas",
        authorRole: "Admin Universitas",
        note: currentVerificationNote,
        createdAt: new Date().toISOString(),
      });
    }
    if (currentRebuttalNote) {
      synthetic.push({
        id: "legacy-rebuttal",
        role: "MENTOR",
        action: "REBUTTAL",
        authorName: "Pendamping",
        authorRole: "Pendamping",
        note: currentRebuttalNote,
        createdAt: new Date().toISOString(),
      });
    }
    return synthetic;
  }, [history, currentVerificationNote, currentRebuttalNote]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
          <History className="h-3.5 w-3.5 text-primary" />
          {title}
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {items.length} Catatan
          </Badge>
        </h4>
      </div>

      <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
        {items.map((item, index) => {
          const isRejection = item.action === "REJECTED";
          return (
            <div key={item.id || index} className="relative group">
              {/* Timeline dot icon */}
              <div
                className={`absolute -left-6 top-1 flex items-center justify-center w-5 h-5 rounded-full border shadow-xs transition-transform duration-200 group-hover:scale-110 ${
                  isRejection
                    ? "bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400"
                    : "bg-blue-100 dark:bg-blue-950/80 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400"
                }`}
              >
                {isRejection ? (
                  <AlertCircle className="w-3 h-3" />
                ) : (
                  <CornerDownRight className="w-3 h-3" />
                )}
              </div>

              {/* Message Box */}
              <div
                className={`p-3 rounded-xl border transition-colors ${
                  isRejection
                    ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
                    : "bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        isRejection
                          ? "bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300"
                          : "bg-blue-200/60 dark:bg-blue-900/60 text-blue-900 dark:text-blue-300"
                      }`}
                    >
                      {isRejection ? "Penolakan Admin" : "Sanggahan Pendamping"}
                    </span>
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {item.authorName || (isRejection ? "Admin" : "Pendamping")}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {formatDateTime(item.createdAt)}
                  </span>
                </div>

                <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  "{item.note}"
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
