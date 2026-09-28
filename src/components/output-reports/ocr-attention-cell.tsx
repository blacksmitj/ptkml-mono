"use client";

import React from "react";
import {
  Loader2,
  FileQuestion,
  FileWarning,
  FileCheck,
  Scan,
  FileMinus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
export interface OcrSummary {
  totalEligible: number;
  totalProcessed: number;
  pendingCount: number;
  mismatchCount: number;
  failedCount: number;
  mismatchFields: string[];
}

interface BaseBadgeProps {
  isSuperAdmin?: boolean;
  isProcessing?: boolean;
  onReprocess?: () => void;
}

export function NoFilesBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center cursor-default">
            <FileMinus className="h-4 w-4 text-muted-foreground/60" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Tidak Ada Berkas</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function PendingBadge({ count }: { count: number }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center cursor-default">
            <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Sedang Diperiksa ({count} berkas sedang diperiksa oleh sistem)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface MismatchBadgeProps extends BaseBadgeProps {
  mismatchCount: number;
  failedCount: number;
  mismatchFields: string[];
}

export function MismatchBadge({
  mismatchCount,
  failedCount,
  mismatchFields,
  isSuperAdmin,
  isProcessing,
  onReprocess,
}: MismatchBadgeProps) {
  const warnings: string[] = [];
  if (mismatchCount > 0) warnings.push("Jenis berkas tidak sesuai");
  if (failedCount > 0) warnings.push(`${failedCount} berkas gagal dibaca`);

  return (
    <div
      className="flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1.5 cursor-default">
              <FileWarning className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold">
                Cek Berkas
              </span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-70">
            <div className="space-y-1">
              {warnings.map((w, i) => (
                <p key={i} className="font-medium">
                  {w}
                </p>
              ))}
              {mismatchFields.length > 0 && (
                <div className="pt-1 border-t border-border/50 mt-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">
                    Detail:
                  </p>
                  {mismatchFields.slice(0, 5).map((f: string, i: number) => {
                    // Format: "CategoryLabel: kesesuaian_dokumen" or "EmpName: kesesuaian_dokumen"
                    const name = f.replace(
                      "kesesuaian_dokumen",
                      "Jenis tidak sesuai",
                    );
                    return (
                      <p key={i} className="text-xs">
                        • {name}
                      </p>
                    );
                  })}
                  {mismatchFields.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{mismatchFields.length - 5} lainnya
                    </p>
                  )}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {isSuperAdmin && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                disabled={isProcessing}
                onClick={onReprocess}
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Scan className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Periksa Berkas (Mulai OCR)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export function NotCheckedBadge({
  isSuperAdmin,
  isProcessing,
  onReprocess,
}: BaseBadgeProps) {
  return (
    <div
      className="flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center cursor-default">
              <FileQuestion className="h-4 w-4 text-muted-foreground" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Belum Diperiksa</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {isSuperAdmin && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                disabled={isProcessing}
                onClick={onReprocess}
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Scan className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Periksa Berkas (Mulai OCR)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export function OkBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center cursor-default">
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Telah Sesuai (Tetap harus diperiksa)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface OcrAttentionCellProps {
  ocrSummary: OcrSummary | undefined;
  isSuperAdmin: boolean;
  isProcessing: boolean;
  onReprocess: () => void;
}

export function OcrAttentionCell({
  ocrSummary,
  isSuperAdmin,
  isProcessing,
  onReprocess,
}: OcrAttentionCellProps) {
  if (!ocrSummary || ocrSummary.totalEligible === 0) {
    return <NoFilesBadge />;
  }

  const {
    mismatchCount,
    failedCount,
    pendingCount,
    totalProcessed,
    mismatchFields,
  } = ocrSummary;

  if (pendingCount > 0) {
    return <PendingBadge count={pendingCount} />;
  }

  if (mismatchCount > 0 || failedCount > 0) {
    return (
      <MismatchBadge
        mismatchCount={mismatchCount}
        failedCount={failedCount}
        mismatchFields={mismatchFields}
        isSuperAdmin={isSuperAdmin}
        isProcessing={isProcessing}
        onReprocess={onReprocess}
      />
    );
  }

  if (totalProcessed === 0) {
    return (
      <NotCheckedBadge
        isSuperAdmin={isSuperAdmin}
        isProcessing={isProcessing}
        onReprocess={onReprocess}
      />
    );
  }

  return <OkBadge />;
}
