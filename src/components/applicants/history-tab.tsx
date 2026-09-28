"use client";

import * as React from "react";
import { Logbook, OutputReport, VerificationStatus, DeliveryMethod, MeetingType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatNumber } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Video,
  Users,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Factory,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Lightbulb,
  Receipt,
  Globe
} from "lucide-react";

interface HistoryTabProps {
  logbooks: Logbook[];
  outputReports: OutputReport[];
}

export function HistoryTab({ logbooks = [], outputReports = [] }: HistoryTabProps) {
  const router = useRouter();

  // Helper status badge
  const renderStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-300 dark:border-emerald-700/50 dark:text-emerald-400 gap-1 font-medium text-xs px-2 py-0.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Disetujui
          </Badge>
        );
      case VerificationStatus.REJECTED:
        return (
          <Badge variant="destructive" className="bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 border-rose-300 dark:border-rose-700/50 dark:text-rose-400 gap-1 font-medium text-xs px-2 py-0.5">
            <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            Ditolak
          </Badge>
        );
      case VerificationStatus.PENDING:
      default:
        return (
          <Badge variant="outline" className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-amber-300 dark:border-amber-700/50 dark:text-amber-400 gap-1 font-medium text-xs px-2 py-0.5">
            <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            Menunggu
          </Badge>
        );
    }
  };

  // Helper business condition pill
  const renderBusinessConditionPill = (condition?: string | null) => {
    if (!condition) return null;
    const cond = condition.toLowerCase().trim();

    if (cond === "meningkat") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50 shadow-sm transition-transform hover:scale-105">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Meningkat</span>
        </span>
      );
    }

    if (cond === "stabil" || cond === "tetap") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/50 shadow-sm transition-transform hover:scale-105">
          <Minus className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
          <span>Tetap</span>
        </span>
      );
    }

    if (cond === "turun" || cond === "menurun") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700/50 shadow-sm transition-transform hover:scale-105">
          <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>Menurun</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border">
        {condition}
      </span>
    );
  };

  // Safe date formatter
  const formatSafeDate = (dateVal?: Date | string | null, formatStr: string = "dd MMM yyyy") => {
    if (!dateVal) return "-";
    try {
      return format(new Date(dateVal), formatStr, { locale: idLocale });
    } catch {
      return "-";
    }
  };

  // Safe time range
  const formatTimeRange = (start?: Date | string | null, end?: Date | string | null) => {
    if (!start) return null;
    try {
      const s = format(new Date(start), "HH:mm");
      const e = end ? format(new Date(end), "HH:mm") : "";
      return e ? `${s} - ${e}` : s;
    } catch {
      return null;
    }
  };

  // Safe currency
  const formatCurrency = (amount?: number | null) => {
    if (amount === undefined || amount === null) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Sort by date descending
  const sortedLogbooks = [...logbooks].sort((a, b) => {
    return new Date(b.logbookDate || b.createdAt).getTime() - new Date(a.logbookDate || a.createdAt).getTime();
  });

  const sortedOutputReports = [...outputReports].sort((a, b) => {
    return (b.monthReport ?? 0) - (a.monthReport ?? 0);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* ================= KOLOM KIRI: LOGBOOK PENDAMPINGAN ================= */}
      <Card className="border-border/60 shadow-sm flex flex-col h-[650px] overflow-hidden">
        <CardHeader className="bg-muted/30 border-b pb-3.5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Riwayat Logbook
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Catatan sesi aktivitas & konsultasi pendampingan.
              </CardDescription>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary whitespace-nowrap">
              {logbooks.length} Sesi
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {sortedLogbooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed m-1">
              <FileSpreadsheet className="w-10 h-10 stroke-[1.5] mb-2 text-muted-foreground/60" />
              <p className="font-semibold text-sm text-foreground">Belum Ada Riwayat Logbook</p>
              <p className="text-xs mt-1 max-w-[240px]">
                Peserta ini belum memiliki catatan sesi pendampingan.
              </p>
            </div>
          ) : (
            sortedLogbooks.map((logbook, idx) => {
              const timeStr = formatTimeRange(logbook.startTime, logbook.endTime);
              const isOnline = logbook.deliveryMethod === DeliveryMethod.ONLINE;
              const isGroup = logbook.meetingType === MeetingType.GROUP;

              return (
                <div
                  key={logbook.id || idx}
                  className="group relative flex flex-col justify-between bg-card hover:bg-muted/25 border rounded-xl p-3.5 transition-all duration-200 hover:shadow-sm hover:border-primary/40"
                >
                  {/* Header Item */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-border/50">
                    <div className="space-y-1 min-w-0">
                      <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {logbook.mentoringMaterial || "Materi Pendampingan"}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-primary/70" />
                          {formatSafeDate(logbook.logbookDate)}
                        </span>
                        {timeStr && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-primary/70" />
                            {timeStr}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          {isOnline ? (
                            <Video className="w-3 h-3 text-blue-500" />
                          ) : (
                            <Building2 className="w-3 h-3 text-amber-500" />
                          )}
                          {logbook.deliveryMethod || "Tatap Muka"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-emerald-500" />
                          {isGroup ? "Kelompok" : "Individual"}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="shrink-0">
                      {renderStatusBadge(logbook.verificationStatus)}
                    </div>
                  </div>

                  {/* Content Item */}
                  <div className="py-2.5 space-y-2 text-xs">
                    {logbook.activitySummary && (
                      <p className="text-muted-foreground leading-relaxed line-clamp-2">
                        {logbook.activitySummary}
                      </p>
                    )}

                    {/* Kendala & Solusi Quick View */}
                    {(logbook.obstacle || logbook.solutions) && (
                      <div className="space-y-1.5 pt-0.5">
                        {logbook.obstacle && (
                          <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-md p-2 text-xs">
                            <div className="font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1 mb-0.5">
                              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>Kendala:</span>
                            </div>
                            <p className="text-amber-900/80 dark:text-amber-300/80 line-clamp-2">
                              {logbook.obstacle}
                            </p>
                          </div>
                        )}
                        {logbook.solutions && (
                          <div className="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-md p-2 text-xs">
                            <div className="font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-1 mb-0.5">
                              <Lightbulb className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>Solusi:</span>
                            </div>
                            <p className="text-emerald-900/80 dark:text-emerald-300/80 line-clamp-2">
                              {logbook.solutions}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                      {logbook.totalExpense !== undefined && logbook.totalExpense !== null && (
                        <span className="flex items-center gap-1 font-medium truncate">
                          <Receipt className="w-3 h-3 text-primary/70 shrink-0" />
                          {formatCurrency(logbook.totalExpense)}
                        </span>
                      )}
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs px-2.5 gap-1 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-150 ml-auto"
                      onClick={() => router.push(`/logbooks/${logbook.id}`)}
                    >
                      Detail
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ================= KOLOM KANAN: LAPORAN CAPAIAN OUTPUT ================= */}
      <Card className="border-border/60 shadow-sm flex flex-col h-[650px] overflow-hidden">
        <CardHeader className="bg-muted/30 border-b pb-3.5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Capaian Output Bulanan
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Perkembangan omzet, kapasitas, dan tenaga kerja.
              </CardDescription>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary whitespace-nowrap">
              {outputReports.length} Laporan
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {sortedOutputReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed m-1">
              <FileText className="w-10 h-10 stroke-[1.5] mb-2 text-muted-foreground/60" />
              <p className="font-semibold text-sm text-foreground">Belum Ada Capaian Output</p>
              <p className="text-xs mt-1 max-w-[240px]">
                Peserta ini belum memiliki laporan perkembangan output.
              </p>
            </div>
          ) : (
            sortedOutputReports.map((report, idx) => {
              const monthLabel = report.monthReport === 0 ? "Baseline Awal" : `Bulan ${report.monthReport}`;
              const employeeCount = report.employees?.length ?? 0;

              return (
                <div
                  key={report.id || idx}
                  className="group relative flex flex-col justify-between bg-card hover:bg-muted/25 border rounded-xl p-3.5 transition-all duration-200 hover:shadow-sm hover:border-primary/40"
                >
                  {/* Header Item */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-border/50">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                          {monthLabel}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded font-mono bg-muted font-medium text-muted-foreground border">
                          M-{report.monthReport}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3 text-primary/70" />
                        <span>Update: {formatSafeDate(report.updatedAt || report.createdAt)}</span>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="shrink-0">
                      {renderStatusBadge(report.verificationStatus)}
                    </div>
                  </div>

                  {/* Key Metrics Grid (2x2) */}
                  <div className="grid grid-cols-2 gap-2 py-3">
                    {/* Metric 1: Omzet */}
                    <div className="bg-muted/30 border rounded-lg p-2.5 space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                        <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate">Omzet</span>
                      </div>
                      <p className="text-sm font-bold text-foreground truncate">
                        {formatCurrency(report.revenue)}
                      </p>
                    </div>

                    {/* Metric 2: Volume Penjualan */}
                    <div className="bg-muted/30 border rounded-lg p-2.5 space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                        <Package className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="truncate">Penjualan</span>
                      </div>
                      <p className="text-sm font-bold text-foreground truncate">
                        {report.salesVolume ? `${formatNumber(report.salesVolume)} ${report.salesVolumeUnit || "Unit"}` : "-"}
                      </p>
                    </div>

                    {/* Metric 3: Kapasitas Produksi */}
                    <div className="bg-muted/30 border rounded-lg p-2.5 space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                        <Factory className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="truncate">Kapasitas</span>
                      </div>
                      <p className="text-sm font-bold text-foreground truncate">
                        {report.productionCapacity ? `${formatNumber(report.productionCapacity)} ${report.productionCapacityUnit || "Unit"}` : "-"}
                      </p>
                    </div>

                    {/* Metric 4: Tenaga Kerja */}
                    <div className="bg-muted/30 border rounded-lg p-2.5 space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                        <Users className="w-3 h-3 text-purple-500 shrink-0" />
                        <span className="truncate">Tenaga Kerja</span>
                      </div>
                      <p className="text-sm font-bold text-foreground truncate">
                        {employeeCount} Orang
                      </p>
                    </div>
                  </div>

                  {/* Info Tambahan & Pills Kondisi Bisnis */}
                  <div className="space-y-2 pb-1 text-xs">
                    {/* Pills Status Omzet */}
                    {report.businessCondition && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">Status Omzet:</span>
                        {renderBusinessConditionPill(report.businessCondition)}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {report.marketingArea && (
                        <Badge variant="outline" className="bg-muted/50 text-[11px] font-normal gap-1 py-0 px-1.5">
                          <Globe className="w-2.5 h-2.5 text-muted-foreground" />
                          {report.marketingArea}
                        </Badge>
                      )}
                      {report.bookkeepingCashflow && (
                        <Badge variant="outline" className="bg-muted/50 text-[11px] font-normal gap-1 py-0 px-1.5">
                          <FileSpreadsheet className="w-2.5 h-2.5 text-muted-foreground" />
                          Kas: {report.bookkeepingCashflow}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                      {report.verificationNote && (
                        <span className="text-muted-foreground italic truncate max-w-[180px]">
                          Catatan: &ldquo;{report.verificationNote}&rdquo;
                        </span>
                      )}
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs px-2.5 gap-1 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-150 ml-auto"
                      onClick={() => router.push(`/output-reports/${report.id}`)}
                    >
                      Detail
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
