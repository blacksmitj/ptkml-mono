import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { WorkspaceMember, WorkspaceRole, PaginatedResponse } from "@/types";
import { membersKeys, meKeys } from "@/lib/query-keys";

export interface UseMembersParams {
  workspaceId?: string;
  role?: WorkspaceRole;
  universityId?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  verificationStatus?: string;
}

export const useMembers = (params: UseMembersParams) => {
  return useQuery<PaginatedResponse<WorkspaceMember>>({
    queryKey: membersKeys.list(params as Record<string, unknown>),
    queryFn: async () => {
      const { data } = await apiClient.get("/members", { params });
      return data;
    },
    enabled: !!params.workspaceId,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useMember = (id: string) => {
  return useQuery<WorkspaceMember>({
    queryKey: membersKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/members/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useUpdateMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<WorkspaceMember> & { id: string }) => {
      const { data: responseData } = await apiClient.patch(`/members/${id}`, data);
      return responseData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: membersKeys.detail(data.id) });
      }
      queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
};

export const useVerifyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, verificationStatus }: { id: string; verificationStatus: string }) => {
      const { data: responseData } = await apiClient.patch(`/members/${id}/verify`, { verificationStatus });
      return responseData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: membersKeys.detail(data.id) });
      }
      queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
};

export const useCreateMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { workspaceId: string; userId: string; universityId: string; role: string }) => {
      const { data: responseData } = await apiClient.post("/members", data);
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
};

export const useDeleteMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
};
