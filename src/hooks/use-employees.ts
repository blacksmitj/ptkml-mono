import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Employee } from "@/types";

export const useEmployees = (params?: { outputId?: string; mentorId?: string; workspaceId?: string }) => {
  return useQuery<Employee[]>({
    queryKey: ["employees", params],
    queryFn: async () => {
      const { data } = await apiClient.get("/employees", {
        params,
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
};

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
