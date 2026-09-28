"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMembers } from "@/hooks/use-members";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/use-app-store";
import { WorkspaceRole, VerificationStatus } from "@/types";
import { MentorsTable } from "@/components/mentors/mentors-table";
import { RoleGuard } from "@/components/role-guard";
import { usePersistentTable } from "@/hooks/use-persistent-table";

export default function MentorsPage() {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const universityId = useAppStore((state) => state.universityId);
  const currentRole = useAppStore((state) => state.currentRole);
  const isBypassAffiliation = currentRole === "SUPER_ADMIN" || currentRole === "WORKSPACE_SUPERVISOR";
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawStatusFromQuery = searchParams.get("status") || searchParams.get("verificationStatus");
  const statusFromQuery = React.useMemo(() => {
    if (!rawStatusFromQuery) return null;
    const upper = rawStatusFromQuery.toUpperCase();
    if (["PENDING", "APPROVED", "REJECTED", "ALL"].includes(upper)) {
      return upper;
    }
    return null;
  }, [rawStatusFromQuery]);

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
    storageKey: "tkml-mentors-table-state",
    workspaceId: currentWorkspaceId,
    defaultFilters: {
      verificationStatus: "ALL",
      selectedUniversityId: "ALL",
    },
    initialFilters: statusFromQuery ? { verificationStatus: statusFromQuery } : undefined,
  });

  const verificationStatus = filters.verificationStatus;
  const selectedUniversityId = filters.selectedUniversityId;

  // Sync if URL search parameter changes
  React.useEffect(() => {
    if (statusFromQuery) {
      setFilter("verificationStatus", statusFromQuery);
    }
  }, [statusFromQuery, setFilter]);

  const handleResetFilters = React.useCallback(() => {
    resetFilters();
    router.replace("/mentors", { scroll: false });
  }, [resetFilters, router]);

  const setVerificationStatus = (val: string) => setFilter("verificationStatus", val);
  const setSelectedUniversityId = (val: string) => setFilter("selectedUniversityId", val);

  const { data: membersData, isLoading } = useMembers({
    workspaceId: currentWorkspaceId || undefined,
    role: WorkspaceRole.MENTOR,
    universityId: isBypassAffiliation
      ? (selectedUniversityId !== "ALL" ? selectedUniversityId : undefined)
      : (universityId || undefined),
    page,
    limit,
    search: debouncedSearch || undefined,
    sortBy,
    sortOrder,
    verificationStatus: (verificationStatus as string) !== "ALL" ? (verificationStatus as VerificationStatus) : undefined,
  });

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "WORKSPACE_SUPERVISOR", WorkspaceRole.UNIVERSITY_ADMIN, WorkspaceRole.UNIVERSITY_SUPERVISOR]}>
      <div className="flex flex-col gap-6 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manajemen Pendamping</h1>
            <p className="text-muted-foreground mt-2">
              Kelola daftar pendamping di workspace ini.
            </p>
          </div>
        </div>

        {isLoading && !membersData ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <MentorsTable
            members={membersData?.data || (Array.isArray(membersData) ? membersData : [])}
            isLoading={isLoading}
            pagination={membersData?.pagination}
            page={page}
            setPage={setPage}
            limit={limit}
            setLimit={setLimit}
            search={search}
            setSearch={setSearch}
            sorting={sorting}
            setSorting={setSorting}
            verificationStatus={verificationStatus}
            setVerificationStatus={setVerificationStatus}
            universityId={selectedUniversityId}
            setUniversityId={setSelectedUniversityId}
            onResetFilters={handleResetFilters}
          />
        )}
      </div>
    </RoleGuard>
  );
}
