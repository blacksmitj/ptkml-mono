"use client";

import * as React from "react";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export interface ApplicantsPaginationProps {
  table: Table<any>;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  setPage?: (page: number) => void;
  setLimit?: (limit: number) => void;
}

export function ApplicantsPagination({
  table,
  pagination,
  setPage,
  setLimit,
}: ApplicantsPaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
      <div className="flex-1 text-sm text-muted-foreground">
        Total{" "}
        {pagination
          ? pagination.total
          : table.getFilteredRowModel().rows.length}{" "}
        peserta
      </div>
      <div className="flex flex-wrap items-center gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Baris per halaman</p>
          <Select
            value={`${pagination ? pagination.limit : table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              if (pagination && setLimit && setPage) {
                setLimit(Number(value));
                setPage(1);
              } else {
                table.setPageSize(Number(value));
              }
            }}
          >
            <SelectTrigger className="h-8 w-17.5">
              <SelectValue
                placeholder={
                  pagination
                    ? pagination.limit
                    : table.getState().pagination.pageSize
                }
              />
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
          Halaman{" "}
          {pagination
            ? pagination.page
            : table.getState().pagination.pageIndex + 1}{" "}
          dari {pagination ? pagination.totalPages : table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => {
              if (pagination && setPage) {
                setPage(1);
              } else {
                table.setPageIndex(0);
              }
            }}
            disabled={
              pagination ? pagination.page <= 1 : !table.getCanPreviousPage()
            }
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => {
              if (pagination && setPage) {
                setPage(pagination.page - 1);
              } else {
                table.previousPage();
              }
            }}
            disabled={
              pagination ? pagination.page <= 1 : !table.getCanPreviousPage()
            }
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => {
              if (pagination && setPage) {
                setPage(pagination.page + 1);
              } else {
                table.nextPage();
              }
            }}
            disabled={
              pagination
                ? pagination.page >= pagination.totalPages
                : !table.getCanNextPage()
            }
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => {
              if (pagination && setPage) {
                setPage(pagination.totalPages);
              } else {
                table.setPageIndex(table.getPageCount() - 1);
              }
            }}
            disabled={
              pagination
                ? pagination.page >= pagination.totalPages
                : !table.getCanNextPage()
            }
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
