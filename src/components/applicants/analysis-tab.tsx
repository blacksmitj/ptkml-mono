"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  Package,
  ShoppingBag,
  Calendar,
  Minus,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import {
  getOfflineIndividualVisitCount,
  getVisitCountColorClasses,
} from "@/components/applicants/visit-count-badge";

interface AnalysisTabProps {
  applicant: any;
}

const bookkeepingLabels: Record<string, string> = {
  NONE: "Tidak Menerapkan",
  MANUAL: "Manual (Buku)",
  EXCEL: "Excel/Spreadsheet",
  APPLICATION: "Aplikasi Digital",
};

const categoryLabels: Record<string, { label: string; color: string }> = {
  MODAL: {
    label: "Bantuan Modal",
    color:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800",
  },
  ALAT: {
    label: "Alat & Mesin Produksi",
    color:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800",
  },
  PELATIHAN: {
    label: "Pelatihan & Bimtek",
    color:
      "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800",
  },
  LEGALITAS: {
    label: "Sertifikasi & Legalitas",
    color:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800",
  },
  PASAR: {
    label: "Akses Pasar & Ekosistem",
    color:
      "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800",
  },
  LAINNYA: {
    label: "Intervensi Khusus Lain",
    color:
      "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-800",
  },
};

const urgencyLabels: Record<string, { label: string; color: string }> = {
  HIGH: {
    label: "Tinggi",
    color: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300",
  },
  MEDIUM: {
    label: "Sedang",
    color:
      "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300",
  },
  LOW: {
    label: "Rendah",
    color:
      "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-300",
  },
};

