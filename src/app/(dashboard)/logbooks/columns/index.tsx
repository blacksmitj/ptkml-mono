"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { UserAvatar } from "@/components/user-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { VerificationStatus } from "@/types";
import { MappedLogbook, LogbookActions } from "../lib/types";
import { OcrAttentionCell } from "@/components/ocr-attention-cell";
import { ActionCell } from "./action-cell";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";

interface GetLogbookColumnsProps {
  currentRole: string;
  isSuperAdmin: boolean;
  actions: LogbookActions & {
    onDetail: (id: string) => void;
  };
}

export function getLogbookColumns({
  currentRole,
  isSuperAdmin,
  actions,
}: GetLogbookColumnsProps): ColumnDef<MappedLogbook>[] {
  return [
    {
      accessorKey: "logbookDate",
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
      accessorKey: "mentorName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Mentor" />
      ),
      meta: {
        className: "w-[200px] truncate",
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar name={row.getValue("mentorName")} src={row.original.mentorPhoto} />
          <span className="font-medium truncate" title={row.getValue("mentorName")}>
            {row.getValue("mentorName")}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "mentoringMaterial",
      header: "Materi",
      meta: {
        className: "w-[180px] max-w-[180px] truncate",
      },
      cell: ({ row }) => (
        <span 
          className="block truncate max-w-[180px]" 
          title={row.getValue("mentoringMaterial")}
        >
          {row.getValue("mentoringMaterial")}
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
      header: () => <div className="text-right">Aksi</div>,
      meta: {
        className: "w-[70px]",
      },
      cell: ({ row }) => (
        <ActionCell
          id={row.original.id}
          status={row.original.verificationStatus}
          currentRole={currentRole}
          isSuperAdmin={isSuperAdmin}
          deletingId={actions.deletingId}
          onDetail={actions.onDetail}
          onDelete={actions.onDelete}
        />
      ),
    },
  ];
}
