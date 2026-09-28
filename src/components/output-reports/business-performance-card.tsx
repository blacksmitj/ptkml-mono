"use client";

import * as React from "react";
import { VerificationStatus } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Package,
  TrendingUp,
  MapPin,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { RupiahDisplay } from "@/components/ui/rupiah-display";

interface BusinessPerformanceCardProps {
  report: any;
  previousReports?: any[];
}

const marketingAreaLabels: Record<string, string> = {
  VILLAGE: "Desa/Kelurahan",
  DISTRICT: "Kecamatan",
  CITY: "Kabupaten/Kota",
  PROVINCE: "Provinsi",
  INTERNATIONAL: "Internasional",
};

function formatMarketingArea(area: string) {
  return marketingAreaLabels[area] || area;
}

function CompactTimeline({
  items,
}: {
  items: { month: number; value: React.ReactNode }[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="border-l border-dotted border-muted-foreground/30 pl-3 ml-2 relative space-y-1 mt-1.5">
      {items.map((item, idx) => (
        <div key={idx} className="relative flex items-center">
          <div className="absolute left-[-15.5px] top-[5.5px] size-1 rounded-full bg-muted-foreground/30" />
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            B<span className="font-mono">{item.month}</span>: {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  timelineItems,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  timelineItems?: { month: number; value: React.ReactNode }[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-lg font-bold">{value}</div>
      {timelineItems && timelineItems.length > 0 && (
        <CompactTimeline items={timelineItems} />
      )}
    </div>
  );
}

function formatNumber(value: any) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  return isNaN(num) ? value : num.toLocaleString("id-ID");
}

export function BusinessPerformanceCard({
  report,
  previousReports = [],
}: BusinessPerformanceCardProps) {
  const productionTimeline = React.useMemo(() => {
    return previousReports.map((r) => ({
      month: r.monthReport,
      value: <span><span className="font-mono">{formatNumber(r.productionCapacity)}</span> {r.productionCapacityUnit}</span>,
    }));
  }, [previousReports]);

  const salesTimeline = React.useMemo(() => {
    return previousReports.map((r) => ({
      month: r.monthReport,
      value: <span><span className="font-mono">{formatNumber(r.salesVolume)}</span> {r.salesVolumeUnit}</span>,
    }));
  }, [previousReports]);

  const marketingTimeline = React.useMemo(() => {
    return previousReports.map((r) => ({
      month: r.monthReport,
      value: formatMarketingArea(r.marketingArea),
    }));
  }, [previousReports]);

  const revenueTimeline = React.useMemo(() => {
    return previousReports.map((r) => ({
      month: r.monthReport,
      value: (
        <RupiahDisplay
          value={r.revenue}
          className="text-xs text-muted-foreground font-medium inline-block"
        />
      ),
    }));
  }, [previousReports]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle>Performa Bisnis</CardTitle>
          <CardDescription>
            Detail rincian operasional dan keuangan bulan ini.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatItem
            icon={<Calendar className="size-4" />}
            label="Bulan Laporan"
            value={
              report.monthReport === 0
                ? "Data Awal"
                : <span>Bulan <span className="font-mono">{report.monthReport}</span></span>
            }
          />
          <StatItem
            icon={<Package className="size-4" />}
            label="Produksi"
            value={<span><span className="font-mono">{formatNumber(report.productionCapacity)}</span> {report.productionCapacityUnit}</span>}
            timelineItems={productionTimeline}
          />
          <StatItem
            icon={<TrendingUp className="size-4" />}
            label="Penjualan"
            value={<span><span className="font-mono">{formatNumber(report.salesVolume)}</span> {report.salesVolumeUnit}</span>}
            timelineItems={salesTimeline}
          />
          <StatItem
            icon={<MapPin className="size-4" />}
            label="Area Pemasaran"
            value={formatMarketingArea(report.marketingArea)}
            timelineItems={marketingTimeline}
          />
        </div>

        <Separator />

        <div className="flex flex-col gap-2 p-4 bg-primary/5 rounded-xl border border-primary/10">
          <div className="space-y-1">
            <p className="text-sm font-medium text-primary flex items-center gap-2">
              <Wallet className="size-4" /> Total Omzet
            </p>
            <RupiahDisplay
              value={report.revenue}
              className="text-3xl font-bold block mt-1"
            />
          </div>
          {revenueTimeline.length > 0 && (
            <div className="pt-1 border-t border-dashed border-primary/20 mt-1">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground/70 tracking-wider mb-1">
                Riwayat Omzet sebelumnya:
              </p>
              <CompactTimeline items={revenueTimeline} />
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 border rounded-xl space-y-2 flex flex-col justify-start items-start">
            <p className="text-sm font-semibold">Status Omzet</p>
            <div className="mt-1">
              {report.businessCondition === "meningkat" && (
                <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  ▲ Meningkat
                </span>
              )}
              {(report.businessCondition === "stabil" || report.businessCondition === "tetap") && (
                <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-slate-500/10 text-slate-600 border border-slate-500/20">
                  ■ Tetap
                </span>
              )}
              {report.businessCondition === "turun" && (
                <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20">
                  ▼ Turun
                </span>
              )}
              {!["meningkat", "stabil", "tetap", "turun"].includes(report.businessCondition) && (
                <span className="text-sm text-muted-foreground leading-relaxed">
                  {report.businessCondition || "-"}
                </span>
              )}
            </div>
          </div>
          <div className="p-4 border rounded-xl space-y-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="size-4 text-amber-500" /> Kendala
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {report.obstacle || "Tidak ada kendala yang dilaporkan."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
