"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { useAppStore } from "@/store/use-app-store";
import { WorkspaceRole } from "@/types";
import { useConfirm } from "@/components/providers/confirm-provider";
import { useOutputReports, useDeleteOutputReport } from "@/hooks/use-output-reports";
import { getPendingVerificationRefetchInterval } from "@/lib/query-polling";
import { useReprocessOcr } from "@/hooks/use-ocr";
import { usePersistentTable } from "@/hooks/use-persistent-table";
import { apiClient } from "@/lib/api-client";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

import { getOutputReportsColumns } from "./columns";
import { OutputFilters } from "./components/OutputFilters";
import { mapOutputReports } from "./lib/mapper";
import { OutputReportActions } from "./lib/types";

export default function OutputReportsPage() {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentRole = useAppStore((state) => state.currentRole);
  const isSuperAdmin = currentRole === "SUPER_ADMIN";
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const rawStatusFromQuery = searchParams.get("status");
  const statusFromQuery = React.useMemo(() => {
    if (!rawStatusFromQuery) return null;
    const upper = rawStatusFromQuery.toUpperCase();
    if (["DRAFT", "PENDING", "APPROVED", "REJECTED", "ALL"].includes(upper)) {
      return upper;
    }
    return null;
  }, [rawStatusFromQuery]);

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  
  const confirm = useConfirm();
  const deleteOutputReport = useDeleteOutputReport();
  const reprocessOcr = useReprocessOcr();

  const table = usePersistentTable({
    storageKey: "tkml-output-reports-table-state",
    workspaceId: currentWorkspaceId,
    defaultFilters: {
      statusFilter: "ALL",
      monthFilter: "ALL",
    },
    initialFilters: statusFromQuery ? { statusFilter: statusFromQuery } : undefined,
  });

  const statusFilter = table.filters.statusFilter;
  const monthFilter = table.filters.monthFilter;

  // Sync if URL search parameter changes
  React.useEffect(() => {
    if (statusFromQuery) {
      table.setFilter("statusFilter", statusFromQuery);
    }
  }, [statusFromQuery]);

  const handleResetFilters = React.useCallback(() => {
    table.resetFilters();
    router.replace("/output-reports", { scroll: false });
  }, [table, router]);

  const handleStatusFilterChange = (val: string) => {
    table.setFilter("statusFilter", val);
  };

  const handleMonthFilterChange = (val: string) => {
    table.setFilter("monthFilter", val);
  };

  const [refetchInterval, setRefetchInterval] = React.useState<number | false>(false);

  const { data: outputsData, isLoading, isError } = useOutputReports(
    currentWorkspaceId || undefined,
    undefined,
    undefined,
    {
      page: table.page,
      limit: table.limit,
      search: table.debouncedSearch || undefined,
      sortBy: table.sortBy,
      sortOrder: table.sortOrder,
      verificationStatus: statusFilter !== "ALL" ? statusFilter : undefined,
      monthReport: monthFilter !== "ALL" ? monthFilter : undefined,
    },
    {
      refetchInterval,
    }
  );

  React.useEffect(() => {
    const rawList = outputsData?.data || outputsData || [];
    const hasPendingOcr = Array.isArray(rawList) && rawList.some((o: any) => o.ocrSummary?.pendingCount > 0);
    const verificationInterval = getPendingVerificationRefetchInterval(outputsData);

    if (hasPendingOcr) {
      setRefetchInterval(3000);
    } else if (verificationInterval !== false) {
      setRefetchInterval(verificationInterval);
    } else {
      setRefetchInterval(false);
    }
  }, [outputsData]);

  const handleDelete = React.useCallback(async (id: string) => {
    const isConfirmed = await confirm({
      title: "Hapus Laporan Output?",
      description: "Apakah Anda yakin ingin menghapus laporan output ini?",
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      variant: "destructive",
    });

    if (!isConfirmed) return;
    setDeletingId(id);
    try {
      await deleteOutputReport.mutateAsync(id);
      toast.success("Laporan output berhasil dihapus");
    } catch (err) {
      console.error("Gagal menghapus laporan output:", err);
      toast.error("Gagal menghapus laporan output");
    } finally {
      setDeletingId(null);
    }
  }, [confirm, deleteOutputReport]);

  const handleReprocessAll = React.useCallback(async (id: string) => {
    setProcessingId(id);
    try {
      const { data: detailData } = await apiClient.get(`/output-reports/${id}`);
      const reportFiles = detailData?.files || [];
      const employeeFiles = detailData?.employees?.flatMap((emp: any) => emp.files || []) || [];
      const files = [...reportFiles, ...employeeFiles];

      if (files.length === 0) {
        toast.error("Tidak ada berkas untuk diperiksa");
        return;
      }

      for (const f of files) {
        await reprocessOcr.mutateAsync(f.id);
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal memproses berkas");
    } finally {
      setProcessingId(null);
    }
  }, [reprocessOcr]);

  const data = React.useMemo(() => {
    const rawList = outputsData?.data || outputsData || [];
    return mapOutputReports(rawList);
  }, [outputsData]);

  const columns = React.useMemo(
    () => getOutputReportsColumns({
      currentRole: currentRole || "",
      isSuperAdmin,
      actions: {
        deletingId,
        processingId,
        onDelete: handleDelete,
        onReprocessAll: handleReprocessAll,
        onDetail: (id: string) => router.push(`/output-reports/${id}`),
        onEdit: (id: string) => router.push(`/output-reports/${id}/edit`),
      },
    }),
    [currentRole, isSuperAdmin, deletingId, processingId, handleDelete, handleReprocessAll, router]
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Capaian Output Bulanan" 
        description="Monitor perkembangan bisnis peserta melalui laporan berkala."
      >
        {currentRole === WorkspaceRole.MENTOR && (
          <Button asChild>
            <Link href="/output-reports/new">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Capaian Output
            </Link>
          </Button>
        )}
      </PageHeader>

      {isLoading && !outputsData ? (
        <div className="rounded-md border p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center p-20 rounded-2xl border bg-destructive/5 text-destructive gap-2">
          <h3 className="text-lg font-semibold">Gagal memuat data</h3>
          <p className="text-sm opacity-80">Terjadi kesalahan saat mengambil data laporan.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Coba Lagi</Button>
        </div>
      ) : (
        <DataTable 
          columns={columns} 
          data={data} 
          isLoading={isLoading}
          searchKey="applicantName" 
          searchPlaceholder="Cari..." 
          pagination={outputsData?.pagination}
          page={table.page}
          setPage={table.setPage}
          limit={table.limit}
          setLimit={table.setLimit}
          search={table.search}
          setSearch={table.setSearch}
          sorting={table.sorting}
          setSorting={table.setSorting}
          filterElement={
            <OutputFilters
              statusFilter={statusFilter}
              monthFilter={monthFilter}
              onStatusFilterChange={handleStatusFilterChange}
              onMonthFilterChange={handleMonthFilterChange}
              onResetFilters={handleResetFilters}
            />
          }
        />
      )}
    </div>
  );
}
