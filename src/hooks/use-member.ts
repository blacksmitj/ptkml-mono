import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { WorkspaceMember } from "@/types";

export const useMember = (id: string) => {
  return useQuery<WorkspaceMember>({
    queryKey: ["members", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/members/${id}`);
      return data;
    },
    enabled: !!id,
  });
};
