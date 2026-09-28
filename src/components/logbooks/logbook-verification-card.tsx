"use client";

import * as React from "react";
import { VerificationStatus } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  UserCheck, 
  ShieldCheck, 
  Clock, 
  XCircle, 
  Calendar,
  Check,
  RotateCcw
} from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspaces";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RevisionHistoryTimeline } from "@/components/common/revision-history-timeline";
import { RejectVerificationDialog } from "@/components/common/reject-verification-dialog";
import { VerificationStepperItem } from "@/components/common/verification-stepper-item";
import { formatDateTime, formatDateDisplay } from "@/lib/format-date";

interface LogbookVerificationCardProps {
  logbook: any;
  currentRole: string | null;
  currentUserId: string | null;
  currentWorkspaceId: string | null;
  isVerifying: boolean;
  onVerify: (status: VerificationStatus, note?: string) => void;
}

export function LogbookVerificationCard({
  logbook,
  currentRole,
  currentWorkspaceId,
  isVerifying,
  onVerify,
}: LogbookVerificationCardProps) {
  const { data: workspace } = useWorkspace(currentWorkspaceId || "");
  const isWorkspaceActive = workspace?.isActive ?? true;
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
  const [isUnverifyDialogOpen, setIsUnverifyDialogOpen] = React.useState(false);

  const mentor = logbook.createdBy;
  const mentorProfile = mentor?.user?.profile;
  const mentorUser = mentor?.user;
  const mentorUniv = mentor?.university;

  const verifier = logbook.verifiedBy;
  const verifierProfile = verifier?.user?.profile;
  const verifierUser = verifier?.user;
  const verifierUniv = verifier?.university;

  const isApproved = logbook.verificationStatus === VerificationStatus.APPROVED;
  const isRejected = logbook.verificationStatus === VerificationStatus.REJECTED;
  const isPending = logbook.verificationStatus === VerificationStatus.PENDING;
  const canVerify = currentRole === "UNIVERSITY_ADMIN" || currentRole === "SUPER_ADMIN";

  const handleAction = (status: VerificationStatus, note?: string) => {
    if (status === VerificationStatus.REJECTED) {
      if (!note || note.trim() === "") {
        toast.error("Catatan verifikasi wajib diisi jika menolak laporan");
        return;
      }
      onVerify(status, note);
      setIsRejectDialogOpen(false);
    } else {
      onVerify(status);
      if (status === VerificationStatus.PENDING) {
        setIsUnverifyDialogOpen(false);
      }
    }
  };

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden bg-card">
      {/* Header bar: Tanggal & Status Verifikasi */}
      <div className="bg-muted/30 px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold bg-background flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {formatDateDisplay(logbook.logbookDate)}
          </Badge>
          <StatusBadge status={logbook.verificationStatus} />
        </div>

        {logbook.jpl && (
          <span className="text-xs font-mono font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
            {logbook.jpl} JPL
          </span>
        )}
      </div>

      <CardContent className="p-5 space-y-6">
        {/* Connected Stepper Timeline (2 Steps: Pendamping -> Admin Verifikator) */}
        <div className="relative pl-6 space-y-7 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-[2px] before:bg-border/60">
          
          {/* STEP 1: Tenaga Pendamping (Pembuat Logbook) */}
          <VerificationStepperItem
            stepNumber="1"
            stepNodeClassName="border-indigo-500 text-indigo-600 dark:text-indigo-400"
            categoryTitle="Tenaga Pendamping (PIC)"
            categoryIcon={<UserCheck className="h-3.5 w-3.5" />}
            categoryTitleClassName="text-indigo-600 dark:text-indigo-400"
            badgeLabel="Pembuat"
            badgeClassName="border-indigo-200 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30"
            name={mentorProfile?.name || "Tenaga Pendamping"}
            photo={mentorProfile?.photo}
            avatarRingClassName="ring-indigo-500/30 dark:ring-indigo-400/40"
            institution={mentorUniv?.name || "Universitas Pengusul"}
            phone={mentorProfile?.whatsapp || mentorProfile?.phone}
            email={mentorProfile?.email || mentorUser?.email}
          />

          {/* STEP 2: Admin Verifikator (Penyetujui Logbook) */}
          <VerificationStepperItem
            stepNumber={isApproved ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : isRejected ? <XCircle className="h-3.5 w-3.5" /> : "2"}
            stepNodeClassName={cn(
              isApproved && "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50",
              isRejected && "border-destructive text-destructive bg-destructive/10",
              isPending && "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/50"
            )}
            categoryTitle="Admin Penyetuju"
            categoryIcon={<ShieldCheck className="h-3.5 w-3.5" />}
            categoryTitleClassName={cn(
              isApproved && "text-emerald-700 dark:text-emerald-400",
              isRejected && "text-destructive",
              isPending && "text-muted-foreground"
            )}
            badgeLabel="Verifikator"
            name={verifierProfile?.name || (isPending ? "Menunggu Verifikasi" : "Admin Universitas")}
            photo={verifierProfile?.photo}
            avatarRingClassName={cn(
              isApproved ? "ring-emerald-500/40" : isRejected ? "ring-destructive/40" : "ring-muted-foreground/30"
            )}
            institution={verifierUniv?.name || mentorUniv?.name || "Admin Universitas"}
            phone={verifierProfile?.whatsapp || verifierProfile?.phone}
            email={verifierProfile?.email || verifierUser?.email}
            statusSlot={
              <div className="pt-0.5">
                {isApproved ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span className="truncate">
                      Disetujui: {formatDateTime(logbook.verifiedAt || logbook.updatedAt)}
                    </span>
                  </div>
                ) : isRejected ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-destructive" />
                    <span className="truncate">
                      Ditolak: {formatDateTime(logbook.verifiedAt || logbook.updatedAt)}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs italic text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    Belum diverifikasi
                  </div>
                )}
              </div>
            }
          />
        </div>

        {/* Rejection Notes / Sanggahan Notes Timeline */}
        {(logbook.verificationNote || logbook.rebuttalNote || (logbook.verificationHistory && logbook.verificationHistory.length > 0)) && (
          <div className="pt-2 border-t">
            <RevisionHistoryTimeline
              history={logbook.verificationHistory}
              currentVerificationNote={logbook.verificationNote}
              currentRebuttalNote={logbook.rebuttalNote}
            />
          </div>
        )}

        {/* Admin Verification Action Buttons */}
        {isPending && canVerify && isWorkspaceActive && (
          <div className="pt-3 border-t flex items-center justify-end gap-2">
            <Button
              variant="destructive"
              className="w-auto text-xs h-9 px-4 font-semibold cursor-pointer"
              onClick={() => setIsRejectDialogOpen(true)}
              disabled={isVerifying}
            >
              Tolak
            </Button>
            <Button
              className="w-auto px-4 bg-emerald-600 hover:bg-emerald-700 text-xs h-9 font-semibold cursor-pointer"
              onClick={() => handleAction(VerificationStatus.APPROVED)}
              disabled={isVerifying}
            >
              {isVerifying ? "Memproses..." : "Setujui Logbook"}
            </Button>
          </div>
        )}

        {/* Batalkan Verifikasi Button (for Approved or Rejected) */}
        {!isPending && canVerify && isWorkspaceActive && (
          <div className="pt-3 border-t flex items-center justify-end">
            <Button
              variant="outline"
              className="w-auto px-4 text-xs h-9 font-semibold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50/50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 gap-1.5 cursor-pointer"
              onClick={() => setIsUnverifyDialogOpen(true)}
              disabled={isVerifying}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Batalkan Verifikasi
            </Button>
          </div>
        )}

        {/* Modular Reject Dialog */}
        <RejectVerificationDialog
          open={isRejectDialogOpen}
          onOpenChange={setIsRejectDialogOpen}
          title="Tolak Logbook Harian"
          description="Masukkan alasan penolakan. Catatan ini wajib diisi dan akan dikirimkan kepada pendamping untuk perbaikan logbook."
          placeholder="Alasan penolakan / masukan perbaikan data logbook..."
          isSubmitting={isVerifying}
          onConfirm={(note) => handleAction(VerificationStatus.REJECTED, note)}
        />

        {/* Dialog Batalkan Verifikasi */}
        <Dialog open={isUnverifyDialogOpen} onOpenChange={setIsUnverifyDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                <RotateCcw className="h-5 w-5" />
                Batalkan Verifikasi Logbook?
              </DialogTitle>
              <DialogDescription className="pt-2">
                Status logbook ini akan dikembalikan menjadi <strong>Menunggu Verifikasi (Pending)</strong>.
                Data verifikasi sebelumnya akan di-reset dan pendamping dapat mengubah kembali data logbook harian ini.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUnverifyDialogOpen(false)}
                disabled={isVerifying}
              >
                Tutup
              </Button>
              <Button
                type="button"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => handleAction(VerificationStatus.PENDING)}
                disabled={isVerifying}
              >
                {isVerifying ? "Memproses..." : "Ya, Batalkan Verifikasi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
