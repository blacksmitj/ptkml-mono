import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Employee } from "@/types";

export const useEmployee = (id: string) => {
  return useQuery<Employee>({
    queryKey: ["employees", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/employees/${id}`);
      return data;
    },
    enabled: !!id,
  });
};
