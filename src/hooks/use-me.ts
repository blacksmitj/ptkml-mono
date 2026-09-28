import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { User } from "@/types";

export const useMe = () => {
  return useQuery<User>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get("/me");
      return data;
    },
  });
};
