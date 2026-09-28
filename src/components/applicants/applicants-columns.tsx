"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/user-avatar";
import {
  VisitCountBadge,
  getOfflineIndividualVisitCount,
} from "@/components/applicants/visit-count-badge";
import {
  ApplicantStatus,
  CommunicationStatus,
  Willingness,
  PresenceStatus,
  FundDisbursement,
} from "@/types";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Pencil,
  MoreHorizontal,
  CheckCircle2,
} from "lucide-react";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { StatusBadgeInfo } from "./use-applicants-table";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export interface ApplicantsColumnsConfig {
  checkCanEdit: (applicant: any) => boolean;
  checkCanUpdateStatus: (applicant: any) => boolean;
  getStatusBadgeInfo: (applicant: any) => StatusBadgeInfo;
  handleDeleteApplicant: (id: string, name: string) => void;
  setSelectedApplicant: (applicant: any) => void;
  setStatusModalOpen: (open: boolean) => void;
  currentRole: string | null;
  isWorkspaceInactive: boolean;
  router: AppRouterInstance;
}

export function createApplicantsColumns({
  checkCanEdit,
  checkCanUpdateStatus,
  getStatusBadgeInfo,
  handleDeleteApplicant,
  setSelectedApplicant,
  setStatusModalOpen,
  currentRole,
  isWorkspaceInactive,
  router,
}: ApplicantsColumnsConfig): ColumnDef<any>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nama Peserta" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3 min-w-50">
          <UserAvatar
            name={row.getValue("name")}
            src={row.original.profile?.photo}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-mono text-muted-foreground truncate">
              {row.original.idTkm}
            </span>
            <span
              className="font-medium truncate"
              title={row.getValue("name")}
            >
              {row.getValue("name")}
            </span>
            {row.original.businessProfile?.businessSector && (
              <span
                className="text-xs text-muted-foreground truncate italic font-normal max-w-45"
                title={`Sektor: ${row.original.businessProfile.businessSector}`}
              >
                Sektor: {row.original.businessProfile.businessSector}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "mentorName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Mentor / Universitas" />
      ),
      cell: ({ row }) => {
        const mName =
          row.original.mentor?.user?.profile?.name || "Belum ada mentor";
        const univName = row.original.university?.name || "Belum Dibagikan";
        const isUnassigned = !row.original.university;
        return (
          <div className="flex flex-col min-w-37.5 leading-tight">
            <span className="truncate block font-medium" title={mName}>
              {mName}
            </span>
            <span
              className={`truncate block text-[11px] mt-0.5 ${
                isUnassigned
                  ? "text-rose-500 font-medium italic"
                  : "text-muted-foreground font-normal"
              }`}
              title={univName}
            >
              {univName}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "mentoringCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Kunjungan" />
      ),
      cell: ({ row }) => {
        const count = getOfflineIndividualVisitCount(row.original);
        return (
          <div className="flex min-w-25">
            <VisitCountBadge count={count} />
          </div>
        );
      },
    },
    {
      accessorKey: "revenueChangePercentage",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tren Omset" />
      ),
      cell: ({ row }) => {
        const pct = row.original.revenueChangePercentage;
        const status = row.original.revenueStatus;

        return (
          <div className="flex items-center gap-1 min-w-35 text-xs font-normal">
            {status === "Naik" && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 gap-0.5 font-bold py-0.5 h-5 shadow-2xs">
                <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />+{pct?.toFixed(1)}%
              </Badge>
            )}
            {status === "Turun" && (
              <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 gap-0.5 font-bold py-0.5 h-5 shadow-2xs">
                <TrendingDown className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                {pct?.toFixed(1)}%
              </Badge>
            )}
            {status === "Tetap" && (
              <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-muted dark:text-muted-foreground dark:border-border gap-0.5 py-0.5 h-5">
                <Minus className="h-3 w-3" />
                0%
              </Badge>
            )}
            {status === "Tidak Ada Laporan Bulanan" && (
              <span className="text-muted-foreground/80 italic text-[11px]">
                Belum ada lap. bulanan
              </span>
            )}
            {status === "Tidak Ada Data Awal" && (
              <span className="text-muted-foreground/80 italic text-[11px]">
                Belum ada data awal (bulan 0)
              </span>
            )}
            {status === "Tidak Ada Data" && (
              <span className="text-muted-foreground/80 italic text-[11px]">
                Belum ada data
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const applicant = row.original;
        const badgeInfo = getStatusBadgeInfo(applicant);
        const Icon = badgeInfo.icon;
        const canUpdateStatus = checkCanUpdateStatus(applicant);

        // Jika semua positif
        if (badgeInfo.type === "positive") {
          if (canUpdateStatus) {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedApplicant(applicant);
                        setStatusModalOpen(true);
                      }}
                      className="inline-flex items-center justify-center p-1 rounded-full text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Semua status positif. Klik untuk memperbarui status.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center justify-center p-1 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Semua status positif
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        // Jika ada status negatif
        if (canUpdateStatus) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedApplicant(applicant);
                      setStatusModalOpen(true);
                    }}
                    className={`gap-1 font-medium text-xs py-1 px-2.5 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs ${badgeInfo.className}`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{badgeInfo.label}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Klik untuk memperbarui status pendampingan
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return (
          <Badge
            variant="outline"
            className={`gap-1 font-medium text-xs py-1 px-2.5 cursor-default ${badgeInfo.className}`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{badgeInfo.label}</span>
          </Badge>
        );
      },
    },
    {
      accessorKey: "communicationStatus",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Komunikasi" />
      ),
      cell: ({ row }) => {
        const val = row.getValue("communicationStatus");
        return val === CommunicationStatus.NO_RESPONSE ? (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-xs">
            Tidak Merespon
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs">
            Merespon
          </Badge>
        );
      },
    },
    {
      accessorKey: "willingness",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Kesediaan" />
      ),
      cell: ({ row }) => {
        const val = row.getValue("willingness");
        return val === Willingness.NOT_WILLING ? (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-xs">
            Tidak Bersedia
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs">
            Bersedia
          </Badge>
        );
      },
    },
    {
      accessorKey: "presenceStatus",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Keberadaan" />
      ),
      cell: ({ row }) => {
        const val = row.getValue("presenceStatus");
        return val === PresenceStatus.NOT_FOUND ? (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 text-xs">
            Tidak Ditemukan
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs">
            Ditemukan
          </Badge>
        );
      },
    },
    {
      accessorKey: "fundDisbursement",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Dana" />
      ),
      cell: ({ row }) => {
        const val = row.getValue("fundDisbursement");
        return val === FundDisbursement.NOT_DISBURSED ? (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-xs">
            Belum Disalurkan
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs">
            Sudah Disalurkan
          </Badge>
        );
      },
    },
    {
      id: "followUpRecommendation",
      header: "Tindak Lanjut",
      cell: ({ row }) => {
        const applicant = row.original;
        const isEligible = applicant.isEligibleForFollowUp;
        const followUpRec = applicant.followUpRecommendation;
        const status = followUpRec?.status;

        // Helper badge/button
        if (status === "APPROVED") {
          return (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100 font-medium cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                router.push(
                  `/applicants/${applicant.id}/follow-up-recommendation`,
                );
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              RTL Disetujui
            </Button>
          );
        }

        if (status === "SUBMITTED") {
          return (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 hover:bg-blue-100 font-medium cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                router.push(
                  `/applicants/${applicant.id}/follow-up-recommendation`,
                );
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              RTL Diajukan
            </Button>
          );
        }

        if (status === "REJECTED") {
          return (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-100 font-medium cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                router.push(
                  `/applicants/${applicant.id}/follow-up-recommendation`,
                );
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Perlu Revisi
            </Button>
          );
        }

        if (status === "DRAFT") {
          return (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800 hover:bg-indigo-100 font-medium cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                router.push(
                  `/applicants/${applicant.id}/follow-up-recommendation`,
                );
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Draft RTL
            </Button>
          );
        }

        if (isEligible) {
          return (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-700 hover:bg-amber-100 font-semibold shadow-xs cursor-pointer animate-pulse"
              onClick={(e) => {
                e.stopPropagation();
                router.push(
                  `/applicants/${applicant.id}/follow-up-recommendation`,
                );
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              R. Tindak Lanjut
            </Button>
          );
        }

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block cursor-not-allowed">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="h-7 text-xs gap-1 opacity-50 pointer-events-none text-muted-foreground border-border/60"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                    R. Tindak Lanjut
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="text-xs max-w-50 text-center"
              >
                Rekomendasi Tindak Lanjut baru dapat diisi setelah Output
                Report Bulan 1, 2, dan 3 berstatus APPROVED
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const isReadOnly =
          isWorkspaceInactive || currentRole === "WORKSPACE_SUPERVISOR";
        const canEdit = checkCanEdit(row.original);
        const canDelete =
          !isWorkspaceInactive && currentRole === "SUPER_ADMIN";
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/applicants/${row.original.id}`);
              }}
            >
              Detail
            </Button>
            {!isReadOnly && (canEdit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 cursor-pointer"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                  {canEdit && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/applicants/${row.original.id}/edit`);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Edit Profil
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      className="text-destructive cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteApplicant(
                          row.original.id,
                          row.getValue("name"),
                        );
                      }}
                    >
                      Hapus Peserta
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      },
    },
  ];
}
