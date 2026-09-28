"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VerificationStatus, WorkspaceRole } from "@/types";

interface ActionCellProps {
  id: string;
  status: VerificationStatus;
  currentRole: string;
  isSuperAdmin: boolean;
  deletingId: string | null;
  onDetail: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ActionCell({
  id,
  status,
  currentRole,
  isSuperAdmin,
  deletingId,
  onDetail,
  onDelete,
}: ActionCellProps) {
  const router = useRouter();
  const isDeleting = deletingId === id;
  const showEdit = currentRole === WorkspaceRole.MENTOR && 
    (status === VerificationStatus.PENDING || status === VerificationStatus.REJECTED);
  const showDelete = isSuperAdmin || (
    currentRole === WorkspaceRole.MENTOR &&
    status !== VerificationStatus.APPROVED
  );
  const isUnivAdmin = currentRole === WorkspaceRole.UNIVERSITY_ADMIN;
  const needsVerification = status === VerificationStatus.PENDING;
  const showVerificationButton = isUnivAdmin && needsVerification;

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <Button
        size="sm"
        variant={showVerificationButton ? "default" : "outline"}
        className="h-8 cursor-pointer font-medium"
        onClick={() => onDetail(id)}
      >
        {showVerificationButton ? "Verifikasi" : "Detail"}
      </Button>

      {showEdit && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={() => router.push(`/logbooks/${id}/edit`)}
                className="h-8 w-8 rounded-md bg-amber-50/50 hover:bg-amber-100 hover:text-amber-700 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 dark:border-amber-500/30 transition-all duration-200 cursor-pointer"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Edit Logbook</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {showDelete && (
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
              <p>Hapus Logbook</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
