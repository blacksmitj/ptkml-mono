"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OutputReport } from "@/types";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Package,
  CheckCircle2,
  AlertCircle,
  MapPin,
  BookOpen,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { formatRupiah, formatNumber, formatPercentage } from "@/lib/utils";

interface FollowUpOutputSummaryCardProps {
  outputReports: OutputReport[];
}

export function FollowUpOutputSummaryCard({
  outputReports,
}: FollowUpOutputSummaryCardProps) {
  const approvedReports = [...(outputReports || [])]
    .filter((r) => r.verificationStatus === "APPROVED")
    .sort((a, b) => a.monthReport - b.monthReport);

  const month0 = approvedReports.find((r) => r.monthReport === 0);
  const latestMonthly = approvedReports.filter((r) => r.monthReport > 0);
  const latestReport =
    latestMonthly.length > 0 ? latestMonthly[latestMonthly.length - 1] : null;

  const rev0 = month0?.revenue || 0;
  const revLatest = latestReport?.revenue || 0;
  const revDiff = revLatest - rev0;
  const revPct = rev0 > 0 ? (revDiff / rev0) * 100 : revLatest > 0 ? 100 : 0;

  const emp0 = (month0?.employees || []).length;

  // Kumulatif seluruh tenaga kerja unik (B1 s/d B3)
  const uniqueEmployeesPostB0 = new Set<string>();
  latestMonthly.forEach((r) => {
    (r.employees || []).forEach((emp: any) => {
      const key = (emp.nik && emp.nik.trim()) || (emp.name && emp.name.trim().toLowerCase()) || "";
      if (key) uniqueEmployeesPostB0.add(key);
    });
  });
  const totalKumulatifKaryawan = uniqueEmployeesPostB0.size;

  // Cek konsistensi pembukuan B1-B3
  const b1to3Reports = approvedReports.filter((r) => r.monthReport >= 1 && r.monthReport <= 3);
  const hasAllThreeMonths = [1, 2, 3].every((m) => b1to3Reports.some((r) => r.monthReport === m));
  const isConsistentB1toB3 =
    hasAllThreeMonths &&
    b1to3Reports.every(
      (r) =>
        (r.bookkeepingCashflow && r.bookkeepingCashflow !== "NONE") ||
        (r.bookkeepingIncomeStatement && r.bookkeepingIncomeStatement !== "NONE")
    );

  const chartData = approvedReports.map((r) => ({
    label: r.monthReport === 0 ? "B0 (Awal)" : `Bulan ${r.monthReport}`,
    revenue: r.revenue || 0,
    employees: (r.employees || []).length,
    production: r.productionCapacity || 0,
    unit: r.productionCapacityUnit || "unit",
  }));

  const marketingAreaLabels: Record<string, string> = {
    VILLAGE: "Desa/Kelurahan",
    DISTRICT: "Kecamatan",
    CITY: "Kabupaten/Kota",
    PROVINCE: "Provinsi",
    INTERNATIONAL: "Internasional",
  };

  return (
    <Card className="shadow-sm border-border/80">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">
          Capaian Output Pendampingan (B0 – B3)
        </CardTitle>
        <CardDescription>
          Ringkasan data pertumbuhan omzet, tenaga kerja, kapasitas produksi,
          dan jangkauan pasar hasil verifikasi
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrik Ringkas Grid - 5 Kotak */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 1. Omzet Terakhir */}
          <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60 flex flex-col justify-between">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-primary" /> Omzet Terakhir
              (B{latestReport?.monthReport || 3})
            </div>
            <div className="text-lg font-bold mt-1 text-foreground">
              {formatRupiah(revLatest)}
            </div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {revDiff > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> +{formatPercentage(revPct)}{" "}
                  vs B0
                </span>
              ) : revDiff < 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-0.5">
                  <TrendingDown className="h-3 w-3" />{" "}
                  {formatPercentage(revPct)} vs B0
                </span>
              ) : (
                <span className="text-muted-foreground font-medium">
                  Tetap vs B0
                </span>
              )}
            </div>
          </div>

          {/* 2. Seluruh Tenaga Kerja (Kumulatif) */}
          <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60 flex flex-col justify-between">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" /> Seluruh Tenaga Kerja
            </div>
            <div className="text-lg font-bold mt-1 text-foreground">
              {totalKumulatifKaryawan} Orang
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Kumulatif B1–B3
              </span>
              {" • "}
              <span>B0: {emp0}</span>
            </div>
          </div>

          {/* 3. Produksi Terakhir */}
          <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60 flex flex-col justify-between">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-primary" /> Produksi Terakhir (B
              {latestReport?.monthReport || 3})
            </div>
            <div className="text-lg font-bold mt-1 text-foreground truncate">
              {formatNumber(latestReport?.productionCapacity || 0)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {latestReport?.productionCapacityUnit || "unit"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1 truncate">
              Jual: {formatNumber(latestReport?.salesVolume || 0)}{" "}
              {latestReport?.salesVolumeUnit || "unit"}
            </div>
          </div>

          {/* 4. Jangkauan Terakhir */}
          <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60 flex flex-col justify-between">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Jangkauan Terakhir
            </div>
            <div className="text-base font-bold mt-1 text-foreground truncate">
              {latestReport
                ? marketingAreaLabels[latestReport.marketingArea] ||
                  latestReport.marketingArea
                : "-"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Periode B{latestReport?.monthReport || 3}
            </div>
          </div>

          {/* 5. Pembukuan Konsisten B1–B3 */}
          <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60 flex flex-col justify-between">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" /> Pembukuan B1–B3
            </div>
            <div className="mt-1">
              {isConsistentB1toB3 ? (
                <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs px-2 py-0.5 flex items-center gap-1 w-fit">
                  <CheckCircle2 className="h-3 w-3" /> Konsisten
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs px-2 py-0.5 flex items-center gap-1 w-fit text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20">
                  <AlertCircle className="h-3 w-3" /> Belum Konsisten
                </Badge>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 truncate" title={`Kas: ${latestReport?.bookkeepingCashflow || "NONE"} • Laba/Rugi: ${latestReport?.bookkeepingIncomeStatement || "NONE"}`}>
              Kas: {latestReport?.bookkeepingCashflow || "NONE"} • L/R: {latestReport?.bookkeepingIncomeStatement || "NONE"}
            </div>
          </div>
        </div>

        {/* Timeline Visual & Grafik Pergerakan */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Mini Grafik Omzet */}
          <div className="lg:col-span-5 bg-card rounded-xl border p-4">
            <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center justify-between">
              <span>Tren Pertumbuhan Omzet (B0 – B3)</span>
              <Badge variant="outline" className="text-[10px] py-0">
                Terverifikasi
              </Badge>
            </div>
            <div className="h-35 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    opacity={0.3}
                  />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis
                    hide
                    domain={["dataMin - 100000", "dataMax + 100000"]}
                  />
                  <Tooltip
                    formatter={(value: any) => [
                      formatRupiah(Number(value)),
                      "Omzet",
                    ]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#10b981" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Timeline Steps Card */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              Riwayat Output Terverifikasi
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              {approvedReports.map((report) => (
                <div
                  key={report.id}
                  className="p-2.5 rounded-lg border bg-muted/20 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>
                      {report.monthReport === 0
                        ? "B0 (Awal)"
                        : `Bulan ${report.monthReport}`}
                    </span>
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Omzet:{" "}
                    <strong className="text-foreground">
                      {formatRupiah(report.revenue)}
                    </strong>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Karyawan:{" "}
                    <strong className="text-foreground">
                      {(report.employees || []).length} org
                    </strong>
                  </div>
                  {report.obstacle && (
                    <div
                      className="text-[10px] text-amber-600 dark:text-amber-400 truncate pt-0.5"
                      title={report.obstacle}
                    >
                      ⚠ {report.obstacle}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {latestReport?.businessCondition && (
              <div className="text-xs bg-muted/40 p-2.5 rounded-lg border text-muted-foreground mt-2">
                <span className="font-semibold text-foreground">
                  Kondisi Terakhir Usaha:{" "}
                </span>
                {latestReport.businessCondition}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
