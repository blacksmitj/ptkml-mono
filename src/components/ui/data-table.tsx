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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Loader2, Search } from "lucide-react"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  onRowClick?: (data: TData) => void
  emptyMessage?: string
  filterElement?: React.ReactNode
  isLoading?: boolean
  isFetching?: boolean

  // Server-side props
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
}


export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Cari...",
  onRowClick,
  emptyMessage = "Data tidak ditemukan.",
  filterElement,
  isLoading = false,
  isFetching = false,
  pagination,
  page,
  setPage,
  limit,
  setLimit,
  search,
  setSearch,
  sorting,
  setSorting,
}: DataTableProps<TData, TValue>) {
  const [localSorting, setLocalSorting] = React.useState<SortingState>([])
  const tableSorting = sorting !== undefined ? sorting : localSorting
  const setTableSorting = setSorting !== undefined ? setSorting : setLocalSorting

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  // Local state for client-side search input and debounce
  const [clientSearch, setClientSearch] = React.useState("")

  const isServerSearch = setSearch !== undefined
  const showLoading = isLoading || isFetching

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

  // Debounce client-side filter
  React.useEffect(() => {
    if (!isServerSearch && searchKey) {
      const timer = setTimeout(() => {
        table.getColumn(searchKey)?.setFilterValue(clientSearch ? clientSearch : undefined)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [clientSearch, searchKey, isServerSearch, table])

  const inputValue = isServerSearch ? (search ?? "") : clientSearch

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          {searchKey && (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={inputValue}
                onChange={(event) => {
                  if (setSearch) {
                    setSearch(event.target.value)
                  } else {
                    setClientSearch(event.target.value)
                  }
                }}
                className={`pl-8 ${showLoading ? "pr-8" : ""}`}
              />
              {showLoading && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          )}
          {filterElement}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Kolom <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className={`rounded-md border bg-card overflow-x-auto transition-opacity duration-200 ${showLoading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
        <Table className="w-full table-fixed min-w-[800px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as any
                  return (
                    <TableHead 
                      key={header.id}
                      className={meta?.className}
                      style={meta?.style}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
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
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as any
                    return (
                      <TableCell 
                        key={cell.id}
                        className={meta?.className}
                        style={meta?.style}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
        <div className="flex-1 text-sm text-muted-foreground">
          Total {pagination ? pagination.total : table.getFilteredRowModel().rows.length} data.
        </div>
        <div className="flex items-center space-x-2">
          {pagination && (
            <span className="text-sm text-muted-foreground mr-2">
              Halaman {pagination.page} dari {pagination.totalPages}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (pagination && setPage) {
                setPage(pagination.page - 1)
              } else {
                table.previousPage()
              }
            }}
            disabled={pagination ? pagination.page <= 1 : !table.getCanPreviousPage()}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (pagination && setPage) {
                setPage(pagination.page + 1)
              } else {
                table.nextPage()
              }
            }}
            disabled={pagination ? pagination.page >= pagination.totalPages : !table.getCanNextPage()}
          >
            Selanjutnya
          </Button>
        </div>
      </div>
    </div>
  )
}
