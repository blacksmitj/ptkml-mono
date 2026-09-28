"use client";

import * as React from "react";
import { OutputReportForm } from "@/components/forms/output-report-form";
import { useAppStore } from "@/store/use-app-store";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useApplicants } from "@/hooks/use-applicants";

export default function NewOutputReportPage() {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentRole = useAppStore((state) => state.currentRole);

  if (currentRole !== "MENTOR") {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold text-destructive">Akses Ditolak</h1>
        <p className="text-muted-foreground">Hanya Pendamping yang dapat menambahkan laporan output.</p>
      </div>
    );
  }
  
  const { data: applicantsData, isLoading } = useApplicants(currentWorkspaceId || undefined);

  const formattedApplicants = React.useMemo(() => {
    const list = applicantsData?.data || (Array.isArray(applicantsData) ? applicantsData : []);
    if (!list.length) return [];
    return list.map((a: any) => ({
      id: a.id,
      name: a.profile?.name || "N/A",
    }));
  }, [applicantsData]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-48">Memuat data peserta...</div>;
  }

  if (currentWorkspaceId && formattedApplicants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 border rounded-xl bg-muted/50">
        <p className="text-muted-foreground">Tidak ada peserta ditemukan di workspace ini.</p>
        <Button asChild variant="outline">
          <Link href="/applicants">Kelola Peserta</Link>
        </Button>
      </div>
    );
  }

  if (!currentWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 border rounded-xl bg-muted/50">
        <p className="text-muted-foreground">Silakan pilih workspace terlebih dahulu.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/output-reports">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Isi Capaian Output</h1>
          <p className="text-muted-foreground mt-2">
            Laporkan perkembangan bisnis peserta untuk periode bulan berjalan.
          </p>
        </div>
      </div>

      <OutputReportForm applicants={formattedApplicants} />
    </div>
  );
}
