"use client";

import * as React from "react";
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUniversities } from "@/hooks/use-universities";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ApplicantStatusModal } from "@/components/applicants/applicant-status-modal";
import { useApplicantsTable } from "./use-applicants-table";
import { createApplicantsColumns } from "./applicants-columns";
import { ApplicantsToolbar } from "./applicants-toolbar";
import { ApplicantsPagination } from "./applicants-pagination";

export interface ApplicantsTableProps {
  applicants: any[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  page?: number;
  setPage?: (page: number) => void;
  limit?: number;
  setLimit?: (limit: number) => void;
  search?: string;
  setSearch?: (search: string) => void;
  sorting?: SortingState;
  setSorting?: React.Dispatch<React.SetStateAction<SortingState>>;
  status?: string;
  setStatus?: (status: string) => void;
  universityId?: string;
  setUniversityId?: (univId: string) => void;
  mentorStatus?: string;
  setMentorStatus?: (status: string) => void;
  communicationStatus?: string;
  setCommunicationStatus?: (status: string) => void;
  presenceStatus?: string;
  setPresenceStatus?: (status: string) => void;
  willingness?: string;
  setWillingness?: (status: string) => void;
  fundDisbursement?: string;
  setFundDisbursement?: (status: string) => void;
  onResetFilters?: () => void;
  isLoading?: boolean;
  isFetching?: boolean;
}

export function ApplicantsTable({
  applicants,
  pagination,
  page,
  setPage,
  limit,
  setLimit,
  search,
  setSearch,
  sorting,
  setSorting,
  status,
  setStatus,
  universityId,
  setUniversityId,
  mentorStatus,
  setMentorStatus,
  communicationStatus,
  setCommunicationStatus,
  presenceStatus,
  setPresenceStatus,
  willingness,
  setWillingness,
  fundDisbursement,
  setFundDisbursement,
  onResetFilters,
  isLoading = false,
  isFetching = false,
}: ApplicantsTableProps) {
  const router = useRouter();
  const showLoading = isLoading || isFetching;

  const {
    currentRole,
    currentWorkspaceId,
    isWorkspaceInactive,
    checkCanEdit,
    checkCanUpdateStatus,
    getStatusBadgeInfo,
    handleDeleteApplicant,
  } = useApplicantsTable();

  // Fetch universities for dynamic filter
  const { data: universities } = useUniversities({
    workspaceId: currentWorkspaceId || undefined,
  });

  const [localSorting, setLocalSorting] = React.useState<SortingState>([]);
  const tableSorting = sorting !== undefined ? sorting : localSorting;
  const setTableSorting =
    setSorting !== undefined ? setSorting : setLocalSorting;

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      select: false,
      communicationStatus: false,
      willingness: false,
      presenceStatus: false,
      fundDisbursement: false,
    });
  const [rowSelection, setRowSelection] = React.useState({});
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);
  const [selectedApplicant, setSelectedApplicant] = React.useState<any>(null);

  // Format data for table consumption
  const data = React.useMemo(() => {
    return (applicants || []).map((a) => {
      const mentorProfile = a.mentor?.user?.profile;
      const university = a.university;

      return {
        ...a,
        name: a.profile?.name || "N/A",
        nik: a.profile?.nik || "N/A",
        mentorName: mentorProfile?.name || "Belum ada mentor",
        universityName: university?.name || "Belum Dibagikan",
        joinedAt: a.createdAt
          ? formatDistanceToNow(new Date(a.createdAt), {
              addSuffix: true,
              locale: localeId,
            })
          : "N/A",
      };
    });
  }, [applicants]);

  const columns = React.useMemo(
    () =>
      createApplicantsColumns({
        checkCanEdit,
        checkCanUpdateStatus,
        getStatusBadgeInfo,
        handleDeleteApplicant,
        setSelectedApplicant,
        setStatusModalOpen,
        currentRole,
        isWorkspaceInactive,
        router,
      }),
    [
      checkCanEdit,
      checkCanUpdateStatus,
      getStatusBadgeInfo,
      handleDeleteApplicant,
      currentRole,
      isWorkspaceInactive,
      router,
    ],
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setTableSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: pagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: pagination ? undefined : getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: !!pagination,
    manualSorting: !!pagination,
    state: {
      sorting: tableSorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full space-y-4">
      {/* Filters Toolbar */}
      <ApplicantsToolbar
        table={table}
        search={search}
        setSearch={setSearch}
        showLoading={showLoading}
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
        setPage={setPage}
        onResetFilters={onResetFilters}
        universities={universities}
      />

      {/* Table Element */}
      <div
        className={`w-full max-w-full rounded-xl border bg-card overflow-x-auto shadow-sm block transition-opacity duration-200 ${
          showLoading ? "opacity-60 pointer-events-none" : "opacity-100"
        }`}
      >
        <Table className="w-full min-w-212.5">
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  Peserta tidak ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <ApplicantsPagination
        table={table}
        pagination={pagination}
        setPage={setPage}
        setLimit={setLimit}
      />

      <ApplicantStatusModal
        open={statusModalOpen}
        onClose={() => {
          setStatusModalOpen(false);
          setSelectedApplicant(null);
        }}
        applicant={selectedApplicant}
        currentRole={currentRole ?? undefined}
      />
    </div>
  );
}