export function AnalysisTab({ applicant }: AnalysisTabProps) {
  const router = useRouter();
  const currentRole = useAppStore((state) => state.currentRole);
  const isMentor = currentRole === "MENTOR";

  const reports = applicant.outputReports || [];
  const approvedReports = reports.filter(
    (r: any) => r.verificationStatus === "APPROVED",
  );
  const sortedReports = [...approvedReports].sort(
    (a, b) => a.monthReport - b.monthReport,
  );

  // Format data for chart
  const chartData = sortedReports.map((report) => ({
    month:
      report.monthReport === 0 ? "Data Awal" : `Bulan ${report.monthReport}`,
    revenue: report.revenue,
    sales: report.salesVolume,
    production: report.productionCapacity,
    employeeCount: (report.employees || []).length,
  }));

  const visitCount = getOfflineIndividualVisitCount(applicant);
  const visitColors = getVisitCountColorClasses(visitCount);

  // 1. Approved Reports
  const month0Report = approvedReports.find((r: any) => r.monthReport === 0);
  const latestMonthlyReports = approvedReports.filter(
    (r: any) => r.monthReport > 0,
  );
  const latestReport =
    latestMonthlyReports.length > 0
      ? [...latestMonthlyReports].sort(
          (a: any, b: any) => b.monthReport - a.monthReport,
        )[0]
      : null;

  // Turnover (Omset) metrics
  let avgRevenue = 0;
  let lastRevenue = null;
  let revenueChangeNominal: number | null = null;
  let revenueChangePercentage: number | null = null;
  let revenueStatus = "Tidak Ada Data";

  if (approvedReports.length > 0) {
    const totalRev = approvedReports.reduce(
      (sum: number, r: any) => sum + (r.revenue || 0),
      0,
    );
    avgRevenue = totalRev / approvedReports.length;
    lastRevenue = (latestReport || month0Report)?.revenue ?? null;

    if (month0Report && latestReport) {
      const baselineRevenue = month0Report.revenue ?? 0;
      revenueChangeNominal = (lastRevenue ?? 0) - baselineRevenue;
      if (baselineRevenue > 0) {
        revenueChangePercentage =
          (revenueChangeNominal / baselineRevenue) * 100;
      } else {
        revenueChangePercentage = (lastRevenue ?? 0) > 0 ? 100 : 0;
      }

      if (revenueChangeNominal > 0) {
        revenueStatus = "Naik";
      } else if (revenueChangeNominal < 0) {
        revenueStatus = "Turun";
      } else {
        revenueStatus = "Tetap";
      }
    } else if (month0Report) {
      revenueStatus = "Tidak Ada Laporan Bulanan";
    } else {
      revenueStatus = "Tidak Ada Data Awal";
    }
  }

  // Production metrics
  let avgProduction = 0;
  let lastProduction = null;
  let productionChangeNominal: number | null = null;
  let productionChangePercentage: number | null = null;
  let productionStatus = "Tidak Ada Data";

  if (approvedReports.length > 0) {
    const totalProd = approvedReports.reduce(
      (sum: number, r: any) => sum + (r.productionCapacity || 0),
      0,
    );
    avgProduction = totalProd / approvedReports.length;
    lastProduction = (latestReport || month0Report)?.productionCapacity ?? null;

    if (month0Report && latestReport) {
      const baselineProduction = month0Report.productionCapacity ?? 0;
      productionChangeNominal = (lastProduction ?? 0) - baselineProduction;
      if (baselineProduction > 0) {
        productionChangePercentage =
          (productionChangeNominal / baselineProduction) * 100;
      } else {
        productionChangePercentage = (lastProduction ?? 0) > 0 ? 100 : 0;
      }

      if (productionChangeNominal > 0) {
        productionStatus = "Naik";
      } else if (productionChangeNominal < 0) {
        productionStatus = "Turun";
      } else {
        productionStatus = "Tetap";
      }
    } else if (month0Report) {
      productionStatus = "Tidak Ada Laporan Bulanan";
    } else {
      productionStatus = "Tidak Ada Data Awal";
    }
  }

  // Sales Volume metrics (NEW)
  let avgSales = 0;
  let lastSales = null;
  let salesChangeNominal: number | null = null;
  let salesChangePercentage: number | null = null;
  let salesStatus = "Tidak Ada Data";

  if (approvedReports.length > 0) {
    const totalSales = approvedReports.reduce(
      (sum: number, r: any) => sum + (r.salesVolume || 0),
      0,
    );
    avgSales = totalSales / approvedReports.length;
    lastSales = (latestReport || month0Report)?.salesVolume ?? null;

    if (month0Report && latestReport) {
      const baselineSales = month0Report.salesVolume ?? 0;
      salesChangeNominal = (lastSales ?? 0) - baselineSales;
      if (baselineSales > 0) {
        salesChangePercentage = (salesChangeNominal / baselineSales) * 100;
      } else {
        salesChangePercentage = (lastSales ?? 0) > 0 ? 100 : 0;
      }

      if (salesChangeNominal > 0) {
        salesStatus = "Naik";
      } else if (salesChangeNominal < 0) {
        salesStatus = "Turun";
      } else {
        salesStatus = "Tetap";
      }
    } else if (month0Report) {
      salesStatus = "Tidak Ada Laporan Bulanan";
    } else {
      salesStatus = "Tidak Ada Data Awal";
    }
  }

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const productionUnit =
    latestReport?.productionCapacityUnit ||
    month0Report?.productionCapacityUnit ||
    "Pcs";
  const salesUnit =
    latestReport?.salesVolumeUnit || month0Report?.salesVolumeUnit || "Pcs";

  const revenueConfig = {
    revenue: {
      label: "Omzet",
      color: "var(--brand-seq-1)",
    },
  };

  const productionSalesConfig = {
    production: {
      label: "Kapasitas Produksi",
      color: "var(--brand-seq-3)",
    },
    sales: {
      label: "Volume Penjualan",
      color: "var(--brand-seq-4)",
    },
  };

  const employeeConfig = {
    employeeCount: {
      label: "Jumlah Karyawan",
      color: "var(--brand-seq-2)",
    },
  };

  // Follow Up Recommendation Data
  const followUpRec = applicant.followUpRecommendation;
  const approvedMonths = new Set(
    approvedReports.map((r: any) => r.monthReport),
  );
  const isEligibleForFollowUp =
    approvedMonths.has(1) && approvedMonths.has(2) && approvedMonths.has(3);

  const getRtlStatusBadge = (status?: string | null) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 gap-1 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" /> RTL Disetujui
          </Badge>
        );
      case "SUBMITTED":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800 gap-1 font-medium">
            <Clock className="h-3.5 w-3.5" /> Sedang Ditinjau Admin
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800 gap-1 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" /> Perlu Revisi
          </Badge>
        );
      case "DRAFT":
        return (
          <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800 gap-1 font-medium">
            <FileText className="h-3.5 w-3.5" /> Draft Mentor
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="text-muted-foreground gap-1 font-medium"
          >
            Belum Dibuat
          </Badge>
        );
    }
  };

  return (
    <div className="grid gap-6">
      {/* 5 Summary Cards Sejajar Responsif */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Tren Omset */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Perkembangan Omset
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="text-2xl font-bold">
              {lastRevenue !== null ? formatIDR(lastRevenue) : formatIDR(0)}
            </div>
            <div className="flex flex-col text-xs text-muted-foreground gap-1">
              <span>Rata-rata: {formatIDR(avgRevenue)}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {revenueStatus === "Naik" && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-500/25 gap-0.5 font-bold py-0 h-5">
                    <TrendingUp className="h-3 w-3" />+
                    {revenueChangePercentage?.toFixed(1)}%
                  </Badge>
                )}
                {revenueStatus === "Turun" && (
                  <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700/50 hover:bg-rose-500/25 gap-0.5 font-bold py-0 h-5">
                    <TrendingDown className="h-3 w-3" />
                    {revenueChangePercentage?.toFixed(1)}%
                  </Badge>
                )}
                {revenueStatus === "Tetap" && (
                  <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700/50 hover:bg-slate-500/25 gap-0.5 py-0 h-5">
                    <Minus className="h-3 w-3" />
                    0%
                  </Badge>
                )}
                {(revenueStatus === "Tidak Ada Data" ||
                  revenueStatus === "Tidak Ada Data Awal") && (
                  <span className="italic">Belum ada data awal</span>
                )}
                {revenueStatus === "Tidak Ada Laporan Bulanan" && (
                  <span className="italic">Belum ada lap. bulanan</span>
                )}
                {revenueChangeNominal !== null && (
                  <span
                    className={
                      revenueChangeNominal >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }
                  >
                    ({revenueChangeNominal >= 0 ? "+" : ""}
                    {formatIDR(revenueChangeNominal)})
                  </span>
                )}
                {month0Report && latestReport && (
                  <TooltipProvider>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center text-muted-foreground/50 hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted cursor-pointer"
                          title="Info Perhitungan"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="bg-popover text-popover-foreground border border-border shadow-md rounded-lg p-2.5 w-60 space-y-1.5 text-xs [&>svg]:fill-popover"
                      >
                        <div className="flex items-center justify-between font-semibold text-[11px] text-muted-foreground border-b border-border/50 pb-1">
                          <span>Perhitungan Omset</span>
                          <span className="text-[10px] font-normal">
                            vs Data Awal
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Data Awal (Bln 0):</span>
                            <span className="font-medium text-foreground">
                              {formatIDR(month0Report.revenue || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>
                              Bulan {latestReport.monthReport} (Terakhir):
                            </span>
                            <span className="font-medium text-foreground">
                              {formatIDR(lastRevenue || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-border/50 font-semibold">
                            <span>Selisih:</span>
                            <span
                              className={
                                revenueChangeNominal &&
                                revenueChangeNominal >= 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }
                            >
                              {revenueChangeNominal && revenueChangeNominal >= 0
                                ? "+"
                                : ""}
                              {formatIDR(revenueChangeNominal || 0)}
                            </span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Tren Produksi */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Kapasitas Produksi
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="text-2xl font-bold">
              {lastProduction !== null
                ? `${formatNumber(Math.round(lastProduction))} ${productionUnit}`
                : `0 ${productionUnit}`}
            </div>
            <div className="flex flex-col text-xs text-muted-foreground gap-1">
              <span>
                Rata-rata: {formatNumber(Math.round(avgProduction))}{" "}
                {productionUnit}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {productionStatus === "Naik" && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-500/25 gap-0.5 font-bold py-0 h-5">
                    <TrendingUp className="h-3 w-3" />+
                    {productionChangePercentage?.toFixed(1)}%
                  </Badge>
                )}
                {productionStatus === "Turun" && (
                  <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700/50 hover:bg-rose-500/25 gap-0.5 font-bold py-0 h-5">
                    <TrendingDown className="h-3 w-3" />
                    {productionChangePercentage?.toFixed(1)}%
                  </Badge>
                )}
                {productionStatus === "Tetap" && (
                  <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700/50 hover:bg-slate-500/25 gap-0.5 py-0 h-5">
                    <Minus className="h-3 w-3" />
                    0%
                  </Badge>
                )}
                {(productionStatus === "Tidak Ada Data" ||
                  productionStatus === "Tidak Ada Data Awal") && (
                  <span className="italic">Belum ada data awal</span>
                )}
                {productionStatus === "Tidak Ada Laporan Bulanan" && (
                  <span className="italic">Belum ada lap. bulanan</span>
                )}
                {productionChangeNominal !== null && (
                  <span
                    className={
                      productionChangeNominal >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }
                  >
                    ({productionChangeNominal >= 0 ? "+" : ""}
                    {formatNumber(Math.round(productionChangeNominal))}{" "}
                    {productionUnit})
                  </span>
                )}
                {month0Report && latestReport && (
                  <TooltipProvider>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center text-muted-foreground/50 hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted cursor-pointer"
                          title="Info Perhitungan"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="bg-popover text-popover-foreground border border-border shadow-md rounded-lg p-2.5 w-60 space-y-1.5 text-xs [&>svg]:fill-popover"
                      >
                        <div className="flex items-center justify-between font-semibold text-[11px] text-muted-foreground border-b border-border/50 pb-1">
                          <span>Perhitungan Produksi</span>
                          <span className="text-[10px] font-normal">
                            vs Data Awal
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Data Awal (Bln 0):</span>
                            <span className="font-medium text-foreground">
                              {formatNumber(
                                Math.round(
                                  month0Report.productionCapacity || 0,
                                ),
                              )}{" "}
                              {productionUnit}
                            </span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>
                              Bulan {latestReport.monthReport} (Terakhir):
                            </span>
                            <span className="font-medium text-foreground">
                              {formatNumber(Math.round(lastProduction || 0))}{" "}
                              {productionUnit}
                            </span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-border/50 font-semibold">
                            <span>Selisih:</span>
                            <span
                              className={
                                productionChangeNominal &&
                                productionChangeNominal >= 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }
                            >
                              {productionChangeNominal &&
                              productionChangeNominal >= 0
                                ? "+"
                                : ""}
                              {formatNumber(
                                Math.round(productionChangeNominal || 0),
                              )}{" "}
                              {productionUnit}
                            </span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Volume Penjualan (BARU di sebelah Kapasitas Produksi) */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Volume Penjualan
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="text-2xl font-bold">
              {lastSales !== null
                ? `${formatNumber(Math.round(lastSales))} ${salesUnit}`
                : `0 ${salesUnit}`}
            </div>
            <div className="flex flex-col text-xs text-muted-foreground gap-1">
              <span>
                Rata-rata: {formatNumber(Math.round(avgSales))} {salesUnit}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {salesStatus === "Naik" && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-500/25 gap-0.5 font-bold py-0 h-5">
                    <TrendingUp className="h-3 w-3" />+
                    {salesChangePercentage?.toFixed(1)}%
                  </Badge>
                )}
                {salesStatus === "Turun" && (
                  <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700/50 hover:bg-rose-500/25 gap-0.5 font-bold py-0 h-5">
                    <TrendingDown className="h-3 w-3" />
                    {salesChangePercentage?.toFixed(1)}%
                  </Badge>
                )}
                {salesStatus === "Tetap" && (
                  <Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700/50 hover:bg-slate-500/25 gap-0.5 py-0 h-5">
                    <Minus className="h-3 w-3" />
                    0%
                  </Badge>
                )}
                {(salesStatus === "Tidak Ada Data" ||
                  salesStatus === "Tidak Ada Data Awal") && (
                  <span className="italic">Belum ada data awal</span>
                )}
                {salesStatus === "Tidak Ada Laporan Bulanan" && (
                  <span className="italic">Belum ada lap. bulanan</span>
                )}
                {salesChangeNominal !== null && (
                  <span
                    className={
                      salesChangeNominal >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }
                  >
                    ({salesChangeNominal >= 0 ? "+" : ""}
                    {formatNumber(Math.round(salesChangeNominal))} {salesUnit})
                  </span>
                )}
                {month0Report && latestReport && (
                  <TooltipProvider>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center text-muted-foreground/50 hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted cursor-pointer"
                          title="Info Perhitungan"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="bg-popover text-popover-foreground border border-border shadow-md rounded-lg p-2.5 w-60 space-y-1.5 text-xs [&>svg]:fill-popover"
                      >
                        <div className="flex items-center justify-between font-semibold text-[11px] text-muted-foreground border-b border-border/50 pb-1">
                          <span>Perhitungan Penjualan</span>
                          <span className="text-[10px] font-normal">
                            vs Data Awal
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Data Awal (Bln 0):</span>
                            <span className="font-medium text-foreground">
                              {formatNumber(
                                Math.round(month0Report.salesVolume || 0),
                              )}{" "}
                              {salesUnit}
                            </span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>
                              Bulan {latestReport.monthReport} (Terakhir):
                            </span>
                            <span className="font-medium text-foreground">
                              {formatNumber(Math.round(lastSales || 0))}{" "}
                              {salesUnit}
                            </span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-border/50 font-semibold">
                            <span>Selisih:</span>
                            <span
                              className={
                                salesChangeNominal && salesChangeNominal >= 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              }
                            >
                              {salesChangeNominal && salesChangeNominal >= 0
                                ? "+"
                                : ""}
                              {formatNumber(
                                Math.round(salesChangeNominal || 0),
                              )}{" "}
                              {salesUnit}
                            </span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Jumlah Kunjungan Luring Individu */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kunjungan</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${visitColors.text}`}>
              {visitCount} Kali
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Kunjungan luring individu disetujui
            </p>
          </CardContent>
        </Card>

        {/* Card 5: Tenaga Kerja */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Karyawan Terlibat
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports.length > 0 && reports[reports.length - 1]?.employees
                ? reports[reports.length - 1].employees.length
                : 0}{" "}
              orang
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Berdasarkan laporan bulan terakhir
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid - 4 Kolom 1 Baris Responsif */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Chart 1: Tren Omset */}
        <Card className="col-span-1 shadow-xs flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tren Omset</CardTitle>
            <CardDescription className="text-xs">
              Perkembangan omzet per bulan
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pt-0">
            <ChartContainer config={revenueConfig} className="h-60 w-full">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis hide />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <span className="font-medium text-foreground">
                          {formatIDR(Number(value))}
                        </span>
                      )}
                    />
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Chart 2: Produksi & Penjualan */}
        <Card className="col-span-1 shadow-xs flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Produksi & Penjualan</CardTitle>
            <CardDescription className="text-xs">
              Kapasitas ({productionUnit}) & volume ({salesUnit})
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pt-0">
            <ChartContainer
              config={productionSalesConfig}
              className="h-60 w-full"
            >
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis hide />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <span className="font-medium text-foreground">
                          {Number(value).toLocaleString("id-ID")}{" "}
                          {name === "production" ? productionUnit : salesUnit}
                        </span>
                      )}
                    />
                  }
                />
                <Legend />
                <Bar
                  dataKey="production"
                  fill="var(--color-production)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="sales"
                  fill="var(--color-sales)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Chart 3: Pertumbuhan Karyawan */}
        <Card className="col-span-1 shadow-xs flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pertumbuhan Karyawan</CardTitle>
            <CardDescription className="text-xs">
              Jumlah tenaga kerja per laporan
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pt-0">
            <ChartContainer config={employeeConfig} className="h-60 w-full">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="employeeCount"
                  stroke="var(--color-employeeCount)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Card 4: Catatan Keuangan */}
        <Card className="col-span-1 shadow-xs flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Catatan Keuangan</CardTitle>
            <CardDescription className="text-xs">
              Metode pembukuan diterapkan
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2.5 border rounded-lg gap-1.5 bg-muted/20">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold">Buku Kas Harian</p>
                <p className="text-[11px] text-muted-foreground">
                  Terakhir dilaporkan
                </p>
              </div>
              <Badge variant="outline" className="text-[11px] font-medium">
                {bookkeepingLabels[
                  reports[reports.length - 1]?.bookkeepingCashflow
                ] ||
                  reports[reports.length - 1]?.bookkeepingCashflow ||
                  "N/A"}
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2.5 border rounded-lg gap-1.5 bg-muted/20">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold">
                  Catatan Laba Rugi Bulanan
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Terakhir dilaporkan
                </p>
              </div>
              <Badge variant="outline" className="text-[11px] font-medium">
                {bookkeepingLabels[
                  reports[reports.length - 1]?.bookkeepingIncomeStatement
                ] ||
                  reports[reports.length - 1]?.bookkeepingIncomeStatement ||
                  "N/A"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION KOMPREHENSIF: REKOMENDASI TINDAK LANJUT */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-bold tracking-tight">
                  Rekomendasi Tindak Lanjut
                </CardTitle>
                <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Pasca-Pendampingan
                </span>
              </div>
              <CardDescription className="mt-1">
                Hasil evaluasi komprehensif perkembangan usaha peserta dan
                rumusan intervensi lanjutan program TKML
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {getRtlStatusBadge(followUpRec?.status)}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  router.push(
                    `/applicants/${applicant.id}/follow-up-recommendation`,
                  )
                }
                className="gap-1.5 text-xs h-8 bg-primary/5 hover:bg-primary/10 border-primary/30 text-primary cursor-pointer"
              >
                {followUpRec
                  ? "Buka Halaman Lengkap"
                  : isMentor
                    ? "Susun RTL"
                    : "Lihat RTL"}
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {followUpRec ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Kolom 1: Temuan Lapangan */}
              <div className="space-y-3 p-4 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Temuan & Evaluasi Lapangan
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    {Array.isArray(followUpRec.findings)
                      ? followUpRec.findings.length
                      : 0}{" "}
                    Catatan
                  </span>
                </div>
                <div className="space-y-2 max-h-75 overflow-y-auto pr-1">
                  {Array.isArray(followUpRec.findings) &&
                  followUpRec.findings.length > 0 ? (
                    followUpRec.findings.map((f: any) => (
                      <div
                        key={f.id || Math.random()}
                        className="p-2.5 rounded-lg border bg-card text-xs space-y-1"
                      >
                        <div className="flex items-center gap-1.5">
                          {f.type === "POSITIVE" && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 text-[10px] py-0 h-4">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />{" "}
                              Catatan Positif
                            </Badge>
                          )}
                          {f.type === "WARNING" && (
                            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800 text-[10px] py-0 h-4">
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{" "}
                              Catatan Khusus
                            </Badge>
                          )}
                          {f.type === "OBSTACLE" && (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 text-[10px] py-0 h-4">
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{" "}
                              Kendala
                            </Badge>
                          )}
                        </div>
                        <p className="text-foreground leading-relaxed">
                          {f.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Tidak ada catatan temuan.
                    </p>
                  )}
                </div>
              </div>

              {/* Kolom 2: Rencana Intervensi Lanjutan */}
              <div className="space-y-3 p-4 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Rekomendasi Intervensi
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    {Array.isArray(followUpRec.recommendations)
                      ? followUpRec.recommendations.length
                      : 0}{" "}
                    Program
                  </span>
                </div>
                <div className="space-y-2 max-h-75 overflow-y-auto pr-1">
                  {Array.isArray(followUpRec.recommendations) &&
                  followUpRec.recommendations.length > 0 ? (
                    followUpRec.recommendations.map((r: any) => {
                      const catInfo = categoryLabels[r.category] || {
                        label: r.category,
                        color: "",
                      };
                      const urgInfo = urgencyLabels[r.urgency] || {
                        label: r.urgency,
                        color: "",
                      };
                      return (
                        <div
                          key={r.id || Math.random()}
                          className="p-2.5 rounded-lg border bg-card text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${catInfo.color}`}
                            >
                              {catInfo.label}
                            </span>
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${urgInfo.color}`}
                            >
                              Urgensi: {urgInfo.label}
                            </span>
                          </div>
                          <h5 className="font-semibold text-foreground text-xs">
                            {r.title}
                          </h5>
                          {r.description && (
                            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                              {r.description}
                            </p>
                          )}
                          {(r.targetTimeline || r.estimatedBudget) && (
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t">
                              {r.targetTimeline && (
                                <span>Target: {r.targetTimeline}</span>
                              )}
                              {r.estimatedBudget && (
                                <span>• Est. Biaya: {r.estimatedBudget}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Belum ada butir rekomendasi program.
                    </p>
                  )}
                </div>
              </div>

              {/* Kolom 3: Catatan Akhir & Status Verifikasi */}
              <div className="space-y-3 p-4 rounded-xl border bg-muted/20 flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Catatan Akhir & Verifikasi
                  </h4>

                  {/* Catatan Akhir Mentor */}
                  <div className="p-2.5 rounded-lg border bg-card text-xs space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      Catatan Akhir Pendamping:
                    </span>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {followUpRec.mentorNote || (
                        <span className="italic text-muted-foreground">
                          Tidak ada catatan akhir.
                        </span>
                      )}
                    </p>
                    {followUpRec.mentor?.user?.profile?.name && (
                      <p className="text-[10px] text-muted-foreground pt-1">
                        Oleh:{" "}
                        <strong>{followUpRec.mentor.user.profile.name}</strong>
                      </p>
                    )}
                  </div>

                  {/* Catatan Verifikasi Admin (jika ada) */}
                  {followUpRec.reviewNote && (
                    <div className="p-2.5 rounded-lg border bg-card text-xs space-y-1 border-destructive/30">
                      <span className="text-[10px] font-semibold text-destructive">
                        Catatan Admin Universitas:
                      </span>
                      <p className="text-foreground leading-relaxed">
                        {followUpRec.reviewNote}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2 text-xs h-8"
                    onClick={() =>
                      router.push(
                        `/applicants/${applicant.id}/follow-up-recommendation`,
                      )
                    }
                  >
                    {isMentor
                      ? "Kelola Rekomendasi Tindak Lanjut"
                      : "Lihat Detail Rekomendasi"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : isEligibleForFollowUp ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl border border-dashed bg-primary/5">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5 justify-center sm:justify-start">
                  <BadgeCheck className="h-4 w-4 text-primary" /> Peserta
                  Memenuhi Syarat Rekomendasi Tindak Lanjut
                </h4>
                <p className="text-xs text-muted-foreground">
                  Laporan output Bulan 1, 2, dan 3 telah berstatus{" "}
                  <strong>APPROVED</strong>. Mentor dapat menyusun rekomendasi
                  intervensi pasca-pendampingan.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  router.push(
                    `/applicants/${applicant.id}/follow-up-recommendation`,
                  )
                }
                className="gap-2 text-xs shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />{" "}
                {isMentor ? "Susun Rekomendasi" : "Lihat Status RTL"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30 text-muted-foreground text-xs">
              <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="font-medium text-foreground">
                  Prasyarat Belum Terpenuhi
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Rekomendasi Tindak Lanjut dapat dibuat setelah seluruh laporan
                  output Bulan 1, 2, dan 3 disetujui (Approved) oleh Admin.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
