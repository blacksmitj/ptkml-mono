"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/user-avatar"
import { useUniversities } from "@/hooks/use-universities"
import { useAppStore } from "@/store/use-app-store"
import { useRouter } from "next/navigation"
import { WorkspaceRole, VerificationStatus } from "@/types"
import { 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Search,
  X,
  Loader2,
  UserPlus,
  FileText
} from "lucide-react"

interface MentorsTableProps {
  members: any[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  page?: number
  setPage?: (page: number) => void
  limit?: number
  setLimit?: (limit: number) => void
  search?: string
  setSearch?: (search: string) => void
  sorting?: SortingState
  setSorting?: React.Dispatch<React.SetStateAction<SortingState>>
  verificationStatus?: string
  setVerificationStatus?: (status: string) => void
  universityId?: string
  setUniversityId?: (univId: string) => void
  onResetFilters?: () => void
  isLoading?: boolean
  isFetching?: boolean
}

export function MentorsTable({ 
  members,
  pagination,
  page,
  setPage,
  limit,
  setLimit,
  search,
  setSearch,
  sorting,
  setSorting,
  verificationStatus,
  setVerificationStatus,
  universityId,
  setUniversityId,
  onResetFilters,
  isLoading = false,
  isFetching = false,
}: MentorsTableProps) {
  const router = useRouter()
  const showLoading = isLoading || isFetching
  const currentRole = useAppStore((state) => state.currentRole)
  const isUnivAdmin = currentRole === "UNIVERSITY_ADMIN"
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId)

  // Fetch universities for dynamic filter
  const { data: universities } = useUniversities({ workspaceId: currentWorkspaceId || undefined })

  const [localSorting, setLocalSorting] = React.useState<SortingState>([])
  const tableSorting = sorting !== undefined ? sorting : localSorting
  const setTableSorting = setSorting !== undefined ? setSorting : setLocalSorting

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  // Format data for table consumption
  const data = React.useMemo(() => {
    return members.map((m) => {
      const profile = m.user?.profile
      const univ = m.university
      const participantCount = m._count?.applicants || 0

      return {
        ...m,
        name: profile?.name || "N/A",
        email: profile?.email || "N/A",
        photo: profile?.photo || null,
        universityName: univ?.name || "N/A",
        participantCount,
      }
    })
  }, [members])

