import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/rbac";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/members/[id]/performance-report
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");
    const monthReportParam = searchParams.get("monthReport");
    const monthReport = monthReportParam ? parseInt(monthReportParam, 10) : undefined;
    const logbookStartDate = searchParams.get("logbookStartDate");
    const logbookEndDate = searchParams.get("logbookEndDate");

    if (!workspaceId) {
      return errorResponse("workspaceId is required", 400);
    }

    const access = await requireWorkspaceAccess(request, workspaceId);
    if (access.response) return access.response;

    let targetMemberId = id;
    if (id === "me") {
      if (!access.membership?.id) {
        return errorResponse("Member profile not found for current user", 404);
      }
      targetMemberId = access.membership.id;
    }

    const mentor = await prisma.workspaceMember.findUnique({
      where: { id: targetMemberId },
      include: {
        user: {
          include: {
            profile: {
              include: {
                addresses: true,
              },
            },
          },
        },
        university: true,
        applicants: {
          include: {
            profile: true,
            businessProfile: true,
            outputReports: {
              orderBy: { monthReport: "asc" },
              include: { employees: true },
            },
          },
        },
      },
    });

    if (!mentor) {
      return errorResponse("Mentor not found", 404);
    }

    // Filter logbooks
    const logbookWhere: any = {
      workspaceId,
      createdById: targetMemberId,
    };

    if (logbookStartDate || logbookEndDate) {
      logbookWhere.logbookDate = {};
      if (logbookStartDate) logbookWhere.logbookDate.gte = new Date(logbookStartDate);
      if (logbookEndDate) logbookWhere.logbookDate.lte = new Date(logbookEndDate);
    }

    // Get overall logbook date range for this mentor
    const logbookRange = await prisma.logbook.aggregate({
      where: {
        workspaceId,
        createdById: targetMemberId,
      },
      _min: { logbookDate: true },
      _max: { logbookDate: true },
    });

    const logbooks = await prisma.logbook.findMany({
      where: logbookWhere,
      include: {
        applicants: {
          include: {
            applicant: true,
          },
        },
        files: true,
      },
      orderBy: { logbookDate: "asc" },
    });

    // 1. Identitas Pendamping
    const address = mentor.user?.profile?.addresses?.[0];
    const wilayah = address
      ? [address.districtName, address.cityName, address.provinceName].filter(Boolean).join(", ")
      : "-";

    // 2. Aktivitas Pendampingan
    const totalApplicants = mentor.applicants.length;
    const visitedApplicantIds = new Set<string>();
    let totalJpl = 0;
    const materialsSet = new Set<string>();
    const activitySummaries: string[] = [];
    const obstacles: string[] = [];

    const documentationFiles: Array<{
      id: string;
      url: string;
      fileName: string;
      logbookDate: string;
      activitySummary: string;
    }> = [];

    logbooks.forEach((lb) => {
      totalJpl += lb.jpl || 0;
      if (lb.mentoringMaterial) materialsSet.add(lb.mentoringMaterial);
      if (lb.activitySummary) activitySummaries.push(lb.activitySummary);
      if (lb.obstacle) obstacles.push(lb.obstacle);
      lb.applicants.forEach((la) => visitedApplicantIds.add(la.applicantId));

      if (lb.files && lb.files.length > 0) {
        lb.files.forEach((f) => {
          documentationFiles.push({
            id: f.id,
            url: f.url || "",
            fileName: f.objectKey || f.id,
            logbookDate: lb.logbookDate ? lb.logbookDate.toISOString().split("T")[0] : "",
            activitySummary: lb.activitySummary || "",
          });
        });
      }
    });

    // Marketing Area Enum Rank
    const marketingAreaRank: Record<string, number> = {
      VILLAGE: 0,
      DISTRICT: 1,
      CITY: 2,
      PROVINCE: 3,
      INTERNATIONAL: 4,
    };

    // 3. KPI Data & Output Reports
    const kpiData = {
      kpi1a: { naik: [] as any[], turun: [] as any[], tetap: [] as any[] },
      kpi1b: { naik: [] as any[], turun: [] as any[], tetap: [] as any[] },
      kpi1c: { naik: [] as any[], turun: [] as any[], tetap: [] as any[] },
      kpi1d: { naik: [] as any[], turun: [] as any[], tetap: [] as any[] },
      kpi2a: { ya: [] as any[], tidak: [] as any[] },
      kpi2b: { ya: [] as any[], tidak: [] as any[] },
      kpi3: { tambah: [] as any[], tidak: [] as any[] },
    };

    mentor.applicants.forEach((app) => {
      const appInfo = {
        id: app.id,
        idTkm: app.idTkm,
        name: app.profile?.name || "N/A",
      };

      const outputs = app.outputReports || [];
      const currentOutput = monthReport
        ? outputs.find((o) => o.monthReport === monthReport)
        : outputs[outputs.length - 1];

      let prevData: any = null;
      if (monthReport === 1) {
        prevData = outputs.find((o) => o.monthReport === 0) || null;
      } else if (monthReport && monthReport > 1) {
        prevData = outputs.find((o) => o.monthReport === monthReport - 1) || null;
      }

      if (currentOutput) {
        // KPI 1.a Omzet / Revenue
        if (prevData && prevData.revenue !== undefined && prevData.revenue !== null) {
          const prevRev = Number(prevData.revenue) || 0;
          if (currentOutput.revenue > prevRev) kpiData.kpi1a.naik.push(appInfo);
          else if (currentOutput.revenue < prevRev) kpiData.kpi1a.turun.push(appInfo);
          else kpiData.kpi1a.tetap.push(appInfo);
        } else {
          kpiData.kpi1a.tetap.push(appInfo);
        }

        // KPI 1.b Kapasitas Produksi
        if (prevData && prevData.productionCapacity !== undefined && prevData.productionCapacity !== null) {
          const prevCap = Number(prevData.productionCapacity) || 0;
          if (currentOutput.productionCapacity > prevCap) kpiData.kpi1b.naik.push(appInfo);
          else if (currentOutput.productionCapacity < prevCap) kpiData.kpi1b.turun.push(appInfo);
          else kpiData.kpi1b.tetap.push(appInfo);
        } else {
          kpiData.kpi1b.tetap.push(appInfo);
        }

        // KPI 1.c Volume Penjualan
        if (prevData && prevData.salesVolume !== undefined && prevData.salesVolume !== null) {
          const prevVol = Number(prevData.salesVolume) || 0;
          if (currentOutput.salesVolume > prevVol) kpiData.kpi1c.naik.push(appInfo);
          else if (currentOutput.salesVolume < prevVol) kpiData.kpi1c.turun.push(appInfo);
          else kpiData.kpi1c.tetap.push(appInfo);
        } else {
          kpiData.kpi1c.tetap.push(appInfo);
        }

        // KPI 1.d Wilayah Pemasaran
        if (prevData && prevData.marketingArea) {
          const currRank = marketingAreaRank[currentOutput.marketingArea] ?? 0;
          const prevRank = marketingAreaRank[prevData.marketingArea] ?? 0;
          if (currRank > prevRank) kpiData.kpi1d.naik.push(appInfo);
          else if (currRank < prevRank) kpiData.kpi1d.turun.push(appInfo);
          else kpiData.kpi1d.tetap.push(appInfo);
        } else {
          kpiData.kpi1d.tetap.push(appInfo);
        }

        // KPI 2.a Arus Kas
        if (currentOutput.bookkeepingCashflow && currentOutput.bookkeepingCashflow !== "NONE") {
          kpiData.kpi2a.ya.push(appInfo);
        } else {
          kpiData.kpi2a.tidak.push(appInfo);
        }

        // KPI 2.b Laba Rugi
        if (currentOutput.bookkeepingIncomeStatement && currentOutput.bookkeepingIncomeStatement !== "NONE") {
          kpiData.kpi2b.ya.push(appInfo);
        } else {
          kpiData.kpi2b.tidak.push(appInfo);
        }

        // KPI 3 Tenaga Kerja
        const currEmpCount = currentOutput.employees?.length || 0;
        const prevEmpCount = prevData
          ? (prevData.employees?.length !== undefined
              ? prevData.employees.length
              : (Number(prevData.employeeCount) || 0))
          : 0;

        if (currEmpCount > prevEmpCount) {
          kpiData.kpi3.tambah.push(appInfo);
        } else {
          kpiData.kpi3.tidak.push(appInfo);
        }
      }
    });

    // 4. Data TKM Bermasalah
    const problematicApplicants = {
      notDisbursed: [] as any[],
      notWilling: [] as any[],
      notFound: [] as any[],
      noResponse: [] as any[],
    };

    mentor.applicants.forEach((app) => {
      const appInfo = {
        id: app.id,
        idTkm: app.idTkm,
        name: app.profile?.name || "N/A",
      };

      if (app.fundDisbursement === "NOT_DISBURSED") problematicApplicants.notDisbursed.push(appInfo);
      if (app.willingness === "NOT_WILLING") problematicApplicants.notWilling.push(appInfo);
      if (app.presenceStatus === "NOT_FOUND") problematicApplicants.notFound.push(appInfo);
      if (app.communicationStatus === "NO_RESPONSE") problematicApplicants.noResponse.push(appInfo);
    });

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    // Find University Admin for this mentor's university
    const univAdmin = mentor.universityId
      ? await prisma.workspaceMember.findFirst({
          where: {
            workspaceId,
            universityId: mentor.universityId,
            role: "UNIVERSITY_ADMIN",
          },
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        })
      : null;

    return jsonResponse({
      mentor: {
        id: mentor.id,
        name: mentor.user?.profile?.name || "N/A",
        email: mentor.user?.profile?.email || null,
        phone: mentor.user?.profile?.whatsapp || null,
        wilayah,
        universityName: mentor.university?.name || "-",
      },
      universityAdmin: univAdmin
        ? {
            id: univAdmin.id,
            name: univAdmin.user?.profile?.name || "Admin Universitas",
            email: univAdmin.user?.profile?.email || null,
            phone: univAdmin.user?.profile?.whatsapp || null,
            role: univAdmin.role,
          }
        : null,
      summary: {
        totalApplicants,
        visitedApplicants: visitedApplicantIds.size,
        totalJpl,
        materials: Array.from(materialsSet),
        visitCount: logbooks.length,
        activitySummary: activitySummaries.join("\n; ") || "-",
        obstacles: obstacles.join("\n; ") || "-",
        activitySummaries,
        obstaclesList: obstacles,
      },
      kpiData,
      problematicApplicants,
      logbookPublicUrl: `${baseUrl}/logbooks?mentorId=${mentor.id}`,
      outputPublicUrl: `${baseUrl}/output-reports?mentorId=${mentor.id}`,
      logbookDateRange: {
        firstDate: logbookRange._min.logbookDate
          ? logbookRange._min.logbookDate.toISOString().split("T")[0]
          : null,
        lastDate: logbookRange._max.logbookDate
          ? logbookRange._max.logbookDate.toISOString().split("T")[0]
          : null,
      },
      documentationSummary: {
        totalFiles: documentationFiles.length,
        files: documentationFiles,
      },
    });
  } catch (error) {
    console.error("GET /api/members/[id]/performance-report error:", error);
    return errorResponse("Failed to generate performance report", 500);
  }
}
