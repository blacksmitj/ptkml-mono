import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface MonthDashboardEvent {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  targetDate: string;
  daysRemaining: number;
  status: "PENDING" | "COMPLETED";
  actionUrl?: string;
  actionLabel?: string;
  targetRole: string;
  recurrenceType: string;
  isDismissed?: boolean;
}

export const useDashboardEventsMonth = (
  workspaceId?: string,
  year?: number,
  month?: number // 1-indexed
) => {
  const currentYear = year || new Date().getFullYear();
  const currentMonth = month || new Date().getMonth() + 1;

  return useQuery<{ events: MonthDashboardEvent[] }>({
    queryKey: ["dashboard-events-month", workspaceId, currentYear, currentMonth],
    queryFn: async () => {
      if (!workspaceId) return { events: [] };
      const { data } = await apiClient.get(
        `/workspaces/${workspaceId}/dashboard-events/month`,
        {
          params: { year: currentYear, month: currentMonth },
        }
      );
      return data;
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
