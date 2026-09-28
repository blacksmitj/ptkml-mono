"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/use-app-store";
import { useMe } from "@/hooks/use-me";
import { useMembers } from "@/hooks/use-members";
import { useUniversities } from "@/hooks/use-universities";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FileText,
  School,
  Briefcase,
  Download,
  ArrowRight,
  Sparkles,
  Filter,
  ChevronsUpDown,
  Check,
  Users,
  Loader2,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { exportMentorsToExcel } from "@/lib/excel";
import { downloadLogbooksExcel } from "../logbooks/lib/excel";
import { downloadOutputReportsExcel } from "../output-reports/lib/excel";
import { RtlExportCard } from "./components/RtlExportCard";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function ReportsHubPage() {
  const currentRole = useAppStore((state) => state.currentRole);
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentUserId = useAppStore((state) => state.currentUserId);
  const contextUniversityId = useAppStore((state) => state.universityId);

  const { data: me } = useMe();
  const { data: membersData, isLoading: isLoadingMembers } = useMembers({
    workspaceId: currentWorkspaceId || undefined,
  });
  const { data: universities, isLoading: isLoadingUniversities } = useUniversities();

  const members = useMemo(() => {
    return membersData?.data || (Array.isArray(membersData) ? membersData : []);
  }, [membersData]);

  // Active user's workspace membership
  const activeMembership = useMemo(() => {
    if (!members.length || !currentUserId) return null;
    return members.find((m: any) => m.userId === currentUserId) || null;
  }, [members, currentUserId]);

  const effectiveUniversityId = activeMembership?.universityId || contextUniversityId;

  const isMentor = currentRole === "MENTOR";
  const isUnivUser = currentRole === "UNIVERSITY_ADMIN" || currentRole === "UNIVERSITY_SUPERVISOR";
  const isGlobalAdmin = currentRole === "SUPER_ADMIN" || currentRole === "WORKSPACE_SUPERVISOR";

  // --- STATE UNTUK EKSPOR DAFTAR PENDAMPING ---
  const [exportMentorUnivId, setExportMentorUnivId] = useState<string>("ALL");
  const [exportMentorStatus, setExportMentorStatus] = useState<string>("ALL");
  const [isExportingMentors, setIsExportingMentors] = useState(false);
  const [openExportUnivSelect, setOpenExportUnivSelect] = useState(false);

  // --- STATE UNTUK EKSPOR LOGBOOK HARIAN ---
  const [exportLogbookStatus, setExportLogbookStatus] = useState<string>("ALL");
  const [exportLogbookDateMode, setExportLogbookDateMode] = useState<"ALL" | "CUSTOM">("ALL");
  const [exportLogbookStartDate, setExportLogbookStartDate] = useState<string>("");
  const [exportLogbookEndDate, setExportLogbookEndDate] = useState<string>("");
  const [isExportingLogbooks, setIsExportingLogbooks] = useState(false);

  // --- STATE UNTUK EKSPOR CAPAIAN OUTPUT ---
  const [exportOutputStatus, setExportOutputStatus] = useState<string>("ALL");
  const [exportOutputMonth, setExportOutputMonth] = useState<string>("ALL");
  const [isExportingOutputs, setIsExportingOutputs] = useState(false);

  // --- STATE UNTUK LAPORAN PENDAMPING ---
  const [mentorUnivId, setMentorUnivId] = useState<string>("");
  const [mentorMemberId, setMentorMemberId] = useState<string>("");

  // --- STATE UNTUK LAPORAN UNIVERSITAS ---
  const [univReportUnivId, setUnivReportUnivId] = useState<string>("");

  // --- STATE COMBOBOX OPEN ---
  const [openUnivSelect1, setOpenUnivSelect1] = useState(false);
  const [openMentorSelect, setOpenMentorSelect] = useState(false);
  const [openUnivSelect2, setOpenUnivSelect2] = useState(false);

  // Filter list pendamping keseluruhan
  const allMentors = useMemo(() => {
    return members.filter((m: any) => m.role === "MENTOR");
  }, [members]);

  // Universitas default untuk inisialisasi
  const defaultUnivId = useMemo(() => {
    return effectiveUniversityId || universities?.[0]?.id || "";
  }, [effectiveUniversityId, universities]);

  // Filter pendamping yang akan ditampilkan di dropdown Laporan Kinerja Pendamping
  const filteredMentorsForSelection = useMemo(() => {
    if (isUnivUser) {
      // Jika admin universitas, hanya tampilkan pendamping dari universitasnya
      return allMentors.filter((m: any) => m.universityId === effectiveUniversityId);
    }
    if (isGlobalAdmin) {
      // Jika global admin, filter berdasarkan universitas yang dipilih di kartu tersebut
      const selectedUniv = mentorUnivId || defaultUnivId;
      return allMentors.filter((m: any) => m.universityId === selectedUniv);
    }
    return [];
  }, [allMentors, isUnivUser, isGlobalAdmin, mentorUnivId, effectiveUniversityId, defaultUnivId]);

  // Target ID Laporan Pendamping
  const targetMentorId = useMemo(() => {
    if (isMentor) {
      return activeMembership?.id || "";
    }
    return mentorMemberId || filteredMentorsForSelection[0]?.id || "";
  }, [isMentor, activeMembership, mentorMemberId, filteredMentorsForSelection]);

  // Target ID Laporan Universitas
  const targetUnivId = useMemo(() => {
    if (isUnivUser) {
      return effectiveUniversityId || "";
    }
    return univReportUnivId || defaultUnivId || "";
  }, [isUnivUser, effectiveUniversityId, univReportUnivId, defaultUnivId]);

  // Handler ekspor data pendamping ke Excel
  const handleExportMentors = async () => {
    if (!currentWorkspaceId) {
      toast.error("Workspace ID tidak valid.");
      return;
    }

    try {
      setIsExportingMentors(true);

      const targetUniv = isUnivUser
        ? effectiveUniversityId
        : exportMentorUnivId !== "ALL"
        ? exportMentorUnivId
        : undefined;

      const params: Record<string, any> = {
        workspaceId: currentWorkspaceId,
        role: "MENTOR",
      };

      if (targetUniv) {
        params.universityId = targetUniv;
      }
      if (exportMentorStatus !== "ALL") {
        params.verificationStatus = exportMentorStatus;
      }

      const { data } = await apiClient.get("/members", { params });
      const mentorsList = Array.isArray(data) ? data : data?.data || [];

      if (mentorsList.length === 0) {
        toast.info("Tidak ada data pendamping yang sesuai dengan filter yang dipilih.");
        return;
      }

      const univName = isUnivUser
        ? universities?.find((u) => u.id === effectiveUniversityId)?.name || "Universitas"
        : exportMentorUnivId !== "ALL"
        ? universities?.find((u) => u.id === exportMentorUnivId)?.name
        : undefined;

      await exportMentorsToExcel(mentorsList, {
        universityName: univName,
        statusFilter: exportMentorStatus,
      });

      toast.success(`Berhasil mengunduh ${mentorsList.length} data pendamping.`);
    } catch (error: any) {
      console.error("Gagal mengunduh data pendamping:", error);
      toast.error(error?.response?.data?.error || "Gagal mengunduh data pendamping.");
    } finally {
      setIsExportingMentors(false);
    }
  };

  // Handler ekspor Logbook Harian ke Excel
  const handleExportLogbooks = async () => {
    if (!currentWorkspaceId) {
      toast.error("Workspace ID tidak valid.");
      return;
    }
    if (exportLogbookDateMode === "CUSTOM" && exportLogbookStartDate && exportLogbookEndDate) {
      if (new Date(exportLogbookStartDate) > new Date(exportLogbookEndDate)) {
        toast.error("Tanggal awal tidak boleh melebihi tanggal akhir.");
        return;
      }
    }
    try {
      setIsExportingLogbooks(true);
      await downloadLogbooksExcel({
        workspaceId: currentWorkspaceId,
        statusFilter: exportLogbookStatus,
        startDate: exportLogbookDateMode === "CUSTOM" && exportLogbookStartDate ? exportLogbookStartDate : undefined,
        endDate: exportLogbookDateMode === "CUSTOM" && exportLogbookEndDate ? exportLogbookEndDate : undefined,
        role: currentRole || undefined,
      });
      toast.success("Excel logbook harian berhasil diunduh.");
    } catch (error: any) {
      console.error("Gagal mendownload excel logbook:", error);
      toast.error(error?.response?.data?.error || "Gagal mendownload file Excel logbook.");
    } finally {
      setIsExportingLogbooks(false);
    }
  };

  // Handler ekspor Capaian Output ke Excel
  const handleExportOutputs = async () => {
    if (!currentWorkspaceId) {
      toast.error("Workspace ID tidak valid.");
      return;
    }
    try {
      setIsExportingOutputs(true);
      await downloadOutputReportsExcel({
        workspaceId: currentWorkspaceId,
        statusFilter: exportOutputStatus,
        monthFilter: exportOutputMonth,
        role: currentRole || undefined,
      });
      toast.success("Excel capaian output berhasil diunduh.");
    } catch (error: any) {
      console.error("Gagal mendownload excel capaian output:", error);
      toast.error(error?.response?.data?.error || "Gagal mendownload file Excel capaian output.");
    } finally {
      setIsExportingOutputs(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-12">
      {/* Header Section */}
      <div className="border-b pb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Download Center Laporan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Unduh dan cetak seluruh dokumen laporan kinerja secara realtime.
        </p>
      </div>

      {isLoadingMembers || isLoadingUniversities ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-60 w-full rounded-xl" />
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* CARD 1: LAPORAN KINERJA PENDAMPING */}
          <Card className="flex flex-col justify-between hover:shadow-md transition-shadow duration-200 border-border/80">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                  <Briefcase className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted border text-muted-foreground">
                  Individu Pendamping
                </span>
              </div>
              <CardTitle className="text-lg">1. Laporan Kinerja Pendamping</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Laporan hasil pendampingan harian, capaian KPI omzet/produksi, kendala TKM, logbook & dokumentasi kegiatan.
              </CardDescription>

              {/* Selector Section for Card 1 */}
              {!isMentor && (
                <div className="pt-3 border-t border-border/60 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Filter className="h-3.5 w-3.5" /> Pilih Target Laporan:
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Pilih Universitas (Hanya untuk Global Admin) */}
                    {isGlobalAdmin && universities && universities.length > 0 && (
                      <Field className="flex-1">
                        <FieldLabel className="text-[10px] font-semibold text-muted-foreground uppercase p-0 border-0 bg-transparent">Universitas</FieldLabel>
                        <Popover open={openUnivSelect1} onOpenChange={setOpenUnivSelect1}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openUnivSelect1}
                              className="w-full h-9 text-xs justify-between bg-background font-normal px-3"
                            >
                              <span className="truncate">
                                {universities.find((u) => u.id === (mentorUnivId || defaultUnivId))?.name || "Pilih Universitas"}
                              </span>
                              <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-70 p-0 z-50" align="start">
                            <Command>
                              <CommandInput placeholder="Cari Universitas..." className="h-8 text-xs" />
                              <CommandList className="max-h-60">
                                <CommandEmpty className="py-4 text-xs">Universitas tidak ditemukan.</CommandEmpty>
                                <CommandGroup>
                                  {universities.map((u) => (
                                    <CommandItem
                                      key={u.id}
                                      value={u.name}
                                      onSelect={() => {
                                        setMentorUnivId(u.id);
                                        setMentorMemberId(""); // Reset mentor selected
                                        setOpenUnivSelect1(false);
                                      }}
                                      className="text-xs cursor-pointer"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-3.5 w-3.5 text-primary",
                                          (mentorUnivId || defaultUnivId) === u.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <span className="truncate">{u.name}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </Field>
                    )}

                    {/* Pilih Pendamping (Untuk Global Admin & Universitas Admin) */}
                    <Field className="flex-1">
                      <FieldLabel className="text-[10px] font-semibold text-muted-foreground uppercase p-0 border-0 bg-transparent">Tenaga Pendamping</FieldLabel>
                      <Popover open={openMentorSelect} onOpenChange={setOpenMentorSelect}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openMentorSelect}
                            disabled={filteredMentorsForSelection.length === 0}
                            className="w-full h-9 text-xs justify-between bg-background font-normal px-3"
                          >
                            <span className="truncate">
                              {filteredMentorsForSelection.length === 0
                                ? "Tidak ada pendamping"
                                : filteredMentorsForSelection.find(
                                    (m: any) => m.id === (mentorMemberId || filteredMentorsForSelection[0]?.id)
                                  )?.user?.profile?.name ||
                                  filteredMentorsForSelection.find(
                                    (m: any) => m.id === (mentorMemberId || filteredMentorsForSelection[0]?.id)
                                  )?.user?.username ||
                                  "Pilih Pendamping"}
                            </span>
                            <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-75 p-0 z-50" align="start">
                          <Command>
                            <CommandInput placeholder="Cari Nama Pendamping..." className="h-8 text-xs" />
                            <CommandList className="max-h-60">
                              <CommandEmpty className="py-4 text-xs">Pendamping tidak ditemukan.</CommandEmpty>
                              <CommandGroup>
                                {filteredMentorsForSelection.map((m: any) => {
                                  const name = m.user?.profile?.name || m.user?.username || "Pendamping";
                                  const currentSelectedId = mentorMemberId || filteredMentorsForSelection[0]?.id;
                                  return (
                                    <CommandItem
                                      key={m.id}
                                      value={name}
                                      onSelect={() => {
                                        setMentorMemberId(m.id);
                                        setOpenMentorSelect(false);
                                      }}
                                      className="text-xs cursor-pointer flex items-center justify-between"
                                    >
                                      <div className="flex items-center truncate mr-2">
                                        <Check
                                          className={cn(
                                            "mr-2 h-3.5 w-3.5 shrink-0 text-primary",
                                            currentSelectedId === m.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <span className="truncate font-medium">{name}</span>
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </Field>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardFooter className="pt-2 flex justify-end">
              {!targetMentorId ? (
                <Button disabled className="w-fit ml-auto gap-2" variant="outline">
                  <span>Belum ada pendamping terpilih</span>
                  <Download className="h-4 w-4" />
                </Button>
              ) : (
                <Button asChild className="w-fit ml-auto gap-2 group" variant="default">
                  <Link href={`/reports/laporan-pendamping/${targetMentorId}`}>
                    <span>Buka & Cetak Laporan</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* CARD 2: REKAP LOGBOOK HARIAN */}
          <Card className="flex flex-col justify-between hover:shadow-md transition-shadow duration-200 border-border/80">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted border text-muted-foreground">
                  Aktivitas Harian
                </span>
              </div>
              <CardTitle className="text-lg">2. Rekap Logbook Harian</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Unduh seluruh rekapan aktivitas dan logbook harian pendampingan beserta status verifikasi, catatan, dan bukti biaya kegiatan (.xlsx).
              </CardDescription>

              {/* Filter Section */}
              <div className="pt-3 border-t border-border/60 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Filter className="h-3.5 w-3.5" /> Filter Logbook:
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Filter Status Verifikasi */}
                    <Field className="flex-1">
                      <FieldLabel className="text-[10px] font-semibold text-muted-foreground uppercase p-0 border-0 bg-transparent">
                        Status Verifikasi
                      </FieldLabel>
                      <Select value={exportLogbookStatus} onValueChange={setExportLogbookStatus}>
                        <SelectTrigger className="w-full h-9 text-xs bg-background">
                          <SelectValue placeholder="Semua Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL" className="text-xs">
                            Semua Status
                          </SelectItem>
                          <SelectItem value="APPROVED" className="text-xs">
                            Disetujui (Approved)
                          </SelectItem>
                          <SelectItem value="PENDING" className="text-xs">
                            Menunggu Verifikasi
                          </SelectItem>
                          <SelectItem value="REJECTED" className="text-xs">
                            Ditolak
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    {/* Filter Mode Tanggal: Semua vs Pilih Tanggal */}
                    <Field className="w-full sm:w-[170px]">
                      <FieldLabel className="text-[10px] font-semibold text-muted-foreground uppercase p-0 border-0 bg-transparent">
                        Periode Tanggal
                      </FieldLabel>
                      <Select
                        value={exportLogbookDateMode}
                        onValueChange={(val: "ALL" | "CUSTOM") => setExportLogbookDateMode(val)}
                      >
                        <SelectTrigger className="w-full h-9 text-xs bg-background">
                          <SelectValue placeholder="Semua Tanggal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL" className="text-xs">
                            Semua Tanggal
                          </SelectItem>
                          <SelectItem value="CUSTOM" className="text-xs">
                            Pilih Rentang Tanggal
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {/* Input Date Picker jika memilih Rentang Tanggal */}
                  {exportLogbookDateMode === "CUSTOM" && (
                    <div className="flex flex-col sm:flex-row items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/60">
                      <Field className="flex-1 w-full">
                        <FieldLabel className="text-[10px] font-semibold text-muted-foreground uppercase p-0 border-0 bg-transparent mb-1">
                          Tanggal Awal
                        </FieldLabel>
                        <DatePicker
                          value={exportLogbookStartDate}
                          onChange={setExportLogbookStartDate}
                          placeholder="Pilih tgl awal"
                          className="w-full h-8 text-xs bg-background"
                        />
                      </Field>
                      <span className="hidden sm:inline text-xs text-muted-foreground mt-4">-</span>
                      <Field className="flex-1 w-full">
                        <FieldLabel className="text-[10px] font-semibold text-muted-foreground uppercase p-0 border-0 bg-transparent mb-1">
                          Tanggal Akhir
                        </FieldLabel>
                        <DatePicker
                          value={exportLogbookEndDate}
                          onChange={setExportLogbookEndDate}
                          minDate={exportLogbookStartDate || undefined}
                          placeholder="Pilih tgl akhir"
                          className="w-full h-8 text-xs bg-background"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardFooter className="pt-2 flex justify-end">
              <Button
                onClick={handleExportLogbooks}
                disabled={isExportingLogbooks}
                className="w-fit ml-auto gap-2 group bg-amber-600 hover:bg-amber-700 text-white"
              >
                <span className="flex items-center gap-2">
                  {isExportingLogbooks ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Mengunduh logbook...</span>
                    </>
                  ) : (
                    <span>Unduh Logbook Harian (.xlsx)</span>
                  )}
                </span>
                <Download className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
              </Button>
            </CardFooter>
          </Card>

          {/* CARD 3: REKAP CAPAIAN OUTPUT BULANAN */}
          <Card className="flex flex-col justify-between hover:shadow-md transition-shadow duration-200 border-border/80">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted border text-muted-foreground">
                  Progres Output B0 - B3
                </span>
              </div>
              <CardTitle className="text-lg">3. Rekap Capaian Output Bulanan</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Unduh rekap perkembangan omzet, volume produksi, area pemasaran, dan status pembukuan TKM Binaan per periode (.xlsx).
              </CardDescription>

              {/* Filter Section */}
              <div className="pt-3 border-t border-border/60 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Filter className="h-3.5 w-3.5" /> Filter Capaian Output:
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Filter Periode Bulan */}
                  <Field className="flex-1">
                    <FieldLabel className="text-[10px] font-semibold text-muted-foreground uppercase p-0 border-0 bg-transparent">
                      Bulan Laporan
                    </FieldLabel>
                    <Select value={exportOutputMonth} onValueChange={setExportOutputMonth}>
                      <SelectTrigger className="w-full h-9 text-xs bg-background">
                        <SelectValue placeholder="Semua Periode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL" className="text-xs">
                          Semua Periode
                        </SelectItem>
                        <SelectItem value="0" className="text-xs">
                          Bulan 0 (Data Awal)
                        </SelectItem>
                        <SelectItem value="1" className="text-xs">
                          Bulan 1
                        </SelectItem>
                        <SelectItem value="2" className="text-xs">
                          Bulan 2
                        </SelectItem>
                        <SelectItem value="3" className="text-xs">
                          Bulan 3
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Filter Status Verifikasi */}
                  <Field className="flex-1">
                    <FieldLabel className="text-[10px] font-semibold text-muted-foreground uppercase p-0 border-0 bg-transparent">
                      Status Verifikasi
                    </FieldLabel>
                    <Select value={exportOutputStatus} onValueChange={setExportOutputStatus}>
                      <SelectTrigger className="w-full h-9 text-xs bg-background">
                        <SelectValue placeholder="Semua Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL" className="text-xs">
                          Semua Status
                        </SelectItem>
                        <SelectItem value="APPROVED" className="text-xs">
                          Disetujui (Approved)
                        </SelectItem>
                        <SelectItem value="PENDING" className="text-xs">
                          Menunggu Verifikasi
                        </SelectItem>
                        <SelectItem value="DRAFT" className="text-xs">
                          Draft Mentor
                        </SelectItem>
                        <SelectItem value="REJECTED" className="text-xs">
                          Ditolak
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            </CardHeader>

            <CardFooter className="pt-2 flex justify-end">
              <Button
                onClick={handleExportOutputs}
                disabled={isExportingOutputs}
                className="w-fit ml-auto gap-2 group bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <span className="flex items-center gap-2">
                  {isExportingOutputs ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Mengunduh output...</span>
                    </>
                  ) : (
                    <span>Unduh Capaian Output (.xlsx)</span>
                  )}
                </span>
                <Download className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
              </Button>
            </CardFooter>
          </Card>

          {/* CARD 4: REKAP RENCANA TINDAK LANJUT (RTL) */}
          <RtlExportCard
            workspaceId={currentWorkspaceId || undefined}
            cardNumber={4}
          />

          {/* CARD 5: DAFTAR TENAGA PENDAMPING (Hanya untuk Admin & Supervisor) */}
          {!isMentor && (
            <Card className="flex flex-col justify-between hover:shadow-md transition-shadow duration-200 border-border/80">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                    <Users className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted border text-muted-foreground">
                    Master Data Pendamping
                  </span>
                </div>
                <CardTitle className="text-lg">5. Daftar Tenaga Pendamping</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Unduh rekapan profil lengkap tenaga pendamping (identitas, kontak, perguruan tinggi, alamat domisili lengkap, dan jumlah UMKM binaan) dalam format Excel (.xlsx).
                </CardDescription>

                {/* Filter Section */}
                <div className="pt-3 border-t border-border/60 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Filter className="h-3.5 w-3.5" /> Cakupan Data:
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Filter Universitas (Global Admin bisa pilih, Univ User terkunci) */}
                    <Field className="flex-1">
                      <FieldLabel className="text-[10px] font-semibold text-muted-foreground uppercase p-0 border-0 bg-transparent">
                        Universitas / Lembaga
                      </FieldLabel>
                      {isGlobalAdmin ? (
                        <Popover open={openExportUnivSelect} onOpenChange={setOpenExportUnivSelect}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openExportUnivSelect}
                              className="w-full h-9 text-xs justify-between bg-background font-normal px-3"
                            >
                              <span className="truncate">
                                {exportMentorUnivId === "ALL"
                                  ? "Semua Universitas"
                                  : universities?.find((u) => u.id === exportMentorUnivId)?.name || "Pilih Universitas"}
                              </span>
                              <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-70 p-0 z-50" align="start">
                            <Command>
                              <CommandInput placeholder="Cari Universitas..." className="h-8 text-xs" />
                              <CommandList className="max-h-60">
                                <CommandEmpty className="py-4 text-xs">Universitas tidak ditemukan.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="Semua Universitas"
                                    onSelect={() => {
                                      setExportMentorUnivId("ALL");
                                      setOpenExportUnivSelect(false);
                                    }}
                                    className="text-xs cursor-pointer font-medium"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-3.5 w-3.5 text-primary",
                                        exportMentorUnivId === "ALL" ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span>Semua Universitas (Seluruhnya)</span>
                                  </CommandItem>
                                  {universities?.map((u) => (
                                    <CommandItem
                                      key={u.id}
                                      value={u.name}
                                      onSelect={() => {
                                        setExportMentorUnivId(u.id);
                                        setOpenExportUnivSelect(false);
                                      }}
                                      className="text-xs cursor-pointer"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-3.5 w-3.5 text-primary",
                                          exportMentorUnivId === u.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <span className="truncate">{u.name}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="flex items-center h-9 px-3 rounded-md border bg-muted/40 text-xs font-medium text-foreground truncate">
                          <School className="h-3.5 w-3.5 mr-2 shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {universities?.find((u) => u.id === effectiveUniversityId)?.name || "Universitas Anda"}
                          </span>
                        </div>
                      )}
                    </Field>

                    {/* Filter Status Verifikasi */}
                    <Field className="w-full sm:w-[160px]">
                      <FieldLabel className="text-[10px] font-semibold text-muted-foreground uppercase p-0 border-0 bg-transparent">
                        Status Verifikasi
                      </FieldLabel>
                      <Select value={exportMentorStatus} onValueChange={setExportMentorStatus}>
                        <SelectTrigger className="w-full h-9 text-xs bg-background">
                          <SelectValue placeholder="Semua Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL" className="text-xs">
                            Semua Status
                          </SelectItem>
                          <SelectItem value="APPROVED" className="text-xs">
                            Aktif (Approved)
                          </SelectItem>
                          <SelectItem value="PENDING" className="text-xs">
                            Menunggu Verifikasi
                          </SelectItem>
                          <SelectItem value="REJECTED" className="text-xs">
                            Ditolak
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>
              </CardHeader>

              <CardFooter className="pt-2 flex justify-end">
                <Button
                  onClick={handleExportMentors}
                  disabled={isExportingMentors}
                  className="w-fit ml-auto gap-2 group bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <span className="flex items-center gap-2">
                    {isExportingMentors ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Mengekspor data...</span>
                      </>
                    ) : (
                      <span>Unduh Daftar Pendamping (.xlsx)</span>
                    )}
                  </span>
                  <Download className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Cards 2, 3, 4 disembunyikan sementara sesuai kebutuhan program
          {!isMentor && (
            <Card className="flex flex-col justify-between hover:shadow-md transition-shadow duration-200 border-border/80">
              ... Laporan Pendahuluan ...
            </Card>
          )}
          {!isMentor && (
            <Card className="flex flex-col justify-between hover:shadow-md transition-shadow duration-200 border-border/80">
              ... Laporan Antara ...
            </Card>
          )}
          {!isMentor && (
            <Card className="flex flex-col justify-between hover:shadow-md transition-shadow duration-200 border-border/80">
              ... Laporan Akhir ...
            </Card>
          )}
          */}

        </div>
      )}
    </div>
  );
}
