"use client";

import * as React from "react";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  SlidersHorizontal,
  X,
  Filter,
  Loader2,
} from "lucide-react";
import {
  ApplicantStatus,
  CommunicationStatus,
  PresenceStatus,
  Willingness,
  FundDisbursement,
} from "@/types";

export interface ApplicantsToolbarProps {
  table: Table<any>;
  search?: string;
  setSearch?: (search: string) => void;
  showLoading?: boolean;
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
  setPage?: (page: number) => void;
  onResetFilters?: () => void;
  universities?: Array<{ id: string; name: string }>;
}

export function ApplicantsToolbar({
  table,
  search,
  setSearch,
  showLoading = false,
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
  setPage,
  onResetFilters,
  universities,
}: ApplicantsToolbarProps) {
  const handleReset = () => {
    if (onResetFilters) {
      onResetFilters();
    } else {
      if (setStatus) setStatus("ALL");
      if (setUniversityId) setUniversityId("ALL");
      if (setMentorStatus) setMentorStatus("ALL");
      if (setCommunicationStatus) setCommunicationStatus("ALL");
      if (setPresenceStatus) setPresenceStatus("ALL");
      if (setWillingness) setWillingness("ALL");
      if (setFundDisbursement) setFundDisbursement("ALL");
      if (setSearch) setSearch("");
      if (setPage) setPage(1);
    }
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    table.resetColumnFilters();
  };

  const advancedActiveCount = [
    mentorStatus && mentorStatus !== "ALL",
    communicationStatus && communicationStatus !== "ALL",
    presenceStatus && presenceStatus !== "ALL",
    willingness && willingness !== "ALL",
    fundDisbursement && fundDisbursement !== "ALL",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {/* Search Input */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama peserta..."
            value={
              search !== undefined
                ? search
                : ((table.getColumn("name")?.getFilterValue() as string) ?? "")
            }
            onChange={(event) => {
              if (setSearch) {
                setSearch(event.target.value);
              } else {
                table.getColumn("name")?.setFilterValue(event.target.value);
              }
            }}
            className={`pl-8 ${showLoading ? "pr-8" : ""}`}
          />
          {showLoading && (
            <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Status Filter (Bahasa Indonesia) */}
        <Select
          value={status ?? "ALL"}
          onValueChange={(value) => {
            if (setStatus) {
              setStatus(value);
              if (setPage) setPage(1);
            }
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua Status Peserta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Status Peserta</SelectItem>
            <SelectItem value={ApplicantStatus.ACTIVE}>Aktif</SelectItem>
            <SelectItem value={ApplicantStatus.PENDING}>Menunggu</SelectItem>
            <SelectItem value={ApplicantStatus.DROPPED}>
              Dikeluarkan / Batal
            </SelectItem>
          </SelectContent>
        </Select>

        {/* University Filter */}
        <Select
          value={universityId ?? "ALL"}
          onValueChange={(value) => {
            if (setUniversityId) {
              setUniversityId(value);
              if (setPage) setPage(1);
            }
          }}
        >
          <SelectTrigger className="w-52 truncate">
            <SelectValue placeholder="Semua Universitas" />
          </SelectTrigger>
          <SelectContent className="max-h-75">
            <SelectItem value="ALL">Semua Universitas</SelectItem>
            {universities?.map((univ) => (
              <SelectItem key={univ.id} value={univ.id}>
                {univ.name}
              </SelectItem>
            ))}
            <SelectItem value="unassigned">Belum Dibagikan</SelectItem>
          </SelectContent>
        </Select>

        {/* Tombol Filter Lengkap (Popover) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={advancedActiveCount > 0 ? "default" : "outline"}
              className="h-9 gap-1.5"
            >
              <Filter className="h-4 w-4" />
              <span>Filter Lengkap</span>
              {advancedActiveCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 rounded-full px-1.5 py-0 text-[11px] font-bold bg-white/20 text-current"
                >
                  {advancedActiveCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 space-y-4" align="start">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-semibold text-sm">Filter Status & Pendamping</h4>
              {advancedActiveCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    if (setMentorStatus) setMentorStatus("ALL");
                    if (setCommunicationStatus) setCommunicationStatus("ALL");
                    if (setPresenceStatus) setPresenceStatus("ALL");
                    if (setWillingness) setWillingness("ALL");
                    if (setFundDisbursement) setFundDisbursement("ALL");
                    if (setPage) setPage(1);
                  }}
                >
                  Reset
                </Button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              {/* Status Pendamping / Mentor */}
              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground block">
                  Status Pendamping
                </label>
                <Select
                  value={mentorStatus ?? "ALL"}
                  onValueChange={(val) => {
                    if (setMentorStatus) {
                      setMentorStatus(val);
                      if (setPage) setPage(1);
                    }
                  }}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Semua Status Pendamping" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Status Pendamping</SelectItem>
                    <SelectItem value="ASSIGNED">
                      Sudah Memiliki Pendamping
                    </SelectItem>
                    <SelectItem value="UNASSIGNED">
                      Belum Memiliki Pendamping
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Komunikasi */}
              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground block">
                  Status Komunikasi
                </label>
                <Select
                  value={communicationStatus ?? "ALL"}
                  onValueChange={(val) => {
                    if (setCommunicationStatus) {
                      setCommunicationStatus(val);
                      if (setPage) setPage(1);
                    }
                  }}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Semua Status Komunikasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Status Komunikasi</SelectItem>
                    <SelectItem value={CommunicationStatus.RESPONDED}>
                      Merespon
                    </SelectItem>
                    <SelectItem value={CommunicationStatus.NO_RESPONSE}>
                      Tidak Merespon
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Keberadaan */}
              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground block">
                  Keberadaan Usaha / Tempat
                </label>
                <Select
                  value={presenceStatus ?? "ALL"}
                  onValueChange={(val) => {
                    if (setPresenceStatus) {
                      setPresenceStatus(val);
                      if (setPage) setPage(1);
                    }
                  }}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Semua Status Keberadaan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Status Keberadaan</SelectItem>
                    <SelectItem value={PresenceStatus.FOUND}>
                      Sesuai Alamat
                    </SelectItem>
                    <SelectItem value={PresenceStatus.NOT_FOUND}>
                      Tidak Ditemukan
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Kesediaan */}
              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground block">
                  Kesediaan Dampingan
                </label>
                <Select
                  value={willingness ?? "ALL"}
                  onValueChange={(val) => {
                    if (setWillingness) {
                      setWillingness(val);
                      if (setPage) setPage(1);
                    }
                  }}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Semua Status Kesediaan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Status Kesediaan</SelectItem>
                    <SelectItem value={Willingness.WILLING}>Bersedia</SelectItem>
                    <SelectItem value={Willingness.NOT_WILLING}>
                      Tidak Bersedia
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Pencairan Dana */}
              <div className="space-y-1.5">
                <label className="font-medium text-muted-foreground block">
                  Pencairan Dana Bantuan
                </label>
                <Select
                  value={fundDisbursement ?? "ALL"}
                  onValueChange={(val) => {
                    if (setFundDisbursement) {
                      setFundDisbursement(val);
                      if (setPage) setPage(1);
                    }
                  }}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Semua Status Pencairan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Status Pencairan</SelectItem>
                    <SelectItem value={FundDisbursement.DISBURSED}>
                      Sudah Cair
                    </SelectItem>
                    <SelectItem value={FundDisbursement.NOT_DISBURSED}>
                      Belum Cair
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

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
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id === "name"
                      ? "Nama"
                      : column.id === "mentorName"
                        ? "Mentor & Universitas"
                        : column.id === "mentoringCount"
                          ? "Kunjungan"
                          : column.id === "revenueChangePercentage"
                            ? "Tren Omset"
                            : column.id === "status"
                              ? "Status (Badge)"
                              : column.id === "communicationStatus"
                                ? "Status Komunikasi"
                                : column.id === "willingness"
                                  ? "Kesediaan Pendampingan"
                                  : column.id === "presenceStatus"
                                    ? "Status Keberadaan"
                                    : column.id === "fundDisbursement"
                                      ? "Penyaluran Dana"
                                      : column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
