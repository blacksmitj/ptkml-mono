"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useFollowUpRecommendation,
  useCreateFollowUpRecommendation,
  useUpdateFollowUpRecommendation,
  useSubmitFollowUpRecommendation,
  useReviewFollowUpRecommendation,
} from "@/hooks/use-follow-up-recommendations";
import { useWorkspace } from "@/hooks/use-workspaces";
import { useAppStore } from "@/store/use-app-store";
import { useMe } from "@/hooks/use-me";
import { generateSmartFindings } from "@/lib/follow-up-smart-generator";
import { FollowUpFindingItem, FollowUpRecommendationItem } from "@/types";
import { FollowUpParticipantCard } from "@/components/follow-up/follow-up-participant-card";
import { FollowUpOutputSummaryCard } from "@/components/follow-up/follow-up-output-summary-card";
import { FollowUpFindingsCard } from "@/components/follow-up/follow-up-findings-card";
import { FollowUpInterventionsCard } from "@/components/follow-up/follow-up-interventions-card";
import { FollowUpMentorNoteCard } from "@/components/follow-up/follow-up-mentor-note-card";
import { FollowUpVerificationCard } from "@/components/follow-up/follow-up-verification-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, Eye, Info } from "lucide-react";
import { toast } from "sonner";

export default function FollowUpRecommendationPage() {
  const params = useParams();
  const router = useRouter();
  const applicantId = params?.id as string;

  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentRole = useAppStore((state) => state.currentRole);
  const { data: workspace } = useWorkspace(currentWorkspaceId || "");
  const { data: meUser } = useMe();

  const { data: followUpData, isLoading, isError, refetch } = useFollowUpRecommendation(applicantId);

  const createMutation = useCreateFollowUpRecommendation();
  const updateMutation = useUpdateFollowUpRecommendation();
  const submitMutation = useSubmitFollowUpRecommendation();
  const reviewMutation = useReviewFollowUpRecommendation();

  // Local Form State
  const [findings, setFindings] = React.useState<FollowUpFindingItem[]>([]);
  const [recommendations, setRecommendations] = React.useState<FollowUpRecommendationItem[]>([]);
  const [mentorNote, setMentorNote] = React.useState<string>("");
  const [isInitialized, setIsInitialized] = React.useState<boolean>(false);

  const applicant = followUpData?.applicant;
  const isEligible = followUpData?.isEligible ?? false;
  const existingRec = followUpData?.recommendation;

  // Workspace status check
  const isWorkspaceInactive = workspace?.isActive === false;

  // Strict role checks:
  // - MENTOR: Can create, edit, and submit recommendations (when DRAFT / REJECTED)
  // - UNIVERSITY_ADMIN: View-Only on form inputs, can review (approve/reject) when status is SUBMITTED
  // - SUPER_ADMIN & WORKSPACE_SUPERVISOR: Strictly View-Only oversight across all universities
  const isSuperAdmin = currentRole === "SUPER_ADMIN" || currentRole === "WORKSPACE_SUPERVISOR";
  const isMentor = currentRole === "MENTOR";
  const isUniversityAdmin = currentRole === "UNIVERSITY_ADMIN";
  const canAdminVerify = isUniversityAdmin || currentRole === "SUPER_ADMIN";

  const status = existingRec?.status || "DRAFT";
  const isReadOnly =
    isWorkspaceInactive ||
    !isMentor ||
    (isMentor && (status === "SUBMITTED" || status === "APPROVED"));

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    submitMutation.isPending ||
    reviewMutation.isPending;

  // Initialize Form Data
  React.useEffect(() => {
    if (!followUpData || isInitialized) return;

    if (existingRec) {
      // Load saved recommendation
      const rawFindings = existingRec.findings;
      const loadedFindings = Array.isArray(rawFindings) ? rawFindings : [];
      const rawRecs = existingRec.recommendations;
      const loadedRecs = Array.isArray(rawRecs) ? rawRecs : [];

      setFindings(loadedFindings);
      setRecommendations(loadedRecs);
      setMentorNote(existingRec.mentorNote || "");
    } else if (applicant?.outputReports) {
      // First time opening: auto-generate findings from B0-B3
      const smartFindings = generateSmartFindings(applicant.outputReports);
      setFindings(smartFindings);
    }

    setIsInitialized(true);
  }, [followUpData, existingRec, applicant, isInitialized]);

  // Handler Reset Smart Findings
  const handleResetAutoGenerate = () => {
    if (!applicant?.outputReports) return;
    const smartFindings = generateSmartFindings(applicant.outputReports);
    setFindings(smartFindings);
    toast.info("Catatan temuan telah direset ke data otomatis B0–B3");
  };

  // Handler Simpan Draft
  const handleSaveDraft = async () => {
    if (!currentWorkspaceId) {
      toast.error("Workspace aktif tidak ditemukan");
      return;
    }

    try {
      if (existingRec) {
        await updateMutation.mutateAsync({
          id: existingRec.id,
          findings,
          recommendations,
          mentorNote,
          submitNow: false,
        });
        toast.success("Draft rekomendasi tindak lanjut berhasil diperbarui");
      } else {
        await createMutation.mutateAsync({
          applicantId,
          workspaceId: currentWorkspaceId,
          findings,
          recommendations,
          mentorNote,
          submitNow: false,
        });
        toast.success("Draft rekomendasi tindak lanjut berhasil disimpan");
      }
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Gagal menyimpan draft");
    }
  };

  // Handler Ajukan ke Admin
  const handleSubmitToAdmin = async () => {
    if (!currentWorkspaceId) {
      toast.error("Workspace aktif tidak ditemukan");
      return;
    }

    if (recommendations.length === 0) {
      toast.error("Mohon tambahkan minimal 1 item rekomendasi tindak lanjut sebelum mengajukan");
      return;
    }

    try {
      if (existingRec) {
        await updateMutation.mutateAsync({
          id: existingRec.id,
          findings,
          recommendations,
          mentorNote,
          submitNow: true,
        });
      } else {
        await createMutation.mutateAsync({
          applicantId,
          workspaceId: currentWorkspaceId,
          findings,
          recommendations,
          mentorNote,
          submitNow: true,
        });
      }
      toast.success("Rekomendasi tindak lanjut berhasil diajukan ke Admin Universitas!");
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Gagal mengajukan rekomendasi");
    }
  };

  // Handler Approve by Admin
  const handleApproveByAdmin = async () => {
    if (!existingRec) return;
    try {
      await reviewMutation.mutateAsync({
        id: existingRec.id,
        status: "APPROVED",
      });
      toast.success("Rekomendasi tindak lanjut telah disetujui");
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Gagal menyetujui rekomendasi");
    }
  };

  // Handler Reject / Revision by Admin
  const handleRejectByAdmin = async (reason: string) => {
    if (!existingRec) return;
    try {
      await reviewMutation.mutateAsync({
        id: existingRec.id,
        status: "REJECTED",
        reviewNote: reason,
      });
      toast.info("Rekomendasi tindak lanjut dikembalikan ke mentor untuk revisi");
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Gagal membatalkan rekomendasi");
    }
  };

  // Handler Cancel Verification (Unverify) by Admin
  const handleUnverifyByAdmin = async () => {
    if (!existingRec) return;
    try {
      await reviewMutation.mutateAsync({
        id: existingRec.id,
        status: "SUBMITTED",
      });
      toast.success("Verifikasi rekomendasi tindak lanjut berhasil dibatalkan");
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Gagal membatalkan verifikasi rekomendasi");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !applicant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 max-w-md mx-auto text-center">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Data Peserta Tidak Ditemukan</h2>
        <p className="text-sm text-muted-foreground">
          Terjadi kesalahan saat memuat data rekomendasi tindak lanjut untuk peserta ini.
        </p>
        <Button onClick={() => router.back()} variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>
      </div>
    );
  }

  // Not eligible guard (B1-B3 belum approved)
  if (!isEligible && !existingRec) {
    return (
      <div className="max-w-4xl mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rekomendasi Tindak Lanjut</h1>
            <p className="text-sm text-muted-foreground">Evaluasi Pasca-Pendampingan TKML</p>
          </div>
        </div>

        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-foreground">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="font-semibold text-amber-900 dark:text-amber-300">
            Prasyarat Belum Terpenuhi
          </AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Rekomendasi Tindak Lanjut hanya dapat diisi setelah peserta menyelesaikan seluruh laporan capaian
            output <strong>Bulan 1, Bulan 2, dan Bulan 3</strong> dengan status <strong>APPROVED</strong> (disetujui).
            <br />
            Silakan lengkapi dan minta verifikasi laporan bulanan terlebih dahulu.
          </AlertDescription>
        </Alert>

        <FollowUpParticipantCard applicant={applicant} recommendation={existingRec} />
        <FollowUpOutputSummaryCard outputReports={applicant.outputReports || []} />

        <div className="flex justify-start">
          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Peserta
          </Button>
        </div>
      </div>
    );
  }

  // Recommendation not yet created by mentor guard (for Non-Mentor roles)
  if (!existingRec && !isMentor) {
    return (
      <div className="max-w-4xl mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rekomendasi Tindak Lanjut</h1>
            <p className="text-sm text-muted-foreground">Evaluasi Pasca-Pendampingan TKML</p>
          </div>
        </div>

        <Alert className="border-blue-500/30 bg-blue-500/10 text-foreground">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="font-semibold text-blue-900 dark:text-blue-300">
            Rekomendasi Belum Disusun oleh Pendamping
          </AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Pendamping ({applicant.mentor?.user?.profile?.name || "Pendamping"}) belum membuat atau menyusun draf rekomendasi tindak lanjut untuk peserta ini. Dokumen akan dapat ditinjau di sini setelah disusun dan diajukan oleh pendamping.
          </AlertDescription>
        </Alert>

        <FollowUpParticipantCard applicant={applicant} recommendation={null} />
        <FollowUpOutputSummaryCard outputReports={applicant.outputReports || []} />

        <div className="flex justify-start">
          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Peserta
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Rekomendasi Tindak Lanjut</h1>
              <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Pasca-Pendampingan
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Asesmen akhir perkembangan usaha dan perumusan intervensi balai selanjutnya
            </p>
          </div>
        </div>
      </div>

      {/* Banner Workspace Inactive */}
      {isWorkspaceInactive && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-foreground">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="font-semibold text-amber-900 dark:text-amber-300">
            Workspace Tidak Aktif (Mode Arsip / Read-Only)
          </AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground mt-0.5">
            Workspace ini sedang dinonaktifkan. Seluruh data rekomendasi tindak lanjut hanya dapat dilihat dan tidak dapat diubah atau disetujui.
          </AlertDescription>
        </Alert>
      )}

      {/* Banner Super Admin Read-Only Mode */}
      {isSuperAdmin && !isWorkspaceInactive && (
        <Alert className="border-blue-500/30 bg-blue-500/10 text-foreground">
          <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="font-semibold text-blue-900 dark:text-blue-300">
            Mode Pengawasan (Monitoring Read-Only)
          </AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground mt-0.5">
            Sebagai Super Admin / Pengawas, Anda memiliki akses penuh untuk memantau butir temuan, rekomendasi, dan status verifikasi tanpa mengubah isi pengajuan mentor.
          </AlertDescription>
        </Alert>
      )}

      {/* Banner Notifikasi Catatan Revisi Admin jika status REJECTED */}
      {status === "REJECTED" && existingRec?.reviewNote && (
        <Alert variant="destructive" className="border-rose-500/50 bg-rose-500/10 text-foreground">
          <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          <AlertTitle className="font-semibold text-rose-900 dark:text-rose-300">
            Perlu Perbaikan / Revisi dari Admin Universitas
          </AlertTitle>
          <AlertDescription className="text-sm text-foreground/90 mt-1">
            <strong>Catatan: </strong> {existingRec.reviewNote}
            <div className="text-xs text-muted-foreground mt-1">
              Silakan perbaiki data temuan atau rekomendasi intervensi di samping, lalu klik <strong>Ajukan ke Admin</strong> pada panel verifikasi di sebelah kiri.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Banner Status Approved */}
      {status === "APPROVED" && (
        <Alert className="border-emerald-500/50 bg-emerald-500/10 text-foreground">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="font-semibold text-emerald-900 dark:text-emerald-300">
            Rekomendasi Telah Disetujui
          </AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground mt-0.5">
            Rekomendasi tindak lanjut untuk peserta ini telah disetujui{canAdminVerify ? ". Jika terdapat perubahan atau perlu ditinjau ulang, Admin Universitas dapat membatalkan verifikasi melalui tombol aksi pada panel kiri." : " dan terkunci untuk proses intervensi Balai/Kementerian."}
          </AlertDescription>
        </Alert>
      )}

      {/* Layout 2 Kolom: Kolom Kiri Ruang Verifikasi & Kolom Kanan Detail Konten RTL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* Left Column: Stakeholder Timeline & Verification Actions (Sticky) */}
        <div className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-4 h-fit space-y-4">
          <FollowUpVerificationCard
            applicant={applicant}
            recommendation={existingRec}
            currentRole={currentRole}
            isWorkspaceActive={!isWorkspaceInactive}
            isSaving={isSaving}
            onSaveDraft={handleSaveDraft}
            onSubmitToAdmin={handleSubmitToAdmin}
            onApproveByAdmin={handleApproveByAdmin}
            onRejectByAdmin={handleRejectByAdmin}
            onUnverifyByAdmin={handleUnverifyByAdmin}
          />
        </div>

        {/* Right Column: RTL Data Forms & Findings */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-6 min-w-0">
          {/* Card 1: Profil Peserta */}
          <FollowUpParticipantCard applicant={applicant} recommendation={existingRec} />

          {/* Card 2: Capaian Output B0-B3 */}
          <FollowUpOutputSummaryCard outputReports={applicant.outputReports || []} />

          {/* Card 3: Temuan Pendamping (Smart Auto-filled) */}
          <FollowUpFindingsCard
            findings={findings}
            onChange={setFindings}
            isReadOnly={isReadOnly}
            onResetAutoGenerate={!existingRec || status === "DRAFT" || status === "REJECTED" ? handleResetAutoGenerate : undefined}
          />

          {/* Card 4: Rekomendasi Tindak Lanjut */}
          <FollowUpInterventionsCard
            recommendations={recommendations}
            onChange={setRecommendations}
            isReadOnly={isReadOnly}
          />

          {/* Card 5: Catatan Akhir Pendamping */}
          <FollowUpMentorNoteCard
            mentorNote={mentorNote}
            onMentorNoteChange={setMentorNote}
            isReadOnly={isReadOnly}
          />
        </div>
      </div>
    </div>
  );
}
