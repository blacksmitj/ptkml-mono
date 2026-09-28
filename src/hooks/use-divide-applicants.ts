import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { PaginatedResponse } from "@/types";
import { divideApplicantsKeys } from "@/lib/query-keys";

export interface DivideApplicantItem {
  id: string;
  idTkm: string | null;
  universityId: string | null;
  profile: {
    id: string;
    name: string;
    nik: string | null;
    photo: string | null;
  } | null;
  university: {
    id: string;
    name: string;
  } | null;
}

export interface UseDivideApplicantsParams {
  workspaceId?: string;
  page?: number;
  limit?: number;
  search?: string;
  filterStatus?: "all" | "assigned" | "unassigned";
}

export const useDivideApplicants = (params: UseDivideApplicantsParams) => {
  const { workspaceId, page = 1, limit = 50, search, filterStatus } = params;

  return useQuery<PaginatedResponse<DivideApplicantItem>>({
    queryKey: divideApplicantsKeys.list({
      workspaceId,
      page,
      limit,
      search: search || undefined,
      filterStatus: filterStatus || undefined,
    }),
    queryFn: async () => {
      const { data } = await apiClient.get("/applicants/divide", {
        params: {
          workspaceId,
          page,
          limit,
          search: search || undefined,
          filterStatus: filterStatus || undefined,
        },
      });
      return data;
    },
    enabled: !!workspaceId,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
};
