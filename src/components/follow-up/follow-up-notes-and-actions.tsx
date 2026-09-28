"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FollowUpRecommendation } from "@/types";
import { Save, Send, ArrowLeft, CheckCircle2, XCircle, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RejectVerificationDialog } from "@/components/common/reject-verification-dialog";

interface FollowUpNotesAndActionsProps {
  mentorNote: string;
  onMentorNoteChange: (val: string) => void;
  onSaveDraft: () => void;
  onSubmitToAdmin: () => void;
  onApproveByAdmin?: () => void;
  onRejectByAdmin?: (reason: string) => void;
  onUnverifyByAdmin?: () => void;
  isMentor: boolean;
  isAdmin: boolean;
  isReadOnly: boolean;
  isWorkspaceInactive?: boolean;
  isSaving: boolean;
  recommendation?: FollowUpRecommendation | null;
}

export function FollowUpNotesAndActions({
  mentorNote,
  onMentorNoteChange,
  onSaveDraft,
  onSubmitToAdmin,
  onApproveByAdmin,
  onRejectByAdmin,
  onUnverifyByAdmin,
  isMentor,
  isAdmin,
  isReadOnly,
  isWorkspaceInactive = false,
  isSaving,
  recommendation,
}: FollowUpNotesAndActionsProps) {
  const router = useRouter();
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
  const [isUnverifyDialogOpen, setIsUnverifyDialogOpen] = React.useState(false);

  const status = recommendation?.status;

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border/80">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold tracking-tight">Catatan Akhir Pendamping</CardTitle>
          <CardDescription>
            Uraian naratif mengenai komitmen peserta, potensi keberlanjutan usaha, dan catatan khusus
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isReadOnly ? (
            <div className="text-sm p-4 rounded-xl bg-muted/30 border leading-relaxed whitespace-pre-wrap">
              {mentorNote || <span className="text-muted-foreground italic">Tidak ada catatan akhir.</span>}
            </div>
          ) : (
            <Textarea
              value={mentorNote}
              onChange={(e) => onMentorNoteChange(e.target.value)}
              placeholder="Tuliskan catatan evaluasi menyeluruh mengenai perkembangan usaha peserta dan kesiapan pasca-pendampingan..."
              className="min-h-[100px] text-sm resize-y"
            />
          )}
        </CardContent>
      </Card>

      {/* Action Bar Bawah */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border bg-card/80 backdrop-blur-xs sticky bottom-4 shadow-lg">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSaving}
          className="w-full sm:w-auto gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Alur Aksi Mentor (Saat DRAFT / REJECTED / Belum Dibuat) */}
          {isMentor && !isReadOnly && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={onSaveDraft}
                disabled={isSaving}
                className="w-full sm:w-auto gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Draft
              </Button>

              <Button
                type="button"
                variant="default"
                onClick={onSubmitToAdmin}
                disabled={isSaving}
                className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Ajukan ke Admin Universitas
              </Button>
            </>
          )}

          {/* Alur Aksi Admin Universitas (Saat status SUBMITTED dan workspace aktif) */}
          {isAdmin && !isWorkspaceInactive && status === "SUBMITTED" && (
            <>
              {/* Tombol & Dialog Tolak / Batalkan */}
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => setIsRejectDialogOpen(true)}
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <XCircle className="h-4 w-4" /> Batalkan / Minta Revisi
              </Button>

              <RejectVerificationDialog
                open={isRejectDialogOpen}
                onOpenChange={setIsRejectDialogOpen}
                title="Minta Revisi Rekomendasi"
                description="Berikan catatan alasan mengapa rekomendasi ini ditolak/perlu diperbaiki oleh mentor."
                placeholder="Contoh: Tolong tambahkan rincian perkiraan biaya untuk sertifikasi Halal..."
                isSubmitting={isSaving}
                onConfirm={(note) => {
                  if (onRejectByAdmin) {
                    onRejectByAdmin(note);
                    setIsRejectDialogOpen(false);
                  }
                }}
              />

              {/* Tombol Setujui */}
              <Button
                type="button"
                variant="default"
                onClick={onApproveByAdmin}
                disabled={isSaving}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Setujui Rekomendasi
              </Button>
            </>
          )}

          {/* Alur Aksi Admin Universitas: Batalkan Verifikasi (Saat status APPROVED atau REJECTED) */}
          {isAdmin && !isWorkspaceInactive && (status === "APPROVED" || status === "REJECTED") && onUnverifyByAdmin && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => setIsUnverifyDialogOpen(true)}
                className="w-full sm:w-auto gap-2 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50/50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" /> Batalkan Verifikasi
              </Button>

              <Dialog open={isUnverifyDialogOpen} onOpenChange={setIsUnverifyDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                      <RotateCcw className="h-5 w-5" />
                      Batalkan Verifikasi Rekomendasi?
                    </DialogTitle>
                    <DialogDescription className="pt-2 leading-relaxed">
                      Status rekomendasi tindak lanjut untuk peserta ini akan dikembalikan menjadi <strong>Menunggu Persetujuan</strong>.
                      Verifikasi sebelumnya akan dibatalkan sehingga Anda dapat meninjau ulang, menyetujui kembali, atau meminta revisi perbaikan.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="mt-4 gap-2 sm:gap-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsUnverifyDialogOpen(false)}
                      disabled={isSaving}
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                      onClick={() => {
                        onUnverifyByAdmin();
                        setIsUnverifyDialogOpen(false);
                      }}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      Ya, Batalkan Verifikasi
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
