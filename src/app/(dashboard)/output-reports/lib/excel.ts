import { apiClient } from "@/lib/api-client";

interface DownloadExcelParams {
  workspaceId: string;
  search?: string;
  statusFilter?: string;
  monthFilter?: string;
  sortBy?: string;
  sortOrder?: string;
  role?: string;
}

export async function downloadOutputReportsExcel({
  workspaceId,
  search,
  statusFilter,
  monthFilter,
  sortBy,
  sortOrder,
  role,
}: DownloadExcelParams): Promise<void> {
  const { data: rawList } = await apiClient.get("/output-reports/export", {
    params: {
      workspaceId,
      search: search || undefined,
      verificationStatus: statusFilter !== "ALL" ? statusFilter : undefined,
      monthReport: monthFilter !== "ALL" ? monthFilter : undefined,
      sortBy,
      sortOrder,
    }
  });

  const { exportOutputReportsToExcel } = await import("@/lib/excel");
  await exportOutputReportsToExcel(rawList || [], { role });
}
