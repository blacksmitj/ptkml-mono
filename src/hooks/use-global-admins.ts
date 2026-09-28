import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { User, GlobalRole } from "@/types";
import { toast } from "sonner";

export const useGlobalAdmins = () => {
  return useQuery<User[]>({
    queryKey: ["global-admins"],
    queryFn: async () => {
      const { data } = await apiClient.get("/global-admins");
      return data;
    },
  });
};

export const useSearchUsers = (query: string) => {
  return useQuery<User[]>({
    queryKey: ["global-admins", "search", query],
    queryFn: async () => {
      if (!query || query.trim() === "") return [];
      const { data } = await apiClient.get(`/global-admins/search-users?query=${encodeURIComponent(query)}`);
      return data;
    },
    enabled: query.trim().length > 0,
  });
};

export const useUpdateGlobalRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, globalRole }: { userId: string; globalRole: GlobalRole }) => {
      const { data } = await apiClient.patch(`/global-admins/${userId}/role`, { globalRole });
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Berhasil memperbarui peran untuk ${data.profile?.name || data.username}`);
      queryClient.invalidateQueries({ queryKey: ["global-admins"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Gagal memperbarui peran user.";
      toast.error(message);
    },
  });
};
