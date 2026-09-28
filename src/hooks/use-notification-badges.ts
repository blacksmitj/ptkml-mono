import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { notificationBadgesKeys } from "@/lib/query-keys";
import { useAppStore } from "@/store/use-app-store";

export interface NotificationCategory {
  logbook: number;
  outputReport: number;
  rtl: number;
  total: number;
}

export interface ApplicantIssuesCategory {
  noResponse: number;
  notFound: number;
  notWilling: number;
  notDisbursed: number;
  total: number;
}

export interface NotificationBadgeCounts {
  roleType: "MENTOR" | "ADMIN";
  scope: "ALL" | "UNIVERSITY" | "PERSONAL";
  pending: NotificationCategory;
  needsAction: NotificationCategory;
  applicantIssues?: ApplicantIssuesCategory;
  counts: NotificationCategory;
}

export function useNotificationBadges() {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);

  return useQuery<NotificationBadgeCounts>({
    queryKey: notificationBadgesKeys.badgeCounts(currentWorkspaceId),
    queryFn: async () => {
      const defaultCategory: NotificationCategory = {
        logbook: 0,
        outputReport: 0,
        rtl: 0,
        total: 0,
      };

      const defaultIssues: ApplicantIssuesCategory = {
        noResponse: 0,
        notFound: 0,
        notWilling: 0,
        notDisbursed: 0,
        total: 0,
      };

      if (!currentWorkspaceId) {
        return {
          roleType: "ADMIN",
          scope: "ALL",
          pending: defaultCategory,
          needsAction: defaultCategory,
          applicantIssues: defaultIssues,
          counts: defaultCategory,
        };
      }
      const response = await apiClient.get<NotificationBadgeCounts>(
        `/notifications/badge-counts?workspaceId=${currentWorkspaceId}`
      );
      return response.data;
    },
    enabled: !!currentWorkspaceId,
    refetchInterval: 20000, // Poll every 20 seconds — cukup cepat tanpa membebani server
    refetchOnWindowFocus: true,
    staleTime: 0, // Selalu anggap stale agar refetch terjadi saat fokus window kembali
  });
}
