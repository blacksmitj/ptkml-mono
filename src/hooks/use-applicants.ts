import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Applicant, PaginatedResponse } from "@/types";
import { applicantsKeys, membersKeys } from "@/lib/query-keys";

export interface UseApplicantsParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  status?: string;
  universityId?: string;
  mentorStatus?: string;
  communicationStatus?: string;
  presenceStatus?: string;
  willingness?: string;
  fundDisbursement?: string;
}

export const useApplicants = (
  workspaceId?: string,
  mentorId?: string,
  params?: UseApplicantsParams
) => {
  const queryParams = { workspaceId, mentorId, ...params };

  return useQuery<PaginatedResponse<Applicant>>({
    queryKey: applicantsKeys.list(queryParams),
    queryFn: async () => {
      const { data } = await apiClient.get("/applicants", {
        params: queryParams,
      });
      return data;
    },
    enabled: !!workspaceId || !!mentorId,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useApplicant = (id: string) => {
  return useQuery<Applicant>({
    queryKey: applicantsKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/applicants/${id}`);
      return data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useUpdateApplicant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Applicant> & { id: string }) => {
      const { data: responseData } = await apiClient.patch(`/applicants/${id}`, data);
      return responseData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: applicantsKeys.lists() });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: applicantsKeys.detail(data.id) });
      }
    },
  });
};

export const useUpdateApplicantProgressStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      communicationStatus?: string;
      fundDisbursement?: string;
      willingness?: string;
      reasonNotWilling?: string | null;
      presenceStatus?: string;
      status?: string;
      reasonDropped?: string | null;
    }) => {
      const { data: responseData } = await apiClient.patch(`/applicants/${id}/progress-status`, data);
      return responseData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: applicantsKeys.lists() });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: applicantsKeys.detail(data.id) });
      }
    },
  });
};

export const useAssignSingleMentor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, mentorId, universityId }: { id: string; mentorId: string | null; universityId?: string }) => {
      const { data: responseData } = await apiClient.patch(`/applicants/${id}/assign-mentor`, { mentorId, universityId });
      return responseData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: applicantsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: applicantsKeys.detail(data.id) });
      }
    },
  });
};

export const useAssignMentor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mentorId, applicantIds }: { mentorId: string; applicantIds: string[] }) => {
      const { data } = await apiClient.post("/applicants/assign-mentor", { mentorId, applicantIds });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicantsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() });
    },
  });
};

export const useDeleteApplicant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/applicants/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicantsKeys.lists() });
    },
  });
};
