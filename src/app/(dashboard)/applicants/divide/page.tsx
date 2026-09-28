"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
  Users,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Trash,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useDivideApplicants, DivideApplicantItem } from "@/hooks/use-divide-applicants";
import { useUniversities } from "@/hooks/use-universities";
import { useAppStore } from "@/store/use-app-store";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { divideApplicantsKeys, applicantsKeys } from "@/lib/query-keys";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";

interface ApplicantRowProps {
  applicant: DivideApplicantItem;
  universities?: Array<{ id: string; name: string }>;
  isSelected: boolean;
  onToggleSelect: (idTkm: string) => void;
  onAssign: (idTkm: string, universityId: string) => void;
  isUpdating: boolean;
}

const ApplicantRow = React.memo(function ApplicantRow({
  applicant,
  universities,
  isSelected,
  onToggleSelect,
  onAssign,
  isUpdating,
}: ApplicantRowProps) {
  const currentUnivName = applicant.university?.name;
  const isUnassigned = !applicant.universityId;

  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell className="text-center">
        {applicant.idTkm && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(applicant.idTkm as string)}
            aria-label={`Pilih ${applicant.profile?.name}`}
          />
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <UserAvatar name={applicant.profile?.name || ""} src={applicant.profile?.photo} />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-mono text-muted-foreground truncate">
              {applicant.idTkm || "-"}
            </span>
            <span className="font-semibold text-foreground truncate">
              {applicant.profile?.name || "N/A"}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {applicant.profile?.nik || "-"}
      </TableCell>
      <TableCell>
        {isUnassigned ? (
          <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-none">
            Belum Dibagikan
          </Badge>
        ) : (
          <Badge variant="secondary" className="max-w-[200px] truncate block" title={currentUnivName}>
            {currentUnivName}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end items-center gap-2">
          <Select
            value={applicant.universityId || ""}
            onValueChange={(val) => applicant.idTkm && onAssign(applicant.idTkm, val)}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Alokasikan..." />
            </SelectTrigger>
            <SelectContent>
              {applicant.universityId && (
                <SelectItem value="unassigned" className="text-destructive font-medium">
                  -- Batal Alokasi --
                </SelectItem>
              )}
              {universities?.map((univ) => (
                <SelectItem key={univ.id} value={univ.id}>
                  {univ.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </TableCell>
    </TableRow>
  );
});

export default function DivideApplicantsPage() {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentRole = useAppStore((state) => state.currentRole);
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [filterStatus, setFilterStatus] = useState<"all" | "assigned" | "unassigned">("all");
  const [selectedUniversityForBulk, setSelectedUniversityForBulk] = useState<string>("");
  const [selectedIdTkms, setSelectedIdTkms] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Fetch lightweight paginated applicants
  const { data: divideData, isLoading: isLoadingApplicants } = useDivideApplicants({
    workspaceId: currentWorkspaceId || undefined,
    page,
    limit,
    search: debouncedSearch,
    filterStatus,
  });

  const { data: universities, isLoading: isLoadingUniversities } = useUniversities({
    workspaceId: currentWorkspaceId || undefined,
  });

  // Redirect or deny access if workspace supervisor
  if (currentRole === "WORKSPACE_SUPERVISOR") {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold text-destructive">Akses Ditolak</h1>
        <p className="text-muted-foreground">Pengawas Workspace tidak diizinkan membagi peserta (Read-Only).</p>
      </div>
    );
  }

  const applicantsList = divideData?.data || [];
  const pagination = divideData?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.total || 0;

  // Handle single selection
  const toggleSelect = (idTkm: string) => {
    setSelectedIdTkms((prev) => {
      const next = new Set(prev);
      if (next.has(idTkm)) {
        next.delete(idTkm);
      } else {
        next.add(idTkm);
      }
      return next;
    });
  };

  // Handle select all currently displayed page rows
  const toggleSelectAll = () => {
    const currentPageIds = applicantsList.map((a) => a.idTkm).filter(Boolean) as string[];
    const isAllPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIdTkms.has(id));

    setSelectedIdTkms((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        currentPageIds.forEach((id) => next.delete(id));
      } else {
        currentPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Handle Single Allocation
  const handleSingleAssign = async (idTkm: string, universityId: string) => {
    setIsUpdating(idTkm);
    const targetUnivId = universityId === "unassigned" ? null : universityId;
    try {
      await apiClient.post("/applicants/divide", {
        allocations: [{ idTkm, universityId: targetUnivId }],
      });
      toast.success(targetUnivId ? "Alokasi berhasil diperbarui" : "Alokasi berhasil dibatalkan");
      queryClient.invalidateQueries({ queryKey: divideApplicantsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: applicantsKeys.lists() });
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Gagal mengalokasikan peserta");
    } finally {
      setIsUpdating(null);
    }
  };

  // Handle Bulk Allocation
  const handleBulkAssign = async () => {
    if (selectedIdTkms.size === 0) {
      toast.error("Pilih setidaknya satu peserta");
      return;
    }
    if (!selectedUniversityForBulk) {
      toast.error("Pilih universitas tujuan alokasi");
      return;
    }

    setIsUpdating("bulk");
    try {
      const allocations = Array.from(selectedIdTkms).map((idTkm) => ({
        idTkm,
        universityId: selectedUniversityForBulk,
      }));

      const { data } = await apiClient.post("/applicants/divide", { allocations });
      toast.success(`Berhasil mengalokasikan ${data.count} peserta`);
      setSelectedIdTkms(new Set());
      setSelectedUniversityForBulk("");
      queryClient.invalidateQueries({ queryKey: divideApplicantsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: applicantsKeys.lists() });
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Gagal melakukan alokasi massal");
    } finally {
      setIsUpdating(null);
    }
  };

  // Handle Bulk Deallocation
  const handleBulkDeallocate = async () => {
    if (selectedIdTkms.size === 0) {
      toast.error("Pilih setidaknya satu peserta");
      return;
    }

    setIsUpdating("bulk-deallocate");
    try {
      const allocations = Array.from(selectedIdTkms).map((idTkm) => ({
        idTkm,
        universityId: null,
      }));

      const { data } = await apiClient.post("/applicants/divide", { allocations });
      toast.success(`Berhasil membatalkan alokasi ${data.count} peserta`);
      setSelectedIdTkms(new Set());
      queryClient.invalidateQueries({ queryKey: divideApplicantsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: applicantsKeys.lists() });
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "Gagal membatalkan alokasi massal");
    } finally {
      setIsUpdating(null);
    }
  };

  const isAllSelected =
    applicantsList.length > 0 &&
    applicantsList.every((a) => a.idTkm && selectedIdTkms.has(a.idTkm));

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-md">
              <Link href="/applicants">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground font-medium">Kembali ke Daftar Peserta</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Bagi Peserta ke Universitas</h1>
          <p className="text-muted-foreground mt-1">
            Alokasikan peserta TKML secara manual (individu/massal) atau gunakan impor Excel.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 rounded-xl" asChild>
            <Link href="/applicants/divide/import">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Impor via Excel
            </Link>
          </Button>
        </div>
      </div>

      {/* Bulk Action Controls */}
      <Card className="border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Alokasi Massal (Bulk Assign)</CardTitle>
              <CardDescription>
                Pilih beberapa peserta di bawah, pilih universitas, lalu klik tombol alokasi.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-end md:items-center">
          <div className="w-full md:w-auto flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              {selectedIdTkms.size} terpilih
            </span>
          </div>
          <div className="flex-1 w-full flex flex-col md:flex-row gap-3">
            <Select
              value={selectedUniversityForBulk}
              onValueChange={setSelectedUniversityForBulk}
              disabled={selectedIdTkms.size === 0 || isUpdating !== null}
            >
              <SelectTrigger className="w-full md:max-w-xs">
                <SelectValue placeholder="Pilih universitas tujuan..." />
              </SelectTrigger>
              <SelectContent>
                {universities?.map((univ) => (
                  <SelectItem key={univ.id} value={univ.id}>
                    {univ.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleBulkAssign}
              disabled={selectedIdTkms.size === 0 || !selectedUniversityForBulk || isUpdating !== null}
              className="gap-2"
            >
              {isUpdating === "bulk" ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Mengalokasikan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Alokasikan Terpilih
                </>
              )}
            </Button>

            <Button
              onClick={handleBulkDeallocate}
              disabled={selectedIdTkms.size === 0 || isUpdating !== null}
              variant="outline"
              className="gap-2 text-destructive hover:bg-destructive/10 border-destructive/25"
            >
              {isUpdating === "bulk-deallocate" ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-destructive" />
                  Membatalkan...
                </>
              ) : (
                <>
                  <Trash className="h-4 w-4 text-destructive" />
                  Batal Alokasi Terpilih
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main List */}
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, NIK, atau ID TKM..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8"
            />
          </div>

          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={filterStatus}
              onValueChange={(val) => {
                setFilterStatus(val as any);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter status alokasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="unassigned">Belum Dibagikan</SelectItem>
                <SelectItem value="assigned">Sudah Dibagikan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[50px] text-center">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Pilih semua di halaman ini"
                  />
                </TableHead>
                <TableHead className="w-[200px]">ID TKM / Nama</TableHead>
                <TableHead className="w-[180px]">NIK</TableHead>
                <TableHead className="w-[220px]">Universitas Saat Ini</TableHead>
                <TableHead className="w-[250px] text-right">Alokasikan Manual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingApplicants || isLoadingUniversities ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-9 w-40 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : applicantsList.length > 0 ? (
                applicantsList.map((applicant) => (
                  <ApplicantRow
                    key={applicant.id}
                    applicant={applicant}
                    universities={universities}
                    isSelected={Boolean(applicant.idTkm && selectedIdTkms.has(applicant.idTkm))}
                    onToggleSelect={toggleSelect}
                    onAssign={handleSingleAssign}
                    isUpdating={isUpdating !== null}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Tidak ada peserta ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <div className="text-sm text-muted-foreground">
            Menampilkan{" "}
            <span className="font-medium">
              {totalRecords > 0 ? (page - 1) * limit + 1 : 0}
            </span>{" "}
            sampai{" "}
            <span className="font-medium">
              {Math.min(page * limit, totalRecords)}
            </span>{" "}
            dari <span className="font-medium">{totalRecords}</span> peserta
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Baris per hal:</span>
              <Select
                value={String(limit)}
                onValueChange={(val) => {
                  setLimit(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={String(limit)} />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs font-medium">
              Hal {page} dari {totalPages}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(1)}
                disabled={page <= 1 || isLoadingApplicants}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoadingApplicants}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoadingApplicants}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages || isLoadingApplicants}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
