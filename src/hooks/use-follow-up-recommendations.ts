import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  FollowUpRecommendation,
  Applicant,
} from "@/types";
import { followUpRecommendationsKeys, applicantsKeys, notificationBadgesKeys } from "@/lib/query-keys";

export interface FollowUpDetailResponse {
  applicant: Applicant;
  isEligible: boolean;
  recommendation: FollowUpRecommendation | null;
}

export interface EligibilityResponse {
  isEligible: boolean;
  hasExistingRecommendation: boolean;
  status: string | null;
}

export interface FollowUpStats {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
  eligible: number;
  pendingCreation: number;
}

export interface CreateFollowUpDto {
  applicantId: string;
  workspaceId: string;
  findings?: any[];
  recommendations?: any[];
  mentorNote?: string | null;
  submitNow?: boolean;
}

export interface UpdateFollowUpDto {
  id: string;
  findings?: any[];
  recommendations?: any[];
  mentorNote?: string | null;
  submitNow?: boolean;
}

export interface ReviewFollowUpDto {
  id: string;
  status: "APPROVED" | "REJECTED" | "SUBMITTED";
  reviewNote?: string | null;
}

export const useFollowUpRecommendation = (applicantId: string, options?: any) => {
  return useQuery<FollowUpDetailResponse>({
    queryKey: followUpRecommendationsKeys.detail(applicantId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/follow-up-recommendations/${applicantId}`);
      return data;
    },
    enabled: !!applicantId,
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
};

export const useCheckFollowUpEligibility = (applicantId: string, options?: any) => {
  return useQuery<EligibilityResponse>({
    queryKey: followUpRecommendationsKeys.eligibility(applicantId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/follow-up-recommendations/check-eligibility/${applicantId}`);
      return data;
    },
    enabled: !!applicantId,
    ...options,
  });
};

export const useFollowUpRecommendations = (
  workspaceId?: string,
  params?: {
    applicantId?: string;
    mentorId?: string;
    status?: string;
  },
  options?: any
) => {
  const queryParams = { workspaceId, ...params };

  return useQuery<FollowUpRecommendation[]>({
    queryKey: followUpRecommendationsKeys.list(queryParams),
    queryFn: async () => {
      const { data } = await apiClient.get("/follow-up-recommendations", {
        params: queryParams,
      });
      return data;
    },
    enabled: !!workspaceId,
    placeholderData: keepPreviousData,
    ...options,
  });
};

export const useFollowUpRecommendationStats = (
  workspaceId?: string,
  params?: {
    mentorId?: string;
    universityId?: string;
  },
  options?: any
) => {
  const queryParams = { workspaceId, ...params };

  return useQuery<FollowUpStats>({
    queryKey: followUpRecommendationsKeys.stats(queryParams),
    queryFn: async () => {
      const { data } = await apiClient.get("/follow-up-recommendations/stats", {
        params: queryParams,
      });
      return data;
    },
    enabled: !!workspaceId,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
};


export const useCreateFollowUpRecommendation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateFollowUpDto) => {
      const { data } = await apiClient.post("/follow-up-recommendations", dto);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: followUpRecommendationsKeys.all });
      queryClient.invalidateQueries({ queryKey: applicantsKeys.all });
      if (variables.applicantId) {
        queryClient.invalidateQueries({
          queryKey: followUpRecommendationsKeys.detail(variables.applicantId),
        });
      }
    },
  });
};

export const useUpdateFollowUpRecommendation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dto }: UpdateFollowUpDto) => {
      const { data } = await apiClient.patch(`/follow-up-recommendations/${id}`, dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: followUpRecommendationsKeys.all });
      queryClient.invalidateQueries({ queryKey: applicantsKeys.all });
      if (data?.applicantId) {
        queryClient.invalidateQueries({
          queryKey: followUpRecommendationsKeys.detail(data.applicantId),
        });
      }
    },
  });
};

export const useSubmitFollowUpRecommendation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch(`/follow-up-recommendations/${id}/submit`);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: followUpRecommendationsKeys.all });
      queryClient.invalidateQueries({ queryKey: applicantsKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationBadgesKeys.all });
      if (data?.applicantId) {
        queryClient.invalidateQueries({
          queryKey: followUpRecommendationsKeys.detail(data.applicantId),
        });
      }
    },
  });
};

export const useReviewFollowUpRecommendation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dto }: ReviewFollowUpDto) => {
      const { data } = await apiClient.patch(`/follow-up-recommendations/${id}/review`, dto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: followUpRecommendationsKeys.all });
      queryClient.invalidateQueries({ queryKey: applicantsKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationBadgesKeys.all });
      if (data?.applicantId) {
        queryClient.invalidateQueries({
          queryKey: followUpRecommendationsKeys.detail(data.applicantId),
        });
      }
    },
  });
};
