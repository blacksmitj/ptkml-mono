export const INDO_MONTH_MAP: Record<string, number> = {
  januari: 0, jan: 0,
  februari: 1, pebruari: 1, feb: 1, peb: 1,
  maret: 2, mar: 2,
  april: 3, apr: 3,
  mei: 4, may: 4,
  juni: 5, jun: 5,
  juli: 6, jul: 6,
  agustus: 7, ags: 7, agt: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  oktober: 9, okt: 9, oct: 9,
  november: 10, nopember: 10, nov: 10, nop: 10,
  desember: 11, des: 11, dec: 11,
};

export function parseExcelDate(val: any): Date {
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date() : val;
  }
  if (val === undefined || val === null || val === "") {
    return new Date();
  }

  // Handle Excel serial numeric date (e.g. 37787 -> 2003-06-15)
  if (typeof val === "number" || (!isNaN(Number(val)) && !String(val).includes("-") && !String(val).includes("/") && !String(val).includes(" "))) {
    const num = Number(val);
    if (num > 1000 && num < 100000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + num * 86400000);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  const str = String(val).trim();

  // Pattern 1: Indonesian / English Text Date: e.g. "15 Juni 2003"
  const textDateMatch = str.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (textDateMatch) {
    const day = parseInt(textDateMatch[1], 10);
    const monthName = textDateMatch[2].toLowerCase();
    const year = parseInt(textDateMatch[3], 10);
    if (monthName in INDO_MONTH_MAP) {
      const month = INDO_MONTH_MAP[monthName];
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
  }

  // Pattern 2: YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  // Pattern 3: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }

  return new Date();
}

export function computeRecapMetrics(applicant: any) {
  const reports = applicant.outputReports || [];
  const logbooks = applicant.logbooks || [];
  
  // 1. Mentoring Count
  const offlineIndividualLogbooks = logbooks.filter((l: any) => {
    const lb = l.logbook || l;
    return (
      lb.verificationStatus === "APPROVED" &&
      lb.deliveryMethod === "OFFLINE" &&
      lb.meetingType === "INDIVIDUAL"
    );
  });
  const offlineIndividualVisitCount = offlineIndividualLogbooks.length;
  const mentoringCount = offlineIndividualVisitCount;

  // 2. Approved Reports
  const approvedReports = reports.filter((r: any) => r.verificationStatus === "APPROVED");
  
  const month0Report = approvedReports.find((r: any) => r.monthReport === 0);
  const latestReports = approvedReports.filter((r: any) => r.monthReport > 0);
  const latestReport = latestReports.length > 0 
    ? [...latestReports].sort((a: any, b: any) => b.monthReport - a.monthReport)[0] 
    : null;

  // Turnover (Omset) Metrics
  let avgRevenue = 0;
  let revenueChangeNominal: number | null = null;
  let revenueChangePercentage: number | null = null;
  let revenueStatus = "Tidak Ada Data";

  if (approvedReports.length > 0) {
    const totalRev = approvedReports.reduce((sum: number, r: any) => sum + (r.revenue || 0), 0);
    avgRevenue = totalRev / approvedReports.length;
  }

  if (month0Report && latestReport) {
    const baselineRevenue = month0Report.revenue;
    const lastRevenue = latestReport.revenue;

    revenueChangeNominal = lastRevenue - baselineRevenue;
    if (baselineRevenue > 0) {
      revenueChangePercentage = (revenueChangeNominal / baselineRevenue) * 100;
    } else {
      revenueChangePercentage = lastRevenue > 0 ? 100 : 0;
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

  // Production Metrics
  let avgProduction = 0;
  let productionChangeNominal: number | null = null;
  let productionChangePercentage: number | null = null;
  let productionStatus = "Tidak Ada Data";

  if (approvedReports.length > 0) {
    const totalProd = approvedReports.reduce((sum: number, r: any) => sum + (r.productionCapacity || 0), 0);
    avgProduction = totalProd / approvedReports.length;
  }

  if (month0Report && latestReport) {
    const baselineProduction = month0Report.productionCapacity;
    const lastProduction = latestReport.productionCapacity;

    productionChangeNominal = lastProduction - baselineProduction;
    if (baselineProduction > 0) {
      productionChangePercentage = (productionChangeNominal / baselineProduction) * 100;
    } else {
      productionChangePercentage = lastProduction > 0 ? 100 : 0;
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

  const approvedMonthSet = new Set(approvedReports.map((r: any) => r.monthReport));
  const isEligibleForFollowUp =
    approvedMonthSet.has(1) && approvedMonthSet.has(2) && approvedMonthSet.has(3);

  const followUpRec = applicant.followUpRecommendation;
  const followUpStatus = followUpRec ? followUpRec.status : (isEligibleForFollowUp ? "ELIGIBLE" : "NOT_ELIGIBLE");

  return {
    mentoringCount,
    offlineIndividualVisitCount,
    avgRevenue,
    revenueChangeNominal,
    revenueChangePercentage,
    revenueStatus,
    avgProduction,
    productionChangeNominal,
    productionChangePercentage,
    productionStatus,
    isEligibleForFollowUp,
    followUpStatus,
    followUpRecommendation: followUpRec ? {
      id: followUpRec.id,
      status: followUpRec.status,
      updatedAt: followUpRec.updatedAt,
      reviewNote: followUpRec.reviewNote,
    } : null,
  };
}
