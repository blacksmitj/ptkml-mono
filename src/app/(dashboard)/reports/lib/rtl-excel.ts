import { apiClient } from "@/lib/api-client";

interface DownloadRtlParams {
  workspaceId: string;
  statusFilter?: string;
  applicantId?: string;
  mentorId?: string;
}

export async function downloadRtlExcel({
  workspaceId,
  statusFilter,
  applicantId,
  mentorId,
}: DownloadRtlParams): Promise<void> {
  const { data: rawList } = await apiClient.get("/follow-up-recommendations", {
    params: {
      workspaceId,
      status: statusFilter && statusFilter !== "ALL" ? statusFilter : undefined,
      applicantId: applicantId || undefined,
      mentorId: mentorId || undefined,
    },
  });

  const list = Array.isArray(rawList) ? rawList : rawList?.data || [];
  const { exportRtlToExcel } = await import("@/lib/excel");
  await exportRtlToExcel(list, { statusFilter });
}
