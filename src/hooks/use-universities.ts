import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { University } from "@/types";
import { toast } from "sonner";
import { universitiesKeys } from "@/lib/query-keys";

export interface UseUniversitiesParams {
  workspaceId?: string;
  excludeWorkspaceId?: string;
}

export const useUniversities = (params?: UseUniversitiesParams) => {
  return useQuery<University[]>({
    queryKey: universitiesKeys.list(params as Record<string, unknown>),
    queryFn: async () => {
      const { data } = await apiClient.get("/universities", { params });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 15 * 60 * 1000, // 15 minutes static master data
  });
};

export const useUniversity = (id: string, workspaceId?: string) => {
  return useQuery<University>({
    queryKey: universitiesKeys.detail(id, workspaceId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/universities/${id}`, {
        params: workspaceId ? { workspaceId } : undefined,
      });
      return data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateUniversity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; logo?: string | null; workspaceId?: string | null }) => {
      const response = await apiClient.post("/universities", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: universitiesKeys.lists() });
      toast.success("Universitas berhasil ditambahkan");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Gagal menambahkan universitas");
    },
  });
};

export const useConnectUniversities = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { workspaceId: string; universityIds: string[] }) => {
      const response = await apiClient.post("/universities/connect", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: universitiesKeys.lists() });
      toast.success("Universitas berhasil dihubungkan ke workspace ini");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Gagal menghubungkan universitas");
    },
  });
};

export const useUpdateUniversity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; logo?: string | null; isActive?: boolean }) => {
      const response = await apiClient.patch(`/universities/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: universitiesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: universitiesKeys.detail(id) });
      toast.success("Universitas berhasil diperbarui");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Gagal memperbarui universitas");
    },
  });
};

export const useDeleteUniversity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/universities/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: universitiesKeys.lists() });
      toast.success("Universitas berhasil dihapus");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Gagal menghapus universitas");
    },
  });
};

export const useDisconnectUniversity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { workspaceId: string; universityId: string }) => {
      const response = await apiClient.post("/universities/disconnect", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: universitiesKeys.lists() });
      toast.success("Universitas berhasil dilepas dari workspace ini");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Gagal melepas universitas dari workspace");
    },
  });
};

