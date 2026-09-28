"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/use-app-store";
import { usePerformanceReport, KpiItem } from "@/hooks/use-performance-report";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink, RotateCcw, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { PrintHeader } from "./PrintHeader";

const formatDateDisplay = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return format(d, "dd MMMM yyyy", { locale: idLocale });
};

interface LaporanPendampingProps {
  memberId: string;
}

export function LaporanPendamping({ memberId }: LaporanPendampingProps) {
  const router = useRouter();
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);

  const [monthReport, setMonthReport] = useState<string>("ALL");
  const [logbookStartDate, setLogbookStartDate] = useState<string>("");
  const [logbookEndDate, setLogbookEndDate] = useState<string>("");

  const { data, isLoading, isError } = usePerformanceReport(memberId, {
    workspaceId: currentWorkspaceId || undefined,
    monthReport: monthReport !== "ALL" ? parseInt(monthReport) : undefined,
    logbookStartDate: logbookStartDate || undefined,
    logbookEndDate: logbookEndDate || undefined,
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-150 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold">Gagal memuat Laporan Kinerja</h1>
        <Button onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  const {
    mentor,
    summary,
    kpiData,
    problematicApplicants,
    logbookPublicUrl,
    outputPublicUrl,
    logbookDateRange,
    documentationSummary,
  } = data;

  const renderKpiList = (items: KpiItem[], label: string) => {
    if (!items || items.length === 0) return null;
    return (
      <div>
        <span className="font-semibold">
          {items.length} orang {label}:
        </span>{" "}
        {items.map((it, idx) => (
          <span key={it.id || idx}>
            {it.name} ({it.idTkm || "ID TKM"})
            {idx < items.length - 1 ? ", " : ""}
          </span>
        ))}
      </div>
    );
  };

  const renderKpiSection = (
    title: string,
    kpi: {
      naik?: KpiItem[];
      turun?: KpiItem[];
      tetap?: KpiItem[];
      ya?: KpiItem[];
      tidak?: KpiItem[];
      tambah?: KpiItem[];
    },
    type: "trend" | "boolean" | "addition",
  ) => {
    if (type === "trend") {
      const hasContent =
        (kpi.naik?.length || 0) > 0 ||
        (kpi.turun?.length || 0) > 0 ||
        (kpi.tetap?.length || 0) > 0;
      if (!hasContent) return "-";
      return (
        <div className="space-y-1">
          {renderKpiList(kpi.naik || [], "mengalami kenaikan")}
          {renderKpiList(kpi.turun || [], "mengalami penurunan")}
          {renderKpiList(kpi.tetap || [], "memiliki nilai tetap")}
        </div>
      );
    }

    if (type === "boolean") {
      const hasContent =
        (kpi.ya?.length || 0) > 0 || (kpi.tidak?.length || 0) > 0;
      if (!hasContent) return "-";
      return (
        <div className="space-y-1">
          {renderKpiList(kpi.ya || [], "membuat catatan")}
          {renderKpiList(kpi.tidak || [], "tidak membuat catatan")}
        </div>
      );
    }

    if (type === "addition") {
      const hasContent =
        (kpi.tambah?.length || 0) > 0 || (kpi.tidak?.length || 0) > 0;
      if (!hasContent) return "-";
      return (
        <div className="space-y-1">
          {renderKpiList(kpi.tambah || [], "mengalami penambahan tenaga kerja")}
          {renderKpiList(
            kpi.tidak || [],
            "tidak mengalami penambahan tenaga kerja",
          )}
        </div>
      );
    }

    return "-";
  };

  const renderProblematicList = (items: KpiItem[], label: string) => {
    if (!items || items.length === 0) return "Tidak ada";
    return (
      <div>
        <span className="font-semibold">{items.length} orang, yaitu:</span>{" "}
        {items.map((it, idx) => (
          <span key={it.id || idx}>
            {it.name} ({it.idTkm || "ID TKM"})
            {idx < items.length - 1 ? ", " : ""}
          </span>
        ))}
      </div>
    );
  };

  const renderBulletList = (arrayItems?: string[], stringFallback?: string) => {
    let items: string[] = [];
    if (arrayItems && arrayItems.length > 0) {
      items = arrayItems.filter(Boolean);
    } else if (stringFallback) {
      items = stringFallback
        .split(/(?:\r?\n)?;(?:\s*)/g)
        .map((s) => s.replace(/^;\s*/, "").trim())
        .filter(Boolean);
    }

    if (items.length === 0 || (items.length === 1 && items[0] === "-")) {
      return <span className="italic text-gray-500">-</span>;
    }

    return (
      <ul className="list-disc pl-4 space-y-1.5 print:pl-4">
        {items.map((item, idx) => (
          <li key={idx} className="whitespace-pre-line leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    );
  };

  const hasActiveFilter =
    monthReport !== "ALL" ||
    Boolean(logbookStartDate) ||
    Boolean(logbookEndDate);
  const handleResetFilter = () => {
    setMonthReport("ALL");
    setLogbookStartDate("");
    setLogbookEndDate("");
  };

  const dateBadge =
    logbookDateRange?.firstDate && logbookDateRange?.lastDate ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
        <Calendar className="h-3 w-3" />
        Logbook: {formatDateDisplay(logbookDateRange.firstDate)} -{" "}
        {formatDateDisplay(logbookDateRange.lastDate)}
      </span>
    ) : null;

  return (
    <div className="w-full pb-20 print:pb-0 print:overflow-visible">
      {/* Sticky Header with Action & Filter */}
      <PrintHeader
        title="Laporan Kinerja Pendamping"
        subtitle={`${mentor.name} • ${mentor.universityName || mentor.wilayah}`}
        badge={dateBadge}
        onPrint={handlePrint}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
              <Filter className="h-3.5 w-3.5" /> Filter:
            </div>

            {/* Filter Bulan */}
            <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-lg border border-border/50">
              <span className="text-xs font-medium text-muted-foreground px-1.5 whitespace-nowrap">
                Bulan Laporan:
              </span>
              <Select value={monthReport} onValueChange={setMonthReport}>
                <SelectTrigger className="w-32.5 h-8 text-xs bg-background">
                  <SelectValue placeholder="Semua Bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Bulan</SelectItem>
                  <SelectItem value="1">Bulan 1</SelectItem>
                  <SelectItem value="2">Bulan 2</SelectItem>
                  <SelectItem value="3">Bulan 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Rentang Logbook */}
            <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-lg border border-border/50">
              <span className="text-xs font-medium text-muted-foreground px-1.5 whitespace-nowrap">
                Tanggal:
              </span>
              <DatePicker
                value={logbookStartDate}
                onChange={setLogbookStartDate}
                placeholder="Tanggal awal"
                minDate={logbookDateRange?.firstDate || undefined}
                maxDate={logbookDateRange?.lastDate || undefined}
                className="w-35 h-8 text-xs bg-background"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <DatePicker
                value={logbookEndDate}
                onChange={setLogbookEndDate}
                placeholder="Tanggal akhir"
                minDate={
                  logbookStartDate || logbookDateRange?.firstDate || undefined
                }
                maxDate={logbookDateRange?.lastDate || undefined}
                className="w-35 h-8 text-xs bg-background"
              />
            </div>

            {/* Reset Filter Button */}
            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilter}
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </PrintHeader>

      {/* Main Document Layout Container */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 print:p-0 print:max-w-none print:w-full print:overflow-visible">
        {/* Printable Report Document */}
        <div className="bg-white text-black p-8 border rounded-xl shadow-lg print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:overflow-visible">
          {/* Document Header */}
          <div className="text-center font-bold text-lg mb-6 uppercase tracking-wide border-b pb-4">
            Outline Laporan Kinerja Pendamping
            {monthReport !== "ALL" && (
              <div className="text-sm font-normal normal-case text-gray-600 mt-1">
                Periode Laporan: Bulan {monthReport}
              </div>
            )}
          </div>

          {/* Outer Header Info */}
          <div className="mb-4 font-semibold text-sm italic">
            Laporan Kinerja Pendamping: {mentor.name}
          </div>

          {/* Main Document Table */}
          <table className="w-full border-collapse border border-black text-sm text-left">
            <tbody>
              {/* Section Header: Identitas & Pihak Terkait */}
              <tr className="bg-gray-100 font-bold">
                <td className="border border-black p-2 text-center"></td>
                <td className="border border-black p-2" colSpan={3}>
                  Identitas Pendamping & Penanggung Jawab Laporan:
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium w-10 text-center">
                  1
                </td>
                <td className="border border-black p-2 font-medium w-1/3">
                  Nama Tenaga Pendamping (Pembuat)
                </td>
                <td className="border border-black p-2 w-4 text-center">:</td>
                <td className="border border-black p-2">
                  <div className="font-semibold text-gray-900">
                    {mentor.name}
                  </div>
                  <div className="text-xs text-gray-600 print:text-black">
                    Asal Kampus: {mentor.universityName}
                    {(mentor.phone || mentor.email) && (
                      <span>
                        {" "}
                        • Kontak:{" "}
                        {[mentor.phone, mentor.email]
                          .filter(Boolean)
                          .join(" / ")}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  2
                </td>
                <td className="border border-black p-2 font-medium">
                  Penanggung Jawab / Admin Universitas (Penyetujui)
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  <div className="font-semibold text-gray-900">
                    {data?.universityAdmin?.name ||
                      `Admin ${mentor.universityName || "Universitas"}`}
                  </div>
                  <div className="text-xs text-gray-600 print:text-black">
                    Peran: Administrator Universitas ({mentor.universityName})
                    {(data?.universityAdmin?.phone ||
                      data?.universityAdmin?.email) && (
                      <span>
                        {" "}
                        • Kontak:{" "}
                        {[
                          data.universityAdmin.phone,
                          data.universityAdmin.email,
                        ]
                          .filter(Boolean)
                          .join(" / ")}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  3
                </td>
                <td className="border border-black p-2 font-medium">
                  Wilayah Dampingan
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">{mentor.wilayah}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  4
                </td>
                <td className="border border-black p-2 font-medium">
                  Asal Universitas / Lembaga Pengusul
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {mentor.universityName}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  5
                </td>
                <td className="border border-black p-2 font-medium">
                  Jumlah Dampingan
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {summary.totalApplicants} TKM Lanjutan
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  6
                </td>
                <td className="border border-black p-2 font-medium">
                  Jumlah TKM yang sudah didampingi
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {summary.visitedApplicants} TKM Lanjutan
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  7
                </td>
                <td className="border border-black p-2 font-medium">
                  Jumlah Jam Pelajaran yang telah dipenuhi (JPL) dan materi yang
                  diberikan
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {summary.totalJpl} JPL (
                  {summary.materials.length > 0
                    ? summary.materials.join(", ")
                    : "Belum ada materi"}
                  )
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  8
                </td>
                <td className="border border-black p-2 font-medium">
                  Jumlah Kunjungan
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {summary.visitCount} Kunjungan
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  9
                </td>
                <td className="border border-black p-2 font-medium">
                  Resume hasil pendampingan
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {renderBulletList(
                    summary.activitySummaries,
                    summary.activitySummary,
                  )}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  10
                </td>
                <td className="border border-black p-2 font-medium">
                  Kendala selama pendampingan
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {renderBulletList(summary.obstaclesList, summary.obstacles)}
                </td>
              </tr>

              {/* Section Header: Output */}
              <tr className="bg-gray-100 font-bold">
                <td className="border border-black p-2 text-center"></td>
                <td className="border border-black p-2" colSpan={3}>
                  Data/Informasi Capaian Output:
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  11
                </td>
                <td className="border border-black p-2 font-medium">
                  KPI 1.a (Pertumbuhan Omzet)
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {renderKpiSection(
                    "Pertumbuhan Omzet",
                    kpiData.kpi1a,
                    "trend",
                  )}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  12
                </td>
                <td className="border border-black p-2 font-medium">
                  KPI 1.b (Peningkatan kapasitas produksi)
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {renderKpiSection(
                    "Peningkatan kapasitas produksi",
                    kpiData.kpi1b,
                    "trend",
                  )}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  13
                </td>
                <td className="border border-black p-2 font-medium">
                  KPI 1.c (Peningkatan volume penjualan)
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {renderKpiSection(
                    "Peningkatan volume penjualan",
                    kpiData.kpi1c,
                    "trend",
                  )}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  14
                </td>
                <td className="border border-black p-2 font-medium">
                  KPI 1.d (Peningkatan wilayah pemasaran)
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {renderKpiSection(
                    "Peningkatan wilayah pemasaran",
                    kpiData.kpi1d,
                    "trend",
                  )}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  15
                </td>
                <td className="border border-black p-2 font-medium">
                  KPI 2.a (Pembuatan buku kas harian)
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {renderKpiSection(
                    "Pembuatan buku kas harian",
                    kpiData.kpi2a,
                    "boolean",
                  )}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  16
                </td>
                <td className="border border-black p-2 font-medium">
                  KPI 2.b (Pembuatan catatan laba rugi bulanan)
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {renderKpiSection(
                    "Pembuatan catatan laba rugi bulanan",
                    kpiData.kpi2b,
                    "boolean",
                  )}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  17
                </td>
                <td className="border border-black p-2 font-medium">
                  KPI 3 (Penambahan Tenaga Kerja)
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {renderKpiSection(
                    "Penambahan Tenaga Kerja",
                    kpiData.kpi3,
                    "addition",
                  )}
                </td>
              </tr>

              {/* Section Header: Problematic */}
              <tr className="bg-gray-100 font-bold">
                <td className="border border-black p-2 text-center"></td>
                <td className="border border-black p-2" colSpan={3}>
                  Data/informasi TKM Lanjutan yang Bermasalah:
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  18
                </td>
                <td className="border border-black p-2 font-medium">
                  Data TKM Lanjutan yang belum/tidak mencairkan/menggunakan dana
                  bantuan
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {renderProblematicList(
                    problematicApplicants.notDisbursed,
                    "belum/tidak mencairkan dana",
                  )}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  19
                </td>
                <td className="border border-black p-2 font-medium">
                  Data TKM Lanjutan yang menolak didampingi
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {renderProblematicList(
                    problematicApplicants.notWilling,
                    "menolak didampingi",
                  )}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  20
                </td>
                <td className="border border-black p-2 font-medium">
                  Data TKM Lanjutan yang keberadaannya tidak ditemukan
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {renderProblematicList(
                    problematicApplicants.notFound,
                    "keberadaannya tidak ditemukan",
                  )}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  21
                </td>
                <td className="border border-black p-2 font-medium">
                  Data TKM Lanjutan yang tidak dapat dihubungi
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {renderProblematicList(
                    problematicApplicants.noResponse,
                    "tidak dapat dihubungi",
                  )}
                </td>
              </tr>

              {/* Links & Documentation */}
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  22
                </td>
                <td className="border border-black p-2 font-medium">
                  Tautan log book harian
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  <a
                    href={logbookPublicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline print:no-underline print:text-black flex items-center gap-1"
                  >
                    {logbookPublicUrl}
                    <ExternalLink className="h-3 w-3 print:hidden" />
                  </a>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  23
                </td>
                <td className="border border-black p-2 font-medium">
                  Tautan log book capaian output
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  <a
                    href={outputPublicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline print:no-underline print:text-black flex items-center gap-1"
                  >
                    {outputPublicUrl}
                    <ExternalLink className="h-3 w-3 print:hidden" />
                  </a>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">
                  24
                </td>
                <td className="border border-black p-2 font-medium">
                  Dokumentasi
                </td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  {documentationSummary &&
                  documentationSummary.totalFiles > 0 ? (
                    <div>
                      <span className="font-semibold text-emerald-700 print:text-black">
                        {documentationSummary.totalFiles} Berkas Foto
                        Dokumentasi Kegiatan Terlampir
                      </span>
                      <span className="text-xs text-muted-foreground block print:hidden">
                        (Lihat bagian bawah laporan untuk lampiran foto
                        kegiatan)
                      </span>
                    </div>
                  ) : (
                    <span className="italic text-gray-600 print:text-black">
                      Tidak ada berkas foto dokumentasi yang diunggah pada
                      logbook periode ini.
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Documentation Gallery Attachment Section */}
          {documentationSummary && documentationSummary.files.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-300 print:pt-4">
              <h2 className="text-base font-bold mb-4 uppercase tracking-wide border-b pb-2">
                Lampiran Dokumentasi Kegiatan Pendampingan (
                {documentationSummary.files.length} Foto)
              </h2>
              <div className="columns-2 md:columns-3 print:columns-2 gap-4 [column-fill:balance]">
                {documentationSummary.files.map((file, idx) => (
                  <div
                    key={file.id || idx}
                    className="break-inside-avoid mb-4 border rounded-lg p-2.5 flex flex-col bg-gray-50 print:bg-white print:border-black print:break-inside-avoid shadow-xs"
                  >
                    <div className="w-full relative overflow-hidden rounded mb-2 bg-gray-100 flex items-center justify-center">
                      <img
                        src={file.url}
                        alt={file.fileName || `Dokumentasi ${idx + 1}`}
                        className="w-full h-auto max-h-120 object-contain rounded"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="w-full text-xs space-y-1">
                      <div className="font-semibold text-gray-800 print:text-black">
                        {formatDateDisplay(file.logbookDate)}
                      </div>
                      {file.activitySummary && (
                        <p className="text-[11px] text-gray-600 print:text-black italic">
                          "{file.activitySummary}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
