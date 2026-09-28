import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export interface FileMaintenanceStats {
  totalOrphanedCount: number;
  totalOrphanedSize: number;
  safeCount: number;
  safeSize: number;
  deferredCount: number;
  deferredSize: number;
  cutoffDate: string;
}

export interface OrphanedFile {
  key: string;
  size: number;
  lastModified?: string;
}

export interface DryRunResponse {
  statistics: FileMaintenanceStats;
  safeToDelete: OrphanedFile[];
  deferred: OrphanedFile[];
}

export const useFileMaintenanceDryRun = (days: number, options = {}) => {
  return useQuery<DryRunResponse>({
    queryKey: ["file-maintenance-dry-run", days],
    queryFn: async () => {
      const { data } = await apiClient.get("/file-maintenance/dry-run", {
        params: { days },
      });
      return data;
    },
    ...options,
  });
};

export const usePruneFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (days: number) => {
      const { data } = await apiClient.post("/file-maintenance/prune", { days });
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["file-maintenance-dry-run"] });
      toast.success(data.message || "File yatim piatu berhasil dibersihkan");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || error.message || "Gagal membersihkan file yatim piatu"
      );
    },
  });
};
