import { OutputReport } from "@/types";
import { FollowUpFindingItem } from "@/types";
import { formatPercentage } from "@/lib/utils";

export function generateSmartFindings(outputReports: OutputReport[] = []): FollowUpFindingItem[] {
  const findings: FollowUpFindingItem[] = [];
  const approvedReports = [...outputReports]
    .filter((r) => r.verificationStatus === "APPROVED")
    .sort((a, b) => a.monthReport - b.monthReport);

  if (approvedReports.length === 0) return findings;

  // 1. Auto-extract obstacles from Output Reports B0–B3
  approvedReports.forEach((report) => {
    if (report.obstacle && report.obstacle.trim().length > 0) {
      const monthLabel = report.monthReport === 0 ? "B0 (Awal)" : `Bulan ${report.monthReport}`;
      findings.push({
        id: `obstacle-b${report.monthReport}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: "OBSTACLE",
        text: `Kendala ${monthLabel}: ${report.obstacle.trim()}`,
        source: "OUTPUT_REPORT",
      });
    }
  });

  // 2. Turnover / Revenue trend
  const month0 = approvedReports.find((r) => r.monthReport === 0);
  const monthlyReports = approvedReports.filter((r) => r.monthReport > 0);
  const latestReport = monthlyReports.length > 0 ? monthlyReports[monthlyReports.length - 1] : null;

  if (month0 && latestReport) {
    const rev0 = month0.revenue || 0;
    const revLatest = latestReport.revenue || 0;
    const diffNominal = revLatest - rev0;

    const formatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    });

    if (diffNominal > 0) {
      const pct = rev0 > 0 ? (diffNominal / rev0) * 100 : 100;
      findings.push({
        id: `metric-rev-up-${Date.now()}`,
        type: "POSITIVE",
        text: `Omzet mengalami peningkatan sebesar ${formatPercentage(pct)} dari ${formatter.format(rev0)} (B0) menjadi ${formatter.format(revLatest)} (Bulan ${latestReport.monthReport}).`,
        source: "SMART_METRIC",
      });
    } else if (diffNominal < 0) {
      const pct = rev0 > 0 ? (Math.abs(diffNominal) / rev0) * 100 : 0;
      findings.push({
        id: `metric-rev-down-${Date.now()}`,
        type: "WARNING",
        text: `Omzet mengalami penurunan sebesar ${formatPercentage(pct)} dari ${formatter.format(rev0)} (B0) menjadi ${formatter.format(revLatest)} (Bulan ${latestReport.monthReport}). Perlu evaluasi strategi penjualan.`,
        source: "SMART_METRIC",
      });
    } else {
      findings.push({
        id: `metric-rev-stable-${Date.now()}`,
        type: "POSITIVE",
        text: `Omzet usaha relatif stabil di angka ${formatter.format(revLatest)} per bulan selama masa pendampingan.`,
        source: "SMART_METRIC",
      });
    }
  }

  // 3. Employee Growth (Kumulatif Seluruh Tenaga Kerja Unik B1–B3 vs B0)
  const uniqueEmployeesPostB0 = new Set<string>();
  monthlyReports.forEach((r) => {
    (r.employees || []).forEach((emp: any) => {
      const key = (emp.nik && emp.nik.trim()) || (emp.name && emp.name.trim().toLowerCase()) || "";
      if (key) uniqueEmployeesPostB0.add(key);
    });
  });

  const emp0 = (month0?.employees || []).length;
  const totalKumulatifKaryawan = uniqueEmployeesPostB0.size;

  if (totalKumulatifKaryawan > 0) {
    findings.push({
      id: `metric-emp-up-${Date.now()}`,
      type: "POSITIVE",
      text: `Seluruh tenaga kerja yang terserap (kumulatif) sebanyak ${totalKumulatifKaryawan} orang karyawan (Posisi awal B0: ${emp0} orang).`,
      source: "SMART_METRIC",
    });
  }

  // 4. Bookkeeping Check (Konsistensi B1–B3 melakukan pencatatan)
  if (monthlyReports.length > 0) {
    const b1to3Reports = approvedReports.filter((r) => r.monthReport >= 1 && r.monthReport <= 3);
    const hasAllThreeMonths = [1, 2, 3].every((m) => b1to3Reports.some((r) => r.monthReport === m));
    const isConsistentB1toB3 =
      hasAllThreeMonths &&
      b1to3Reports.every(
        (r) =>
          (r.bookkeepingCashflow && r.bookkeepingCashflow !== "NONE") ||
          (r.bookkeepingIncomeStatement && r.bookkeepingIncomeStatement !== "NONE")
      );

    if (isConsistentB1toB3) {
      findings.push({
        id: `metric-bookkeeping-consistent-${Date.now()}`,
        type: "POSITIVE",
        text: "Pembukuan konsisten: Usaha aktif dan disiplin melakukan pencatatan keuangan rutin di setiap periode (B1–B3).",
        source: "SMART_METRIC",
      });
    } else if (latestReport) {
      const cashflow = latestReport.bookkeepingCashflow;
      const income = latestReport.bookkeepingIncomeStatement;

      if (cashflow === "APPLICATION" || income === "APPLICATION") {
        findings.push({
          id: `metric-bookkeeping-digital-${Date.now()}`,
          type: "POSITIVE",
          text: "Sudah menerapkan pencatatan keuangan digital menggunakan aplikasi pada periode terakhir.",
          source: "SMART_METRIC",
        });
      } else if (cashflow === "NONE" && income === "NONE") {
        findings.push({
          id: `metric-bookkeeping-none-${Date.now()}`,
          type: "WARNING",
          text: "Belum memiliki pencatatan keuangan rutin (kas/laba rugi). Memerlukan pendampingan akuntansi sederhana.",
          source: "SMART_METRIC",
        });
      } else if (cashflow === "MANUAL" || income === "MANUAL") {
        findings.push({
          id: `metric-bookkeeping-manual-${Date.now()}`,
          type: "POSITIVE",
          text: "Pencatatan keuangan sudah berjalan secara manual (buku kas). Disarankan digitalisasi pembukuan.",
          source: "SMART_METRIC",
        });
      }
    }
  }

  // 5. Marketing Area
  if (latestReport && ["CITY", "PROVINCE", "INTERNATIONAL"].includes(latestReport.marketingArea)) {
    const areaLabels: Record<string, string> = {
      CITY: "Tingkat Kabupaten/Kota",
      PROVINCE: "Tingkat Provinsi",
      INTERNATIONAL: "Pasar Internasional / Ekspor",
    };
    findings.push({
      id: `metric-market-${Date.now()}`,
      type: "POSITIVE",
      text: `Jangkauan pemasaran produk telah meluas hingga ${areaLabels[latestReport.marketingArea] || latestReport.marketingArea}.`,
      source: "SMART_METRIC",
    });
  }

  return findings;
}
