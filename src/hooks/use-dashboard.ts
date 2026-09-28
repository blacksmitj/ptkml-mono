import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { dashboardKeys } from "@/lib/query-keys";

export interface DashboardStats {
  totalApplicants: number;
  totalMentors: number;
  pendingLogbooks: number;
  totalLogbooks: number;
  totalUniversities: number;
  activeApplicants: number;
  totalApplicantsAll: number;
  activeMentors: number;
  totalMentorsAll: number;
  activeUniversities: number;
  totalUniversitiesAll: number;
  employeeAddedCount: number;
  topProvinces: { name: string; count: number }[];
  ageGroups: { name: string; count: number }[];
  genderGroups?: { name: string; count: number }[];
  topEducations: { name: string; count: number }[];
  topSectors: { name: string; count: number }[];
  topUniversities: { name: string; count: number }[];
  activityChartData: { date: string; logbook: number; output: number }[];
  performanceChartData: { month: string; target: number; realisasi: number }[];
  verifiedLogbooksCount: number;
  approvedOutputsCount: number;
  totalOutputReports: number;
  totalRevenue: number;
}

export const useDashboardStats = (workspaceId?: string) => {
  return useQuery<DashboardStats>({
    queryKey: dashboardKeys.stats(workspaceId),
    queryFn: async () => {
      const { data } = await apiClient.get("/dashboard/stats", {
        params: { workspaceId },
      });
      return data;
    },
    enabled: !!workspaceId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  status: "emerald" | "blue" | "amber" | "indigo" | "destructive";
}

export const useDashboardActivities = (workspaceId?: string) => {
  return useQuery<DashboardActivity[]>({
    queryKey: dashboardKeys.activities(workspaceId),
    queryFn: async () => {
      const { data } = await apiClient.get("/dashboard/activities", {
        params: { workspaceId },
      });
      return data;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
