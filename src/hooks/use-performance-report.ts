import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface PerformanceReportParams {
  workspaceId?: string;
  monthReport?: number;
  logbookStartDate?: string;
  logbookEndDate?: string;
}

export interface KpiItem {
  id: string;
  idTkm: string;
  name: string;
}

export interface PerformanceReportData {
  mentor: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    wilayah: string;
    universityName: string;
  };
  universityAdmin?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    role: string;
  } | null;
  summary: {
    totalApplicants: number;
    visitedApplicants: number;
    totalJpl: number;
    materials: string[];
    visitCount: number;
    activitySummary: string;
    obstacles: string;
    activitySummaries?: string[];
    obstaclesList?: string[];
  };
  kpiData: {
    kpi1a: { naik: KpiItem[]; turun: KpiItem[]; tetap: KpiItem[] };
    kpi1b: { naik: KpiItem[]; turun: KpiItem[]; tetap: KpiItem[] };
    kpi1c: { naik: KpiItem[]; turun: KpiItem[]; tetap: KpiItem[] };
    kpi1d: { naik: KpiItem[]; turun: KpiItem[]; tetap: KpiItem[] };
    kpi2a: { ya: KpiItem[]; tidak: KpiItem[] };
    kpi2b: { ya: KpiItem[]; tidak: KpiItem[] };
    kpi3: { tambah: KpiItem[]; tidak: KpiItem[] };
  };
  problematicApplicants: {
    notDisbursed: KpiItem[];
    notWilling: KpiItem[];
    notFound: KpiItem[];
    noResponse: KpiItem[];
  };
  logbookPublicUrl: string;
  outputPublicUrl: string;
  logbookDateRange: {
    firstDate: string | null;
    lastDate: string | null;
  };
  documentationSummary: {
    totalFiles: number;
    files: Array<{
      id: string;
      url: string;
      fileName: string;
      logbookDate: string;
      activitySummary: string;
    }>;
  };
}

export const usePerformanceReport = (
  memberId?: string,
  params?: PerformanceReportParams,
  options?: any
) => {
  return useQuery<PerformanceReportData>({
    queryKey: ["performance-report", memberId, params],
    queryFn: async () => {
      const { data } = await apiClient.get(`/members/${memberId}/performance-report`, {
        params,
      });
      return data;
    },
    enabled: !!memberId && !!params?.workspaceId,
    ...options,
  });
};
