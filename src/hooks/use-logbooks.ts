import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Logbook } from "@/types";
import { notificationBadgesKeys } from "@/lib/query-keys";

export const useLogbooks = (
  workspaceId?: string,
  createdById?: string,
  applicantId?: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    verificationStatus?: string;
  },
  options?: any
) => {
  return useQuery<any>({
    queryKey: ["logbooks", { workspaceId, createdById, applicantId, ...params }],
    queryFn: async () => {
      const { data } = await apiClient.get("/logbooks", {
        params: { workspaceId, createdById, applicantId, ...params },
      });
      return data;
    },
    enabled: !!workspaceId,
    placeholderData: keepPreviousData,
    ...options,
  });
};

export const useLogbook = (id: string, options?: any) => {
  return useQuery<Logbook>({
    queryKey: ["logbooks", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/logbooks/${id}`);
      return data;
    },
    enabled: !!id,
    ...options,
  });
};

export const useUpdateLogbook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { data: responseData } = await apiClient.patch(`/logbooks/${id}`, data);
      return responseData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["logbooks"] });
      queryClient.invalidateQueries({ queryKey: ["logbooks", data.id] });
      queryClient.invalidateQueries({ queryKey: notificationBadgesKeys.all });
    },
  });
};

export const useVerifyLogbook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, verificationStatus, verificationNote, verifierUserId }: {
      id: string;
      verificationStatus: string;
      verificationNote?: string;
      verifierUserId?: string | null;
    }) => {
      const { data } = await apiClient.patch(`/logbooks/${id}/verify`, {
        verificationStatus,
        verificationNote,
        verifierUserId,
      });
      return data;
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.setQueryData(["logbooks", data.id], data);
      }
      queryClient.invalidateQueries({ queryKey: ["logbooks"] });
      queryClient.invalidateQueries({ queryKey: notificationBadgesKeys.all });
    },
  });
};

export const useCreateLogbook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newLogbook: any) => {
      const { data } = await apiClient.post("/logbooks", newLogbook);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logbooks"] });
      queryClient.invalidateQueries({ queryKey: notificationBadgesKeys.all });
    },
  });
};

export const useDeleteLogbook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/logbooks/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logbooks"] });
      queryClient.invalidateQueries({ queryKey: notificationBadgesKeys.all });
    },
  });
};
