"use client";

import { useParams, useRouter } from "next/navigation";
import { useApplicant } from "@/hooks/use-applicants";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { ChevronLeft, BarChart3, History, User, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ApplicantStatus } from "@/types";
import { AnalysisTab } from "@/components/applicants/analysis-tab";
import { HistoryTab } from "@/components/applicants/history-tab";
import { DetailsTab } from "@/components/applicants/details-tab";
import {
  VisitCountBadge,
  getOfflineIndividualVisitCount,
} from "@/components/applicants/visit-count-badge";

export default function ApplicantDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const { data: applicant, isLoading, isError } = useApplicant(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-100 w-full" />
      </div>
    );
  }

  if (isError || !applicant) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold">Peserta tidak ditemukan</h1>
        <Button onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  const profile = applicant.profile;
  const mentorProfile = (applicant.mentor as any)?.user?.profile;

  const applicantReports = applicant.outputReports || [];
  const applicantEmployees = applicantReports.flatMap(
    (r: any) => r.employees || [],
  );

  const applicantLogbooks = (applicant.logbooks || [])
    .map((la: any) => la.logbook)
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Detail Peserta</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center bg-card p-6 rounded-xl border shadow-sm">
        <UserAvatar
          name={profile?.name || "N/A"}
          src={profile?.photo}
          className="h-20 w-20 text-2xl"
          previewable
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-3xl font-bold">{profile?.name}</h2>
            <Badge
              variant={
                applicant.status === ApplicantStatus.ACTIVE
                  ? "default"
                  : "secondary"
              }
            >
              {applicant.status}
            </Badge>
            <VisitCountBadge
              count={getOfflineIndividualVisitCount(applicant)}
              suffix="Kunjungan"
              showDot
            />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground font-medium flex items-center gap-2">
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border">
                {applicant.idTkm}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground italic">
              <span>
                Universitas: {applicant.university?.name || "Belum Dibagikan"}
              </span>
              <span>•</span>
              <span>
                Pendamping: {mentorProfile?.name || "Belum ada pendamping"}
              </span>
            </div>
          </div>
        </div>

        {/* Tombol Akses Cepat RTL jika B1-B3 sudah ada */}
        <div>
          <Button
            variant="outline"
            className="gap-2 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary shadow-xs"
            onClick={() =>
              router.push(`/applicants/${id}/follow-up-recommendation`)
            }
          >
            <Sparkles className="h-4 w-4" />
            R. Tindak Lanjut
          </Button>
        </div>
      </div>

      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="analysis" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Analisis
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" /> Riwayat
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-2">
            <User className="h-4 w-4" /> Info Detail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="mt-6">
          <AnalysisTab applicant={applicant} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <HistoryTab
            logbooks={applicantLogbooks}
            outputReports={applicantReports}
          />
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          {profile && (
            <DetailsTab
              applicant={applicant}
              profile={profile}
              mentorProfile={mentorProfile || null}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
