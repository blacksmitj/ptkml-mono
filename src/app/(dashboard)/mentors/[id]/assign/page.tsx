"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useMember } from "@/hooks/use-member";
import { useApplicants, useAssignMentor } from "@/hooks/use-applicants";
import { useWorkspace } from "@/hooks/use-workspaces";
import { useAppStore } from "@/store/use-app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ApplicantTransferList } from "@/components/forms/applicant-transfer-list";
import { ChevronLeft, Loader2, CheckCircle2, User, Mail, School } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function MentorAssignmentPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const { data: workspace } = useWorkspace(currentWorkspaceId || "");
  const isWorkspaceInactive = workspace?.isActive === false;

  const { data: member, isLoading: isMemberLoading } = useMember(id);
  const { data: applicants, isLoading: isApplicantsLoading } = useApplicants(currentWorkspaceId || undefined);
  const { mutate: assignMentor, isPending: isSaving } = useAssignMentor();

  const [selectedApplicants, setSelectedApplicants] = React.useState<string[]>([]);

  // Set initial selected applicants from those already assigned to this mentor
  React.useEffect(() => {
    const list = applicants?.data || (Array.isArray(applicants) ? applicants : []);
    if (list.length && id) {
      const assignedIds = list
        .filter((a: any) => a.mentorId === id)
        .map((a: any) => a.id);
      setSelectedApplicants(assignedIds);
    }
  }, [applicants, id]);

  // Filter unassigned applicants or applicants already assigned to this mentor in the same workspace
  const availableApplicants = React.useMemo(() => {
    const list = applicants?.data || (Array.isArray(applicants) ? applicants : []);
    return list
      .filter((a: any) => !a.mentorId || a.mentorId === id)
      .map((a: any) => ({
        id: a.id,
        name: a.profile?.name || "N/A",
        idTkm: a.idTkm,
      }));
  }, [applicants, id]);

  const mentorName = member?.user?.profile?.name || "Pendamping";
  const universityName = member?.university?.name || "N/A";
  const mentorEmail = member?.user?.profile?.email || "-";

  const handleSave = () => {
    assignMentor({
      mentorId: id,
      applicantIds: selectedApplicants,
    }, {
      onSuccess: () => {
        toast.success("Alokasi Berhasil", {
          description: selectedApplicants.length > 0 
            ? `${selectedApplicants.length} peserta telah dialokasikan ke ${mentorName}.`
            : `Semua peserta telah dihapus dari alokasi ${mentorName}.`,
        });
        router.push("/mentors");
      },
      onError: (err: any) => {
        toast.error(err.message || "Gagal melakukan alokasi");
      }
    });
  };

  const isLoading = isMemberLoading || isApplicantsLoading;

  return (
    <div className="flex flex-col gap-6 pb-20 w-full">
      {/* Header & Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/mentors")} className="rounded-xl">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alokasikan Peserta</h1>
          <p className="text-muted-foreground mt-1">
            Kelola alokasi peserta TKML untuk bimbingan pendamping.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-[600px] w-full rounded-2xl" />
        </div>
      ) : !member ? (
        <Card className="border-rose-100 bg-rose-50/50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <p className="text-rose-600 font-medium">Pendamping tidak ditemukan atau terjadi kesalahan.</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/mentors")}>
              Kembali ke Daftar Pendamping
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Mentor Info Card */}
          <Card className="overflow-hidden bg-muted/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                <User className="h-5 w-5 text-muted-foreground" />
                Informasi Pendamping
              </CardTitle>
              <CardDescription>
                Pendamping yang akan menerima alokasi bimbingan peserta baru
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nama Lengkap</span>
                  <span className="font-semibold text-foreground text-lg">{mentorName}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</span>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mt-0.5">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{mentorEmail}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Universitas</span>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mt-0.5">
                    <School className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{universityName}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
 
          {/* Allocation List Panel */}
          <Card className="border border-border shadow-xs overflow-hidden bg-card">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg">Pilih Peserta TKM Lanjutan</CardTitle>
              <CardDescription>
                Pindahkan peserta dari daftar kiri (belum ada pendamping) ke daftar kanan (terpilih untuk {mentorName})
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ApplicantTransferList
                available={availableApplicants}
                selected={selectedApplicants}
                onChange={setSelectedApplicants}
              />
            </CardContent>
 
            {/* Panel Footer */}
            <div className="p-6 border-t bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm">
                {selectedApplicants.length > 0 ? (
                  <span className="flex items-center gap-2 text-emerald-600 font-semibold">
                    <CheckCircle2 className="h-5 w-5" />
                    {selectedApplicants.length} peserta siap dialokasikan ke {mentorName}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Tidak ada peserta terpilih (kosongkan alokasi)</span>
                )}
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  onClick={() => router.push("/mentors")} 
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || isWorkspaceInactive}
                  className="w-full sm:w-auto px-6"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : isWorkspaceInactive ? (
                    "Workspace Non-Aktif (Read-Only)"
                  ) : (
                    "Simpan Alokasi"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
