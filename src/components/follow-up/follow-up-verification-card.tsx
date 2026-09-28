"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  UserCheck,
  ShieldCheck,
  Save,
  Send,
  Loader2,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Applicant, FollowUpRecommendation, FollowUpStatus } from "@/types";
import { RejectVerificationDialog } from "@/components/common/reject-verification-dialog";
import { VerificationStepperItem } from "@/components/common/verification-stepper-item";
import { formatDateTime } from "@/lib/format-date";

interface FollowUpVerificationCardProps {
  applicant: Applicant;
  recommendation?: FollowUpRecommendation | null;
  currentRole?: string | null;
  isWorkspaceActive?: boolean;
  isSaving: boolean;
  onSaveDraft?: () => void;
  onSubmitToAdmin?: () => void;
  onApproveByAdmin?: () => void;
  onRejectByAdmin?: (reason: string) => void;
  onUnverifyByAdmin?: () => void;
}

export function FollowUpVerificationCard({
  applicant,
  recommendation,
  currentRole,
  isWorkspaceActive = true,
  isSaving,
  onSaveDraft,
  onSubmitToAdmin,
  onApproveByAdmin,
  onRejectByAdmin,
  onUnverifyByAdmin,
}: FollowUpVerificationCardProps) {
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
  const [isUnverifyDialogOpen, setIsUnverifyDialogOpen] = React.useState(false);

  const status = recommendation?.status || FollowUpStatus.DRAFT;
  const isApproved = status === FollowUpStatus.APPROVED;
  const isRejected = status === FollowUpStatus.REJECTED;
  const isSubmitted = status === FollowUpStatus.SUBMITTED;
  const isDraft = status === FollowUpStatus.DRAFT;

  const isMentor = currentRole === "MENTOR";
  const canAdminVerify = currentRole === "UNIVERSITY_ADMIN" || currentRole === "SUPER_ADMIN";

  // Mentor PIC
  const mentorMember = recommendation?.mentor || applicant.mentor;
  const mentorProfile = mentorMember?.user?.profile;
  const mentorUniv = applicant.university;

  // Verifikator Admin
  const verifierMember = recommendation?.reviewedBy;
  const verifierProfile = verifierMember?.user?.profile;

  const handleConfirmReject = (reason: string) => {
    if (!onRejectByAdmin) return;
    onRejectByAdmin(reason);
    setIsRejectDialogOpen(false);
  };

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden bg-card">
      {/* Header bar: Status Verifikasi & Info */}
      <div className="bg-muted/30 px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge
            variant={
              isApproved
                ? "default"
                : isRejected
                ? "destructive"
                : isSubmitted
                ? "secondary"
                : "outline"
            }
            className={cn(
              "text-xs font-semibold px-2.5 py-0.5 flex items-center gap-1.5",
              isApproved && "bg-emerald-600 hover:bg-emerald-700 text-white",
              isSubmitted && "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            {isApproved && <CheckCircle2 className="h-3.5 w-3.5" />}
            {isRejected && <XCircle className="h-3.5 w-3.5" />}
            {isSubmitted && <Clock className="h-3.5 w-3.5" />}
            {isDraft && <AlertCircle className="h-3.5 w-3.5" />}
            {isApproved
              ? "Disetujui"
              : isRejected
              ? "Perlu Revisi"
              : isSubmitted
              ? "Menunggu Persetujuan"
              : "Draft Rekomendasi"}
          </Badge>
        </div>

        {recommendation?.updatedAt && (
          <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(recommendation.updatedAt), "dd/MM/yyyy", { locale: idLocale })}
          </span>
        )}
      </div>

      <CardContent className="p-5 space-y-6">
        {/* Connected Stepper Timeline (2 Steps: Pendamping -> Admin Verifikator) */}
        <div className="relative pl-6 space-y-7 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-[2px] before:bg-border/60">
          {/* STEP 1: Tenaga Pendamping (Penyusun RTL) */}
          <VerificationStepperItem
            stepNumber="1"
            stepNodeClassName="border-indigo-500 text-indigo-600 dark:text-indigo-400"
            categoryTitle="Tenaga Pendamping"
            categoryIcon={<UserCheck className="h-3.5 w-3.5" />}
            categoryTitleClassName="text-indigo-600 dark:text-indigo-400"
            badgeLabel="Penyusun"
            badgeClassName="border-indigo-200 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30"
            name={mentorProfile?.name || "Tenaga Pendamping"}
            photo={mentorProfile?.photo}
            avatarRingClassName="ring-indigo-500/30 dark:ring-indigo-400/40"
            institution={mentorUniv?.name || "Universitas Pengampu"}
            phone={mentorProfile?.whatsapp}
            email={mentorProfile?.email}
            statusSlot={
              <div className="pt-0.5">
                {recommendation?.submittedAt ? (
                  <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      Diajukan: {formatDateTime(recommendation.submittedAt)}
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] italic text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0" />
                    {isDraft ? "Draft belum diajukan" : "Belum diajukan"}
                  </div>
                )}
              </div>
            }
          />

          {/* STEP 2: Admin Verifikator (Penyetuju RTL) */}
          <VerificationStepperItem
            stepNumber={
              isApproved ? (
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              ) : isRejected ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : (
                "2"
              )
            }
            stepNodeClassName={cn(
              isApproved && "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50",
              isRejected && "border-destructive text-destructive bg-destructive/10",
              isSubmitted && "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/50",
              isDraft && "border-muted-foreground/40 text-muted-foreground"
            )}
            categoryTitle="Admin Penyetuju"
            categoryIcon={<ShieldCheck className="h-3.5 w-3.5" />}
            categoryTitleClassName={cn(
              isApproved && "text-emerald-700 dark:text-emerald-400",
              isRejected && "text-destructive",
              isSubmitted && "text-blue-600 dark:text-blue-400",
              isDraft && "text-muted-foreground"
            )}
            badgeLabel="Verifikator"
            name={
              verifierProfile?.name ||
              (isSubmitted
                ? "Menunggu Persetujuan"
                : isApproved
                ? "Admin Universitas"
                : isDraft
                ? "Menunggu Diajukan"
                : "Admin Universitas")
            }
            photo={verifierProfile?.photo}
            avatarRingClassName={cn(
              isApproved
                ? "ring-emerald-500/40"
                : isRejected
                ? "ring-destructive/40"
                : "ring-muted-foreground/30"
            )}
            institution={mentorUniv?.name || "Admin Universitas"}
            phone={verifierProfile?.whatsapp}
            email={verifierProfile?.email}
            statusSlot={
              <div className="pt-0.5">
                {isApproved ? (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <Clock className="h-3 w-3 shrink-0 text-emerald-600" />
                    <span className="truncate">
                      Disetujui: {formatDateTime(recommendation?.reviewedAt || recommendation?.updatedAt)}
                    </span>
                  </div>
                ) : isRejected ? (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-destructive">
                    <Clock className="h-3 w-3 shrink-0 text-destructive" />
                    <span className="truncate">
                      Ditolak: {formatDateTime(recommendation?.reviewedAt || recommendation?.updatedAt)}
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] italic text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                    <Clock className="h-3 w-3 shrink-0" />
                    {isSubmitted ? "Belum diverifikasi" : "Belum dalam antrean"}
                  </div>
                )}
              </div>
            }
          />
        </div>

        {/* Catatan Revisi jika ada */}
        {recommendation?.reviewNote && (
          <div className="pt-3 border-t">
            <div className="rounded-lg p-3 bg-destructive/10 border border-destructive/20 text-xs space-y-1">
              <span className="font-bold text-destructive flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Catatan Revisi Admin:
              </span>
              <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {recommendation.reviewNote}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons: Aksi untuk Admin & Mentor */}
        <div className="pt-3 border-t space-y-2">
          {/* Aksi Admin: Saat status SUBMITTED */}
          {canAdminVerify && isWorkspaceActive && isSubmitted && (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-semibold gap-1.5"
                onClick={onApproveByAdmin}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Setujui Rekomendasi
              </Button>

              <Button
                type="button"
                variant="destructive"
                className="w-full text-xs h-9 font-semibold gap-1.5"
                onClick={() => setIsRejectDialogOpen(true)}
                disabled={isSaving}
              >
                <XCircle className="h-3.5 w-3.5" />
                Minta Revisi
              </Button>
            </div>
          )}

          {/* Aksi Batalkan Verifikasi Admin: Saat status APPROVED atau REJECTED */}
          {canAdminVerify && isWorkspaceActive && (isApproved || isRejected) && (
            <Button
              type="button"
              variant="outline"
              className="w-full text-xs h-9 font-semibold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50/50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 gap-1.5"
              onClick={() => setIsUnverifyDialogOpen(true)}
              disabled={isSaving}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Batalkan Status Verifikasi
            </Button>
          )}

          {/* Aksi Mentor: Saat status DRAFT atau REJECTED */}
          {isMentor && isWorkspaceActive && (isDraft || isRejected) && (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 font-semibold gap-1.5"
                onClick={onSubmitToAdmin}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {isRejected ? "Ajukan Kembali Perbaikan" : "Ajukan ke Admin Universitas"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full text-xs h-9 font-semibold gap-1.5"
                onClick={onSaveDraft}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Simpan Draft
              </Button>
            </div>
          )}
        </div>

        {/* Dialog Konfirmasi Tolak / Revisi (Modular) */}
        <RejectVerificationDialog
          open={isRejectDialogOpen}
          onOpenChange={setIsRejectDialogOpen}
          title="Minta Revisi Rekomendasi"
          description="Berikan catatan alasan penolakan/perbaikan data RTL yang harus diperbaiki oleh pendamping."
          placeholder="Contoh: Tolong perbaiki usulan program sertifikasi dan lengkapi rincian biaya..."
          isSubmitting={isSaving}
          onConfirm={handleConfirmReject}
        />

        {/* Dialog Konfirmasi Batalkan Verifikasi */}
        <Dialog open={isUnverifyDialogOpen} onOpenChange={setIsUnverifyDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                <RotateCcw className="h-5 w-5" />
                Batalkan Verifikasi Rekomendasi?
              </DialogTitle>
              <DialogDescription className="pt-2 leading-relaxed">
                Status rekomendasi tindak lanjut untuk peserta ini akan dikembalikan menjadi{" "}
                <strong>Draft / Siap Diajukan</strong>. Data verifikasi sebelumnya akan dibatalkan
                sehingga mentor dapat memperbaiki dan mengajukan kembali.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUnverifyDialogOpen(false)}
                disabled={isSaving}
              >
                Tutup
              </Button>
              <Button
                type="button"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => {
                  if (onUnverifyByAdmin) onUnverifyByAdmin();
                  setIsUnverifyDialogOpen(false);
                }}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Ya, Batalkan Verifikasi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
