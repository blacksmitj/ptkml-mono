import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Workspace } from "@/types";

export const useWorkspaces = () => {
  return useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const { data } = await apiClient.get("/workspaces");
      return data;
    },
  });
};

export const useWorkspace = (id: string) => {
  return useQuery<Workspace>({
    queryKey: ["workspaces", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/workspaces/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newWorkspace: Partial<Workspace>) => {
      const { data } = await apiClient.post("/workspaces", newWorkspace);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};

export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Workspace> & { id: string }) => {
      const { data: response } = await apiClient.patch(`/workspaces/${id}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces", variables.id] });
    },
  });
};

export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/workspaces/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};

export interface ResetWorkspaceDataParams {
  id: string;
  confirmationText: string;
  password: string;
}

export interface ResetWorkspaceDataResponse {
  message: string;
  summary: {
    deletedApplicants: number;
    deletedLogbooks: number;
    deletedReports: number;
    deletedFiles: number;
  };
}

export const useResetWorkspaceData = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      confirmationText,
      password,
    }: ResetWorkspaceDataParams): Promise<ResetWorkspaceDataResponse> => {
      const { data } = await apiClient.post(`/workspaces/${id}/reset-data`, {
        confirmationText,
        password,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["logbooks"] });
      queryClient.invalidateQueries({ queryKey: ["output-reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-events"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
};

