"use client"

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApplicants } from "@/hooks/use-applicants";
import { LogbookForm } from "@/components/forms/logbook-form";
export default function NewLogbookPage() {
  const router = useRouter()
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentRole = useAppStore((state) => state.currentRole);

  if (currentRole !== "MENTOR") {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold text-destructive">Akses Ditolak</h1>
        <p className="text-muted-foreground">Hanya Mentor yang dapat menambahkan logbook.</p>
        <Button onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }
  
  const { data: applicantsData, isLoading: isApplicantsLoading } = useApplicants(currentWorkspaceId || undefined);

  // Format for the form
  const formattedApplicants = React.useMemo(() => {
    const list = applicantsData?.data || (Array.isArray(applicantsData) ? applicantsData : []);
    if (!list.length) return [];
    return list.map((a: any) => ({
      id: a.id,
      name: a.profile?.name || "N/A",
      idTkm: a.idTkm,
    }));
  }, [applicantsData]);

  if (isApplicantsLoading) {
    return <div className="flex items-center justify-center h-48">Memuat data peserta...</div>;
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tambah Logbook</h1>
          <p className="text-muted-foreground">Catat aktivitas pendampingan harian Anda.</p>
        </div>
      </div>

      <LogbookForm applicants={formattedApplicants} />
    </div>
  )
}
