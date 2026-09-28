"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { useAppStore } from "@/store/use-app-store";
import { WorkspaceRole } from "@/types";
import { useConfirm } from "@/components/providers/confirm-provider";
import { useLogbooks, useDeleteLogbook } from "@/hooks/use-logbooks";
import { getPendingVerificationRefetchInterval } from "@/lib/query-polling";
import { useReprocessOcr } from "@/hooks/use-ocr";
import { usePersistentTable } from "@/hooks/use-persistent-table";
import { apiClient } from "@/lib/api-client";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

import { getLogbookColumns } from "./columns";
import { LogbookFilters } from "./components/LogbookFilters";
import { mapLogbooks } from "./lib/mapper";

export default function LogbooksPage() {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentRole = useAppStore((state) => state.currentRole);
  const isSuperAdmin = currentRole === "SUPER_ADMIN";
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const rawStatusFromQuery = searchParams.get("status");
  const statusFromQuery = React.useMemo(() => {
    if (!rawStatusFromQuery) return null;
    const upper = rawStatusFromQuery.toUpperCase();
    if (["PENDING", "APPROVED", "REJECTED", "ALL"].includes(upper)) {
      return upper;
    }
    return null;
  }, [rawStatusFromQuery]);

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  
  const confirm = useConfirm();
  const deleteLogbook = useDeleteLogbook();
  const reprocessOcr = useReprocessOcr();

  const table = usePersistentTable({
    storageKey: "tkml-logbooks-table-state",
    workspaceId: currentWorkspaceId,
    defaultFilters: {
      statusFilter: "ALL",
    },
    initialFilters: statusFromQuery ? { statusFilter: statusFromQuery } : undefined,
  });

  const statusFilter = table.filters.statusFilter;

  // Sync if URL search parameter changes
  React.useEffect(() => {
    if (statusFromQuery) {
      table.setFilter("statusFilter", statusFromQuery);
    }
  }, [statusFromQuery]);

  const handleResetFilters = React.useCallback(() => {
    table.resetFilters();
    router.replace("/logbooks", { scroll: false });
  }, [table, router]);

  const handleStatusFilterChange = (val: string) => {
    table.setFilter("statusFilter", val);
  };

  const [refetchInterval, setRefetchInterval] = React.useState<number | false>(false);

  const { data: logbooksData, isLoading, isError } = useLogbooks(
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
    },
    {
      refetchInterval,
    }
  );

  React.useEffect(() => {
    const rawList = logbooksData?.data || logbooksData || [];
    const hasPendingOcr = Array.isArray(rawList) && rawList.some((o: any) => o.ocrSummary?.pendingCount > 0);
    const verificationInterval = getPendingVerificationRefetchInterval(logbooksData);

    if (hasPendingOcr) {
      setRefetchInterval(3000);
    } else if (verificationInterval !== false) {
      setRefetchInterval(verificationInterval);
    } else {
      setRefetchInterval(false);
    }
  }, [logbooksData]);

  const handleDelete = React.useCallback(async (id: string) => {
    const isConfirmed = await confirm({
      title: "Hapus Logbook Harian?",
      description: "Apakah Anda yakin ingin menghapus logbook ini?",
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      variant: "destructive",
    });

    if (!isConfirmed) return;
    setDeletingId(id);
    try {
      await deleteLogbook.mutateAsync(id);
      toast.success("Logbook berhasil dihapus");
    } catch (err: any) {
      console.error("Gagal menghapus logbook:", err);
      toast.error(err?.response?.data?.error || "Gagal menghapus logbook");
    } finally {
      setDeletingId(null);
    }
  }, [confirm, deleteLogbook]);

  const handleReprocessAll = React.useCallback(async (id: string, initialFiles?: any[]) => {
    let files = initialFiles;
    setProcessingId(id);
    try {
      if (!files || files.length === 0) {
        const { data: detailData } = await apiClient.get(`/logbooks/${id}`);
        files = detailData?.files || [];
      }

      if (!files || files.length === 0) {
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
    const rawList = logbooksData?.data || logbooksData || [];
    return mapLogbooks(rawList);
  }, [logbooksData]);

  const columns = React.useMemo(
    () => getLogbookColumns({
      currentRole: currentRole || "",
      isSuperAdmin,
      actions: {
        deletingId,
        processingId,
        onDelete: handleDelete,
        onReprocessAll: handleReprocessAll,
        onDetail: (id: string) => router.push(`/logbooks/${id}`),
      },
    }),
    [currentRole, isSuperAdmin, deletingId, processingId, handleDelete, handleReprocessAll, router]
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Logbook Harian" 
        description="Verifikasi dan tinjau laporan kegiatan harian mentor."
      >
        {currentRole === WorkspaceRole.MENTOR && (
          <Button asChild>
            <Link href="/logbooks/new">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Logbook
            </Link>
          </Button>
        )}
      </PageHeader>

      {isLoading && !logbooksData ? (
        <div className="rounded-md border p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center p-20 rounded-2xl border bg-destructive/5 text-destructive gap-2">
          <h3 className="text-lg font-semibold">Gagal memuat data</h3>
          <p className="text-sm opacity-80">Terjadi kesalahan saat mengambil data logbook.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Coba Lagi</Button>
        </div>
      ) : (
        <DataTable 
          columns={columns} 
          data={data} 
          isLoading={isLoading}
          searchKey="mentorName" 
          searchPlaceholder="Cari..." 
          pagination={logbooksData?.pagination}
          page={table.page}
          setPage={table.setPage}
          limit={table.limit}
          setLimit={table.setLimit}
          search={table.search}
          setSearch={table.setSearch}
          sorting={table.sorting}
          setSorting={table.setSorting}
          filterElement={
            <LogbookFilters
              statusFilter={statusFilter}
              onStatusFilterChange={handleStatusFilterChange}
              onResetFilters={handleResetFilters}
            />
          }
        />
      )}
    </div>
  );
}
