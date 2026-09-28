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

interface LogbookFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onResetFilters?: () => void;
}

export function LogbookFilters({
  statusFilter,
  onStatusFilterChange,
  onResetFilters,
}: LogbookFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[180px] h-9 cursor-pointer">
          <SelectValue placeholder="Filter Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL" className="cursor-pointer">Semua Status</SelectItem>
          <SelectItem value={VerificationStatus.PENDING} className="cursor-pointer">Pending</SelectItem>
          <SelectItem value={VerificationStatus.APPROVED} className="cursor-pointer">Disetujui</SelectItem>
          <SelectItem value={VerificationStatus.REJECTED} className="cursor-pointer">Ditolak</SelectItem>
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
