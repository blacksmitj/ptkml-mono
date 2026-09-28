import { apiClient } from "@/lib/api-client";

interface DownloadExcelParams {
  workspaceId: string;
  search?: string;
  statusFilter?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
  role?: string;
}

export async function downloadLogbooksExcel({
  workspaceId,
  search,
  statusFilter,
  startDate,
  endDate,
  sortBy,
  sortOrder,
  role,
}: DownloadExcelParams): Promise<void> {
  const { data: response } = await apiClient.get("/logbooks", {
    params: {
      workspaceId,
      search: search || undefined,
      verificationStatus: statusFilter !== "ALL" ? statusFilter : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sortBy,
      sortOrder,
    }
  });

  const rawList = response.data || response || [];
  const { exportLogbooksToExcel } = await import("@/lib/excel");
  await exportLogbooksToExcel(rawList, { startDate, endDate, role });
}