  const columns: ColumnDef<any>[] = React.useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Nama Lengkap",
        cell: ({ row }) => (
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar name={row.getValue("name")} src={row.original.photo} />
            <div className="flex flex-col min-w-0">
              <span className="font-medium truncate" title={row.getValue("name")}>
                {row.getValue("name")}
              </span>
              <span className="text-xs text-muted-foreground truncate" title={row.original.email}>
                {row.original.email}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "universityName",
        header: "Universitas",
        cell: ({ row }) => (
          <span className="truncate block font-medium" title={row.getValue("universityName")}>
            {row.getValue("universityName")}
          </span>
        ),
      },
      {
        accessorKey: "participantCount",
        header: "Jumlah Peserta",
        cell: ({ row }) => {
          const count = row.getValue("participantCount") as number
          return (
            <div className="flex items-center gap-2">
              <Badge
                variant={count > 0 ? "secondary" : "outline"}
                className={count === 0 ? "border-rose-200 text-rose-600 bg-rose-50" : ""}
              >
                {count} Peserta
              </Badge>
            </div>
          )
        },
      },
      {
        accessorKey: "verificationStatus",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("verificationStatus") as VerificationStatus
          return (
            <Badge
              variant={
                status === VerificationStatus.APPROVED
                  ? "default"
                  : status === VerificationStatus.REJECTED
                  ? "destructive"
                  : "outline"
              }
              className={
                status === VerificationStatus.APPROVED
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/15"
                  : status === VerificationStatus.REJECTED
                  ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15"
                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/15 animate-pulse"
              }
            >
              {status === VerificationStatus.APPROVED
                ? "Aktif"
                : status === VerificationStatus.REJECTED
                ? "Ditolak"
                : "Menunggu"}
            </Badge>
          )
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {isUnivAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-2 cursor-pointer"
                  onClick={() => {
                    router.push(`/mentors/${row.original.id}/assign`)
                  }}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Alokasikan
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 cursor-pointer"
                onClick={() => {
                  router.push(`/members/${row.original.id}`)
                }}
              >
                Detail
              </Button>
            </div>
          )
        },
      },
    ],
    [isUnivAdmin, router]
  )

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
  })

  // Clear all filters helper
  const handleReset = () => {
    if (onResetFilters) {
      onResetFilters()
    } else {
      if (setVerificationStatus) setVerificationStatus("ALL")
      if (setUniversityId) setUniversityId("ALL")
      if (setSearch) setSearch("")
      if (setPage) setPage(1)
    }
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname)
    }
    table.resetColumnFilters()
  }

  return (
    <div className="w-full space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari pendamping..."
              value={search !== undefined ? search : ((table.getColumn("name")?.getFilterValue() as string) ?? "")}
              onChange={(event) => {
                if (setSearch) {
                  setSearch(event.target.value)
                } else {
                  table.getColumn("name")?.setFilterValue(event.target.value)
                }
              }}
              className={`pl-8 ${showLoading ? "pr-8" : ""}`}
            />
            {showLoading && (
              <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Verification Status Filter */}
          <Select
            value={verificationStatus ?? "ALL"}
            onValueChange={(value) => {
              if (setVerificationStatus) {
                setVerificationStatus(value)
                if (setPage) setPage(1)
              }
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value={VerificationStatus.APPROVED}>APPROVED (Aktif)</SelectItem>
              <SelectItem value={VerificationStatus.PENDING}>PENDING (Menunggu)</SelectItem>
              <SelectItem value={VerificationStatus.REJECTED}>REJECTED (Ditolak)</SelectItem>
            </SelectContent>
          </Select>

          {/* University Filter */}
          <Select
            value={universityId ?? "ALL"}
            onValueChange={(value) => {
              if (setUniversityId) {
                setUniversityId(value)
                if (setPage) setPage(1)
              }
            }}
          >
            <SelectTrigger className="w-55 truncate">
              <SelectValue placeholder="Semua Universitas" />
            </SelectTrigger>
            <SelectContent className="max-h-75">
              <SelectItem value="ALL">Semua Universitas</SelectItem>
              {universities?.map((univ) => (
                <SelectItem key={univ.id} value={univ.id}>
                  {univ.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters Button (Always Visible) */}
          <Button
            variant="outline"
            onClick={handleReset}
            className="h-9 px-2 lg:px-3 text-muted-foreground hover:text-foreground gap-1.5 border-dashed"
            title="Bersihkan semua filter"
          >
            <X className="h-4 w-4" />
            Bersihkan Filter
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Column Visibility Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Kolom
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Tampilkan Kolom</DropdownMenuLabel>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id === "name"
                        ? "Nama"
                        : column.id === "email"
                        ? "Email"
                        : column.id === "universityName"
                        ? "Universitas"
                        : column.id === "participantCount"
                        ? "Jumlah Peserta"
                        : column.id === "verificationStatus"
                        ? "Status"
                        : column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table Element */}
      <div className={`rounded-xl border bg-card overflow-x-auto shadow-sm transition-opacity duration-200 ${showLoading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
        <Table className="w-full min-w-200">
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
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
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  Pendamping tidak ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
        <div className="flex-1 text-sm text-muted-foreground">
          Total {pagination ? pagination.total : table.getFilteredRowModel().rows.length} pendamping
        </div>
        <div className="flex flex-wrap items-center gap-6 lg:gap-8">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Baris per halaman</p>
            <Select
              value={`${pagination ? pagination.limit : table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                if (pagination && setLimit && setPage) {
                  setLimit(Number(value))
                  setPage(1)
                } else {
                  table.setPageSize(Number(value))
                }
              }}
            >
              <SelectTrigger className="h-8 w-17.5">
                <SelectValue placeholder={pagination ? pagination.limit : table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-25 items-center justify-center text-sm font-medium">
            Halaman {pagination ? pagination.page : table.getState().pagination.pageIndex + 1} dari{" "}
            {pagination ? pagination.totalPages : table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => {
                if (pagination && setPage) {
                  setPage(1)
                } else {
                  table.setPageIndex(0)
                }
              }}
              disabled={pagination ? pagination.page <= 1 : !table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => {
                if (pagination && setPage) {
                  setPage(pagination.page - 1)
                } else {
                  table.previousPage()
                }
              }}
              disabled={pagination ? pagination.page <= 1 : !table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => {
                if (pagination && setPage) {
                  setPage(pagination.page + 1)
                } else {
                  table.nextPage()
                }
              }}
              disabled={pagination ? pagination.page >= pagination.totalPages : !table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => {
                if (pagination && setPage) {
                  setPage(pagination.totalPages)
                } else {
                  table.setPageIndex(table.getPageCount() - 1)
                }
              }}
              disabled={pagination ? pagination.page >= pagination.totalPages : !table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
