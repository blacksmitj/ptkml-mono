"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/use-app-store";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApplicants } from "@/hooks/use-applicants";
import { useWorkspace } from "@/hooks/use-workspaces";
import { ApplicantsTable } from "@/components/applicants/applicants-table";
import { usePersistentTable } from "@/hooks/use-persistent-table";

export default function ApplicantsPage() {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentRole = useAppStore((state) => state.currentRole);
  const { data: workspace } = useWorkspace(currentWorkspaceId || "");
  const isWorkspaceActive = workspace?.isActive ?? true;
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawStatusFromQuery = searchParams.get("status");
  const rawCommFromQuery = searchParams.get("communicationStatus");
  const rawPresenceFromQuery = searchParams.get("presenceStatus");
  const rawWillingnessFromQuery = searchParams.get("willingness");
  const rawFundFromQuery = searchParams.get("fundDisbursement");

  const statusFromQuery = React.useMemo(() => {
    if (!rawStatusFromQuery) return null;
    const upper = rawStatusFromQuery.toUpperCase();
    if (["ACTIVE", "PENDING", "DROPPED", "ALL"].includes(upper)) {
      return upper;
    }
    return null;
  }, [rawStatusFromQuery]);

  const commFromQuery = React.useMemo(() => {
    if (!rawCommFromQuery) return null;
    const upper = rawCommFromQuery.toUpperCase();
    if (["RESPONDED", "NO_RESPONSE", "ALL"].includes(upper)) return upper;
    return null;
  }, [rawCommFromQuery]);

  const presenceFromQuery = React.useMemo(() => {
    if (!rawPresenceFromQuery) return null;
    const upper = rawPresenceFromQuery.toUpperCase();
    if (["FOUND", "NOT_FOUND", "ALL"].includes(upper)) return upper;
    return null;
  }, [rawPresenceFromQuery]);

  const willingnessFromQuery = React.useMemo(() => {
    if (!rawWillingnessFromQuery) return null;
    const upper = rawWillingnessFromQuery.toUpperCase();
    if (["WILLING", "NOT_WILLING", "ALL"].includes(upper)) return upper;
    return null;
  }, [rawWillingnessFromQuery]);

  const fundFromQuery = React.useMemo(() => {
    if (!rawFundFromQuery) return null;
    const upper = rawFundFromQuery.toUpperCase();
    if (["DISBURSED", "NOT_DISBURSED", "ALL"].includes(upper)) return upper;
    return null;
  }, [rawFundFromQuery]);

  const {
    page,
    setPage,
    limit,
    setLimit,
    search,
    setSearch,
    debouncedSearch,
    sorting,
    setSorting,
    filters,
    setFilter,
    resetFilters,
    sortBy,
    sortOrder,
  } = usePersistentTable({
    storageKey: "tkml-applicants-table-state",
    workspaceId: currentWorkspaceId,
    defaultFilters: {
      status: "ALL",
      universityId: "ALL",
      mentorStatus: "ALL",
      communicationStatus: "ALL",
      presenceStatus: "ALL",
      willingness: "ALL",
      fundDisbursement: "ALL",
    },
    initialFilters: {
      ...(statusFromQuery ? { status: statusFromQuery } : {}),
      ...(commFromQuery ? { communicationStatus: commFromQuery } : {}),
      ...(presenceFromQuery ? { presenceStatus: presenceFromQuery } : {}),
      ...(willingnessFromQuery ? { willingness: willingnessFromQuery } : {}),
      ...(fundFromQuery ? { fundDisbursement: fundFromQuery } : {}),
    },
  });

  const status = filters.status;
  const universityId = filters.universityId;
  const mentorStatus = filters.mentorStatus;
  const communicationStatus = filters.communicationStatus;
  const presenceStatus = filters.presenceStatus;
  const willingness = filters.willingness;
  const fundDisbursement = filters.fundDisbursement;

  // Sync if URL search parameter changes
  React.useEffect(() => {
    if (statusFromQuery) {
      setFilter("status", statusFromQuery);
    }
  }, [statusFromQuery, setFilter]);

  React.useEffect(() => {
    if (commFromQuery) {
      setFilter("communicationStatus", commFromQuery);
    }
  }, [commFromQuery, setFilter]);

  React.useEffect(() => {
    if (presenceFromQuery) {
      setFilter("presenceStatus", presenceFromQuery);
    }
  }, [presenceFromQuery, setFilter]);

  React.useEffect(() => {
    if (willingnessFromQuery) {
      setFilter("willingness", willingnessFromQuery);
    }
  }, [willingnessFromQuery, setFilter]);

  React.useEffect(() => {
    if (fundFromQuery) {
      setFilter("fundDisbursement", fundFromQuery);
    }
  }, [fundFromQuery, setFilter]);

  const handleResetFilters = React.useCallback(() => {
    resetFilters();
    router.replace("/applicants", { scroll: false });
  }, [resetFilters, router]);

  const setStatus = (val: string) => setFilter("status", val);
  const setUniversityId = (val: string) => setFilter("universityId", val);
  const setMentorStatus = (val: string) => setFilter("mentorStatus", val);
  const setCommunicationStatus = (val: string) => setFilter("communicationStatus", val);
  const setPresenceStatus = (val: string) => setFilter("presenceStatus", val);
  const setWillingness = (val: string) => setFilter("willingness", val);
  const setFundDisbursement = (val: string) => setFilter("fundDisbursement", val);

  const { data: applicantsData, isLoading, isError } = useApplicants(
    currentWorkspaceId || undefined,
    undefined,
    {
      page,
      limit,
      search: debouncedSearch || undefined,
      sortBy,
      sortOrder,
      status: status !== "ALL" ? status : undefined,
      universityId: universityId !== "ALL" ? universityId : undefined,
      mentorStatus: mentorStatus !== "ALL" ? mentorStatus : undefined,
      communicationStatus: communicationStatus !== "ALL" ? communicationStatus : undefined,
      presenceStatus: presenceStatus !== "ALL" ? presenceStatus : undefined,
      willingness: willingness !== "ALL" ? willingness : undefined,
      fundDisbursement: fundDisbursement !== "ALL" ? fundDisbursement : undefined,
    }
  );

  const hasActiveFilters =
    status !== "ALL" ||
    universityId !== "ALL" ||
    mentorStatus !== "ALL" ||
    communicationStatus !== "ALL" ||
    presenceStatus !== "ALL" ||
    willingness !== "ALL" ||
    fundDisbursement !== "ALL";

  const hasData = applicantsData && (
    (applicantsData.data && applicantsData.data.length > 0) || 
    (Array.isArray(applicantsData) && applicantsData.length > 0)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daftar Peserta</h1>
          <p className="text-muted-foreground mt-2">
            Kelola data peserta TKML dan pendampingan mereka.
          </p>
        </div>
        {isWorkspaceActive && currentRole === "SUPER_ADMIN" && (
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild className="gap-2">
              <Link href="/applicants/divide">
                <Users className="h-4 w-4" />
                Bagi Peserta
              </Link>
            </Button>
            <Button asChild className="gap-2">
              <Link href="/applicants/import">
                <Plus className="h-4 w-4" />
                Tambah Peserta
              </Link>
            </Button>
          </div>
        )}
      </div>

      {isLoading && !applicantsData ? (
        <div className="rounded-md border">
          <div className="p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center p-20 rounded-2xl border bg-destructive/5 text-destructive gap-2">
          <h3 className="text-lg font-semibold">Gagal memuat data</h3>
          <p className="text-sm opacity-80">Terjadi kesalahan saat mengambil data peserta.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Coba Lagi</Button>
        </div>
      ) : (hasData || search || debouncedSearch || hasActiveFilters) ? (
        <ApplicantsTable
          applicants={applicantsData?.data || (Array.isArray(applicantsData) ? applicantsData : [])}
          isLoading={isLoading}
          pagination={applicantsData?.pagination}
          page={page}
          setPage={setPage}
          limit={limit}
          setLimit={setLimit}
          search={search}
          setSearch={setSearch}
          sorting={sorting}
          setSorting={setSorting}
          status={status}
          setStatus={setStatus}
          universityId={universityId}
          setUniversityId={setUniversityId}
          mentorStatus={mentorStatus}
          setMentorStatus={setMentorStatus}
          communicationStatus={communicationStatus}
          setCommunicationStatus={setCommunicationStatus}
          presenceStatus={presenceStatus}
          setPresenceStatus={setPresenceStatus}
          willingness={willingness}
          setWillingness={setWillingness}
          fundDisbursement={fundDisbursement}
          setFundDisbursement={setFundDisbursement}
          onResetFilters={handleResetFilters}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-20 rounded-2xl border-2 border-dashed bg-muted/30 gap-4">
          <div className="p-4 rounded-full bg-primary/10 text-primary">
            <Plus className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Belum ada peserta</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
              Daftar peserta masih kosong. Silakan tambahkan peserta baru melalui tombol di atas atau klik tombol di bawah.
            </p>
          </div>
          {isWorkspaceActive && currentRole === "SUPER_ADMIN" && (
            <Button asChild variant="outline" className="mt-2">
              <Link href="/applicants/import">Mulai Impor Excel</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
