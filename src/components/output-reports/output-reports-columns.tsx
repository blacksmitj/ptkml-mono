"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VerificationStatus, WorkspaceRole } from "@/types";
import { OcrAttentionCell, OcrSummary } from "./ocr-attention-cell";

interface GetOutputReportsColumnsProps {
  router: any;
  isSuperAdmin: boolean;
  currentRole: WorkspaceRole | "SUPER_ADMIN" | "WORKSPACE_SUPERVISOR";
  deletingId: string | null;
  processingId: string | null;
  onDelete: (id: string) => void;
  onReprocessAll: (id: string) => void;
}

export function getOutputReportsColumns({
  router,
  isSuperAdmin,
  currentRole,
  deletingId,
  processingId,
  onDelete,
  onReprocessAll,
}: GetOutputReportsColumnsProps): ColumnDef<any>[] {
  return [
    {
      accessorKey: "applicantName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 hover:bg-transparent font-semibold"
        >
          Nama Peserta
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: {
        className: "w-[220px] max-w-[220px] truncate",
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar name={row.getValue("applicantName")} src={row.original.applicantPhoto} />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-mono text-muted-foreground truncate">
              {row.original.applicantIdTkm}
            </span>
            <span 
              className="font-medium cursor-pointer hover:underline text-primary transition-all truncate"
              onClick={() => router.push(`/output-reports/${row.original.id}`)}
              title={row.getValue("applicantName")}
            >
              {row.getValue("applicantName")}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 hover:bg-transparent font-semibold"
        >
          Tanggal
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: {
        className: "w-[150px] truncate",
      },
      cell: ({ row }) => (
        <span className="truncate block" title={row.original.formattedDate}>
          {row.original.formattedDate}
        </span>
      ),
    },
    {
      accessorKey: "monthReport",
      header: "Bulan Laporan",
      meta: {
        className: "w-[120px] truncate",
      },
      cell: ({ row }) => {
        const m = row.original.monthReport;
        return m === 0 ? "Data Awal" : `Bulan ${m}`;
      },
    },
    {
      accessorKey: "revenue",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 hover:bg-transparent font-semibold"
        >
          Omzet
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: {
        className: "w-[180px] truncate",
      },
      cell: ({ row }) => (
        <span className="truncate block" title={row.original.revenueFormatted}>
          {row.original.revenueFormatted}
        </span>
      ),
    },
    {
      accessorKey: "verificationStatus",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 hover:bg-transparent font-semibold"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: {
        className: "w-[130px] truncate",
      },
      cell: ({ row }) => {
        const status = row.getValue("verificationStatus") as VerificationStatus;
        return (
          <Badge variant={
            status === VerificationStatus.APPROVED ? "default" : 
            status === VerificationStatus.REJECTED ? "destructive" : "outline"
          }>
            {status}
          </Badge>
        );
      },
    },
    {
      id: "ocrWarning",
      header: "Atensi",
      meta: {
        className: "w-[120px]",
      },
      cell: ({ row }) => (
        <OcrAttentionCell
          ocrSummary={row.original.ocrSummary}
          isSuperAdmin={isSuperAdmin}
          isProcessing={processingId === row.original.id}
          onReprocess={() => onReprocessAll(row.original.id)}
        />
      ),
    },
    {
      id: "actions",
      meta: {
        className: "w-[150px]",
      },
      cell: ({ row }) => {
        const id = row.original.id;
        const status = row.original.verificationStatus as VerificationStatus;
        const isDeleting = deletingId === id;
        const showEditDelete = currentRole === WorkspaceRole.MENTOR && 
          (status === VerificationStatus.PENDING || status === VerificationStatus.REJECTED);
        const showDeleteForSuperAdmin = isSuperAdmin;
        const isUnivAdmin = currentRole === WorkspaceRole.UNIVERSITY_ADMIN;
        const needsVerification = status === VerificationStatus.PENDING;
        const showVerificationButton = isUnivAdmin && needsVerification;

        return (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant={showVerificationButton ? "default" : "outline"}
              className="h-8 cursor-pointer font-medium"
              onClick={() => router.push(`/output-reports/${id}`)}
            >
              {showVerificationButton ? "Verifikasi" : "Detail"}
            </Button>

            {showEditDelete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => router.push(`/output-reports/${id}/edit`)}
                      className="h-8 w-8 rounded-md bg-amber-50/50 hover:bg-amber-100 hover:text-amber-700 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 dark:border-amber-500/30 transition-all duration-200 cursor-pointer"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Edit Laporan</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {(showEditDelete || showDeleteForSuperAdmin) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={isDeleting}
                      onClick={() => onDelete(id)}
                      className="h-8 w-8 rounded-md bg-rose-50/50 hover:bg-rose-100 hover:text-rose-700 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 dark:border-rose-500/30 transition-all duration-200 cursor-pointer"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Hapus Laporan</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
    },
  ];
}
