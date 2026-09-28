"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { UserAvatar } from "@/components/user-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { VerificationStatus } from "@/types";
import { MappedOutputReport, OutputReportActions } from "../lib/types";
import { OcrAttentionCell } from "@/components/ocr-attention-cell";
import { ActionCell } from "./action-cell";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";

interface GetOutputReportsColumnsProps {
  currentRole: string;
  isSuperAdmin: boolean;
  actions: OutputReportActions & {
    onDetail: (id: string) => void;
    onEdit: (id: string) => void;
  };
}

export function getOutputReportsColumns({
  currentRole,
  isSuperAdmin,
  actions,
}: GetOutputReportsColumnsProps): ColumnDef<MappedOutputReport>[] {
  return [
    {
      accessorKey: "applicantName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nama Peserta" />
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
              className="font-medium truncate"
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
        <DataTableColumnHeader column={column} title="Tanggal" />
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
        <DataTableColumnHeader column={column} title="Omzet" />
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
        <DataTableColumnHeader column={column} title="Status" />
      ),
      meta: {
        className: "w-[130px] truncate",
      },
      cell: ({ row }) => {
        const status = row.getValue("verificationStatus") as VerificationStatus;
        return <StatusBadge status={status} />;
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
          isProcessing={actions.processingId === row.original.id}
          onReprocess={() => actions.onReprocessAll(row.original.id)}
        />
      ),
    },
    {
      id: "actions",
      meta: {
        className: "w-[150px]",
      },
      cell: ({ row }) => (
        <ActionCell
          id={row.original.id}
          status={row.original.verificationStatus}
          currentRole={currentRole}
          isSuperAdmin={isSuperAdmin}
          deletingId={actions.deletingId}
          onDetail={actions.onDetail}
          onEdit={actions.onEdit}
          onDelete={actions.onDelete}
        />
      ),
    },
  ];
}
