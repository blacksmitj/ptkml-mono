import * as React from "react";
import {
  UsersIcon,
  GraduationCapIcon,
  Building2Icon,
  BriefcaseIcon,
  BookOpenIcon,
  FileCheckIcon,
  ClipboardCheckIcon,
  TargetIcon,
  CalendarDaysIcon,
} from "lucide-react";
import { V2StatCard } from "../widgets/v2-stat-card";
import { V2ProgressGauge } from "../widgets/v2-progress-gauge";
import { V2AreaChart } from "../widgets/v2-area-chart";
import { V2KpiSection } from "../widgets/v2-kpi-section";
import { V2AgendaEvents } from "../widgets/v2-agenda-events";
import { DashboardV2Data } from "@/hooks/use-dashboard-v2-data";

export interface DashboardOverviewTabProps {
  data: DashboardV2Data;
}

export function DashboardOverviewTab({ data }: DashboardOverviewTabProps) {
  const { currentRole, stats, applicants, logbooks, outputReports, followUpStats } = data;

  const isSuperAdmin = currentRole === "SUPER_ADMIN";
  const isSupervisor = currentRole === "WORKSPACE_SUPERVISOR";
  const isMentor = currentRole === "MENTOR";
  const isUniv =
    currentRole === "UNIVERSITY_ADMIN" ||
    currentRole === "UNIVERSITY_SUPERVISOR";

  // Calculations for Gauges
  let logbookTotal = 0;
  let logbookVerified = 0;
  let logbookPct = 0;

  let outputTotal = 0;
  let outputVerified = 0;
  let outputPct = 0;

  if (isSuperAdmin || isSupervisor) {
    logbookTotal = stats?.totalLogbooks || 0;
    logbookVerified = stats?.verifiedLogbooksCount || 0;
    logbookPct = logbookTotal > 0 ? (logbookVerified / logbookTotal) * 100 : 0;

    outputTotal = stats?.totalOutputReports || 0;
    outputVerified = stats?.approvedOutputsCount || 0;
    outputPct = outputTotal > 0 ? (outputVerified / outputTotal) * 100 : 0;
  } else {
    // Mentor & Univ: count from local array
    logbookTotal = logbooks.length;
    logbookVerified = logbooks.filter(
      (l: any) =>
        l.verificationStatus === "VERIFIED" ||
        l.verificationStatus === "APPROVED" ||
        l.status === "VERIFIED"
    ).length;
    logbookPct = logbookTotal > 0 ? (logbookVerified / logbookTotal) * 100 : 0;

    outputTotal = outputReports.length;
    outputVerified = outputReports.filter(
      (o: any) =>
        o.verificationStatus === "APPROVED" ||
        o.verificationStatus === "VERIFIED" ||
        o.status === "APPROVED"
    ).length;
    outputPct = outputTotal > 0 ? (outputVerified / outputTotal) * 100 : 0;
  }

  // Compliance Score calculation & dynamic status evaluation
  const hasComplianceData = logbookTotal > 0 || outputTotal > 0;
  const compliancePct = hasComplianceData
    ? (logbookPct + outputPct) / (logbookTotal > 0 && outputTotal > 0 ? 2 : 1)
    : 0;

  const complianceStatus = React.useMemo(() => {
    if (!hasComplianceData) {
      return {
        status: "Belum Ada Data",
        evaluation: "Menunggu Laporan",
        colorClass: "text-muted-foreground",
      };
    }
    if (compliancePct >= 80) {
      return {
        status: "Optimal",
        evaluation: "Sangat Baik",
        colorClass: "text-emerald-600 dark:text-emerald-400",
      };
    }
    if (compliancePct >= 50) {
      return {
        status: "Cukup",
        evaluation: "Moderat",
        colorClass: "text-amber-600 dark:text-amber-400",
      };
    }
    return {
      status: "Perlu Perhatian",
      evaluation: "Kurang",
      colorClass: "text-rose-600 dark:text-rose-400",
    };
  }, [hasComplianceData, compliancePct]);

  // Follow-up calculations
  const followUpEligible = followUpStats?.eligible || 0;
  const followUpApproved = followUpStats?.approved || 0;
  const followUpPct =
    followUpEligible > 0 ? (followUpApproved / followUpEligible) * 100 : 0;

  // Chart data from BE stats or fallback
  const activityData = React.useMemo(() => {
    if (stats?.activityChartData && stats.activityChartData.length > 0) {
      return stats.activityChartData;
    }
    return [];
  }, [stats]);

  // Employee absorption calculation (Penyerapan Tenaga Kerja Baru Bulan 1-3)
  const employeeCount = isSuperAdmin || isSupervisor
    ? (stats?.employeeAddedCount ?? 0)
    : outputReports
        .filter(
          (o: any) =>
            (o.verificationStatus === "APPROVED" || o.verificationStatus === "VERIFIED" || o.status === "APPROVED") &&
            [1, 2, 3].includes(Number(o.monthReport))
        )
        .reduce((sum: number, o: any) => sum + (Array.isArray(o.employees) ? o.employees.length : 0), 0);

  const employeeTarget = isSuperAdmin || isSupervisor
    ? (stats?.totalApplicants || stats?.activeApplicants || 0)
    : applicants.length;

  const employeePct = employeeTarget > 0 ? (employeeCount / employeeTarget) * 100 : 0;

  const employeeTrendDesc = React.useMemo(() => {
    if (employeeTarget === 0) return "Belum ada peserta aktif";
    if (employeePct >= 100) return "Target Tercapai";
    if (employeePct >= 50) return "On Track";
    return "Perlu Peningkatan";
  }, [employeeTarget, employeePct]);

  return (
    <div className="space-y-6">
      {/* 1. Top KPI Summary Cards */}
      {isSuperAdmin || isSupervisor ? (
        <V2KpiSection cols={4}>
          <V2StatCard
            label="Peserta Aktif"
            value={stats?.activeApplicants ?? 0}
            subValue={`/ ${stats?.totalApplicantsAll ?? 0}`}
            icon={<UsersIcon className="size-5" />}
            accentColor="var(--brand-seq-1)"
            trend={{
              label: "Rasio Aktivitas",
              value:
                stats?.totalApplicantsAll
                  ? ((stats.activeApplicants || 0) / stats.totalApplicantsAll) * 100
                  : 0,
            }}
          />
          <V2StatCard
            label="Pendamping Aktif"
            value={stats?.activeMentors ?? 0}
            subValue={`/ ${stats?.totalMentorsAll ?? 0}`}
            icon={<GraduationCapIcon className="size-5" />}
            accentColor="var(--brand-seq-2)"
            trend={{
              label: "Rasio Keterlibatan",
              value:
                stats?.totalMentorsAll
                  ? ((stats.activeMentors || 0) / stats.totalMentorsAll) * 100
                  : 0,
            }}
          />
          <V2StatCard
            label="Universitas Aktif"
            value={stats?.activeUniversities ?? 0}
            subValue={`/ ${stats?.totalUniversitiesAll ?? 0}`}
            icon={<Building2Icon className="size-5" />}
            accentColor="var(--brand-seq-3)"
            trend={{
              label: "Rasio Kemitraan",
              value:
                stats?.totalUniversitiesAll
                  ? ((stats.activeUniversities || 0) / stats.totalUniversitiesAll) * 100
                  : 0,
            }}
          />
          <V2StatCard
            label="Tenaga Kerja Baru"
            value={employeeCount.toLocaleString("id-ID")}
            subValue="pekerja"
            icon={<BriefcaseIcon className="size-5" />}
            accentColor="var(--brand-seq-4)"
            trend={{
              label: "Penyerapan Target",
              value: employeePct,
              description: employeeTrendDesc,
            }}
          />
        </V2KpiSection>
      ) : (
        <V2KpiSection cols={4}>
          <V2StatCard
            label="Total Dampingan"
            value={applicants.length}
            subValue="peserta"
            icon={<UsersIcon className="size-5" />}
            accentColor="var(--brand-seq-1)"
            trend={{
              label: "Kelengkapan Profil",
              value: applicants.length > 0 ? 100 : 0,
            }}
          />
          <V2StatCard
            label="Total Logbook"
            value={logbookTotal}
            subValue={`${logbookVerified} valid`}
            icon={<BookOpenIcon className="size-5" />}
            accentColor="var(--brand-seq-2)"
            trend={{
              label: "Tingkat Verifikasi",
              value: logbookPct,
            }}
          />
          <V2StatCard
            label="Laporan Output"
            value={outputTotal}
            subValue={`${outputVerified} valid`}
            icon={<FileCheckIcon className="size-5" />}
            accentColor="var(--brand-seq-3)"
            trend={{
              label: "Tingkat Persetujuan",
              value: outputPct,
            }}
          />
          {isUniv ? (
            <V2StatCard
              label="Pendamping Kampus"
              value={data.members.length}
              subValue="orang"
              icon={<GraduationCapIcon className="size-5" />}
              accentColor="var(--brand-seq-4)"
              trend={{
                label: "Partisipasi",
                value: 100,
              }}
            />
          ) : (
            <V2StatCard
              label="Tenaga Kerja Baru"
              value={employeeCount.toLocaleString("id-ID")}
              subValue="pekerja"
              icon={<BriefcaseIcon className="size-5" />}
              accentColor="var(--brand-seq-4)"
              trend={{
                label: "Penyerapan Target",
                value: employeePct,
                description: employeeTrendDesc,
              }}
            />
          )}
        </V2KpiSection>
      )}

      {/* 2. Middle Section: Performance Gauges & Calendar/Event */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Gauges Grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <V2ProgressGauge
            title="Verifikasi Logbook"
            description="Persentase logbook harian terverifikasi"
            percentage={logbookPct}
            accentColor="var(--brand-seq-1)"
            badgeLabel="Verified"
            icon={<BookOpenIcon className="size-4" />}
            stats={[
              { label: "Total Masuk", value: logbookTotal },
              {
                label: "Terverifikasi",
                value: logbookVerified,
                colorClass: "text-emerald-600 dark:text-emerald-400",
              },
            ]}
          />

          <V2ProgressGauge
            title="Laporan Output"
            description="Realisasi target laporan bulanan TKM"
            percentage={outputPct}
            accentColor="var(--brand-seq-2)"
            badgeLabel="Approved"
            icon={<FileCheckIcon className="size-4" />}
            stats={[
              { label: "Total Laporan", value: outputTotal },
              {
                label: "Disetujui",
                value: outputVerified,
                colorClass: "text-emerald-600 dark:text-emerald-400",
              },
            ]}
          />

          <V2ProgressGauge
            title="Rekomendasi Lanjutan"
            description="Rasio peserta yang diajukan tindak lanjut"
            percentage={followUpPct}
            accentColor="var(--brand-seq-3)"
            badgeLabel="Eligible"
            icon={<ClipboardCheckIcon className="size-4" />}
            stats={[
              { label: "Eligible", value: followUpEligible },
              {
                label: "Disetujui",
                value: followUpApproved,
                colorClass: "text-indigo-600 dark:text-indigo-400",
              },
            ]}
          />

          <V2ProgressGauge
            title="Kepatuhan Program"
            description="Tingkat kedisiplinan pelaporan dampingan"
            percentage={compliancePct}
            accentColor="var(--brand-seq-4)"
            badgeLabel="Score"
            icon={<TargetIcon className="size-4" />}
            stats={[
              { label: "Status", value: complianceStatus.status },
              {
                label: "Evaluasi",
                value: complianceStatus.evaluation,
                colorClass: complianceStatus.colorClass,
              },
            ]}
          />
        </div>

        {/* Right: Compact Agenda & Reminders */}
        <div className="lg:col-span-5 h-full">
          <V2AgendaEvents maxDisplay={4} />
        </div>
      </div>

      {/* 3. Bottom Section: Trend Activity Chart (when available) */}
      {activityData.length > 0 && (
        <V2AreaChart
          title="Tren Aktivitas Harian"
          description="Grafik jumlah unggahan logbook harian dan capaian output bulanan"
          badgeLabel="30 Hari Terakhir"
          data={activityData}
          xKey="date"
          series={[
            {
              key: "logbook",
              label: "Logbook Masuk",
              color: "var(--brand-seq-1)",
            },
            {
              key: "output",
              label: "Laporan Output",
              color: "var(--brand-seq-2)",
            },
          ]}
          xFormatter={(val) => {
            try {
              return new Date(val).toLocaleDateString("id-ID", {
                month: "short",
                day: "numeric",
              });
            } catch {
              return String(val);
            }
          }}
        />
      )}
    </div>
  );
}
