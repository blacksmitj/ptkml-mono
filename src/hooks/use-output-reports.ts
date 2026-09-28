import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { OutputReport } from "@/types";
import { notificationBadgesKeys } from "@/lib/query-keys";

export const useOutputReports = (
  workspaceId?: string,
  applicantId?: string,
  mentorId?: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    verificationStatus?: string;
    monthReport?: string | number;
  },
  options?: any
) => {
  return useQuery<any>({
    queryKey: ["output-reports", { workspaceId, applicantId, mentorId, ...params }],
    queryFn: async () => {
      const { data } = await apiClient.get("/output-reports", {
        params: { workspaceId, applicantId, mentorId, ...params },
      });
      return data;
    },
    enabled: !!workspaceId,
    placeholderData: keepPreviousData,
    ...options,
  });
};

export const useOutputReport = (id: string, options?: any) => {
  return useQuery<OutputReport>({
    queryKey: ["output-reports", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/output-reports/${id}`);
      return data;
    },
    enabled: !!id,
    ...options,
  });
};

export const useUpdateOutputReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { data: responseData } = await apiClient.patch(`/output-reports/${id}`, data);
      return responseData;
    },
    onSuccess: (data) => {
      // Directly update cache with fresh data from server response to avoid
      // race condition between page redirect and background refetch
      if (data?.id) {
        queryClient.setQueryData(["output-reports", data.id], data);
      }
      queryClient.invalidateQueries({ queryKey: ["output-reports"] });
      queryClient.invalidateQueries({ queryKey: notificationBadgesKeys.all });
    },
  });
};

export const useVerifyOutputReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, verificationStatus, verificationNote, verifierUserId }: {
      id: string;
      verificationStatus: string;
      verificationNote?: string;
      verifierUserId?: string | null;
    }) => {
      const { data } = await apiClient.patch(`/output-reports/${id}/verify`, {
        verificationStatus,
        verificationNote,
        verifierUserId,
      });
      return data;
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.setQueryData(["output-reports", data.id], data);
      }
      queryClient.invalidateQueries({ queryKey: ["output-reports"] });
      queryClient.invalidateQueries({ queryKey: notificationBadgesKeys.all });
    },
  });
};

export const useCreateOutputReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newReport: any) => {
      const { data } = await apiClient.post("/output-reports", newReport);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["output-reports"] });
      queryClient.invalidateQueries({ queryKey: notificationBadgesKeys.all });
    },
  });
};

export const useDeleteOutputReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/output-reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["output-reports"] });
      queryClient.invalidateQueries({ queryKey: notificationBadgesKeys.all });
    },
  });
};

