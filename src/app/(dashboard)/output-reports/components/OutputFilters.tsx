"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VerificationStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface OutputFiltersProps {
  statusFilter: string;
  monthFilter: string;
  onStatusFilterChange: (val: string) => void;
  onMonthFilterChange: (val: string) => void;
  onResetFilters?: () => void;
}

export function OutputFilters({
  statusFilter,
  monthFilter,
  onStatusFilterChange,
  onMonthFilterChange,
  onResetFilters,
}: OutputFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[180px] h-9 cursor-pointer">
          <SelectValue placeholder="Filter Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL" className="cursor-pointer">Semua Status</SelectItem>
          <SelectItem value={VerificationStatus.DRAFT} className="cursor-pointer">Draft</SelectItem>
          <SelectItem value={VerificationStatus.PENDING} className="cursor-pointer">Pending</SelectItem>
          <SelectItem value={VerificationStatus.APPROVED} className="cursor-pointer">Disetujui</SelectItem>
          <SelectItem value={VerificationStatus.REJECTED} className="cursor-pointer">Ditolak</SelectItem>
        </SelectContent>
      </Select>

      <Select value={monthFilter} onValueChange={onMonthFilterChange}>
        <SelectTrigger className="w-[180px] h-9 cursor-pointer">
          <SelectValue placeholder="Filter Bulan Laporan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL" className="cursor-pointer">Semua Bulan</SelectItem>
          <SelectItem value="0" className="cursor-pointer">Data Awal</SelectItem>
          <SelectItem value="1" className="cursor-pointer">Bulan 1</SelectItem>
          <SelectItem value="2" className="cursor-pointer">Bulan 2</SelectItem>
          <SelectItem value="3" className="cursor-pointer">Bulan 3</SelectItem>
        </SelectContent>
      </Select>

      {onResetFilters && (
        <Button
          variant="outline"
          onClick={onResetFilters}
          className="h-9 px-2 lg:px-3 text-muted-foreground hover:text-foreground gap-1.5 border-dashed"
          title="Bersihkan semua filter"
        >
          <X className="h-4 w-4" />
          Bersihkan Filter
        </Button>
      )}
    </div>
  );
}
