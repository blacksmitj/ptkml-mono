"use client"

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/store/use-app-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useApplicants } from "@/hooks/use-applicants";
import { useOutputReport } from "@/hooks/use-output-reports";
import { OutputReportForm } from "@/components/forms/output-report-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditOutputReportPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentRole = useAppStore((state) => state.currentRole);

  const { data: report, isLoading: isReportLoading, isError } = useOutputReport(id);
  const { data: applicantsData, isLoading: isApplicantsLoading } = useApplicants(currentWorkspaceId || undefined);

  React.useEffect(() => {
    if (
      report &&
      report.verificationStatus !== "PENDING" &&
      report.verificationStatus !== "REJECTED" &&
      report.verificationStatus !== "DRAFT"
    ) {
      router.push(`/output-reports/${id}`);
    }
  }, [report, id, router]);

  if (currentRole !== "MENTOR") {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold text-destructive">Akses Ditolak</h1>
        <p className="text-muted-foreground">Hanya Pendamping yang dapat mengedit laporan output.</p>
        <Button onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  // Format applicants for the form
  const formattedApplicants = React.useMemo(() => {
    const list = applicantsData?.data || (Array.isArray(applicantsData) ? applicantsData : []);
    if (!list.length) return [];
    return list.map((a: any) => ({
      id: a.id,
      name: a.profile?.name || "N/A",
    }));
  }, [applicantsData]);

  if (isReportLoading || isApplicantsLoading) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold text-destructive">Laporan tidak ditemukan</h1>
        <p className="text-muted-foreground">ID: {id}</p>
        <Button onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Laporan Output</h1>
          <p className="text-muted-foreground">Ubah rincian capaian bisnis yang telah dikirim.</p>
        </div>
      </div>

      <OutputReportForm applicants={formattedApplicants} initialData={report} />
    </div>
  )
}
