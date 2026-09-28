import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { OcrResult } from "@/types";
import { toast } from "sonner";

interface OcrQueryParams {
  status?: string;
  documentType?: string;
  page?: number;
  limit?: number;
  search?: string;
  workspaceId?: string;
}

interface OcrResponse {
  data: OcrResult[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const useOcrResults = (params: OcrQueryParams = {}, options = {}) => {
  return useQuery<OcrResponse>({
    queryKey: ["ocr-results", params],
    queryFn: async () => {
      const { data } = await apiClient.get("/ocr", { params });
      return data;
    },
    ...options,
  });
};

export const useReprocessOcr = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      const { data } = await apiClient.post(`/ocr/${fileId}/reprocess`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocr-results"] });
      queryClient.invalidateQueries({ queryKey: ["output-reports"] });
      queryClient.invalidateQueries({ queryKey: ["logbooks"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal memproses ulang OCR");
    },
  });
};

export const useUpdateOcrData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, parsedData }: { fileId: string; parsedData: any }) => {
      const { data } = await apiClient.put(`/ocr/${fileId}`, { parsedData });
      return data;
    },
    onSuccess: (_, { fileId }) => {
      queryClient.invalidateQueries({ queryKey: ["ocr-results"] });
      queryClient.invalidateQueries({ queryKey: ["ocr-status", fileId] });
      toast.success("Data OCR berhasil diperbarui secara manual");
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal memperbarui data OCR");
    },
  });
};
