import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheckIcon,
  FileTextIcon,
  FilePieChartIcon,
  UsersIcon,
  ArrowUpRightIcon,
  ScanEyeIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { V2ActivityFeed } from "../widgets/v2-activity-feed";
import { DashboardV2Data } from "@/hooks/use-dashboard-v2-data";

export interface DashboardDataControlTabProps {
  data: DashboardV2Data;
}

export function DashboardDataControlTab({ data }: DashboardDataControlTabProps) {
  const { currentRole, stats, activities, isLoadingActivities, applicants, logbooks, outputReports } = data;

  const isSuperAdmin = currentRole === "SUPER_ADMIN";
  const isSupervisor = currentRole === "WORKSPACE_SUPERVISOR";
  const isMentor = currentRole === "MENTOR";
  const isUniv =
    currentRole === "UNIVERSITY_ADMIN" ||
    currentRole === "UNIVERSITY_SUPERVISOR";

  // If SUPER_ADMIN or WORKSPACE_SUPERVISOR
  if (isSuperAdmin || isSupervisor) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Pending Actions & Audit Control */}
        <Card className="border-border/60 shadow-2xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <ShieldCheckIcon className="size-5 text-primary" />
              <span>Panel Audit & Kontrol</span>
            </CardTitle>
            <CardDescription>
              Tugas verifikasi, kepatuhan, dan integrasi yang membutuhkan perhatian
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {/* Task 1: Logbook verification */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
              <div className="flex gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0 text-primary h-fit">
                  <FileTextIcon className="size-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Verifikasi Logbook Dampingan
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Terdapat{" "}
                    <span className="font-semibold text-foreground font-mono">
                      {stats?.pendingLogbooks ?? 0}
                    </span>{" "}
                    logbook memerlukan tinjauan & persetujuan.
                  </p>
                </div>
              </div>
              <Button asChild size="sm" className="gap-1 font-semibold shrink-0">
                <Link href="/logbooks?status=PENDING">
                  Tinjau <ArrowUpRightIcon className="size-3.5" />
                </Link>
              </Button>
            </div>

            {/* Task 2: Output Report Review */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
              <div className="flex gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0 text-emerald-600 h-fit">
                  <FilePieChartIcon className="size-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Capaian Output Bulanan
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Monitoring target laporan dan evaluasi berkala capaian.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="gap-1 font-semibold shrink-0">
                <Link href="/output-reports">
                  Buka Laporan <ArrowUpRightIcon className="size-3.5" />
                </Link>
              </Button>
            </div>

            {/* Task 3: OCR Monitoring */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
              <div className="flex gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0 text-amber-600 h-fit">
                  <ScanEyeIcon className="size-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Integritas & OCR Dokumen
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pemeriksaan keaslian dan kelengkapan dokumen KTP/Proposal.
                  </p>
                </div>
              </div>
              <Button asChild variant="secondary" size="sm" className="gap-1 font-semibold shrink-0">
                <Link href="/applicants">
                  Kelola Peserta <ArrowUpRightIcon className="size-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Real-time System Activity Feed */}
        <V2ActivityFeed
          title="Aktivitas & Log Sistem"
          items={activities}
          isLoading={isLoadingActivities}
        />
      </div>
    );
  }

  // If MENTOR or UNIVERSITY
  return (
    <div className="space-y-6">
      {/* Quick overview of lists */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/60 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Peserta Dampingan</span>
              <UsersIcon className="size-4 text-primary" />
            </CardTitle>
            <CardDescription className="text-xs">
              Total {applicants.length} peserta aktif terdaftar
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold">
              <Link href="/applicants">Lihat Data Peserta</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Logbook Binaan</span>
              <FileTextIcon className="size-4 text-blue-500" />
            </CardTitle>
            <CardDescription className="text-xs">
              Total {logbooks.length} logbook telah dikirim
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold">
              <Link href="/logbooks">Buka Daftar Logbook</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Laporan Output</span>
              <FilePieChartIcon className="size-4 text-emerald-500" />
            </CardTitle>
            <CardDescription className="text-xs">
              Total {outputReports.length} laporan output berkala
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold">
              <Link href="/output-reports">Buka Laporan Output</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Direct link notice */}
      <Card className="border-dashed border-border/70 bg-muted/10">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-bold text-foreground">
              Manajemen Data Lengkap & Ekspor
            </h4>
            <p className="text-xs text-muted-foreground">
              Untuk melakukan filter mendalam, pencarian NIK, verifikasi berkas, atau unduh laporan excel, silakan akses modul data terkait.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button asChild size="sm" className="font-semibold">
              <Link href="/applicants">Kelola Peserta</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="font-semibold">
              <Link href="/logbooks">Kelola Logbook</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
