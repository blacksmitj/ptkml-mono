import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/rbac";
import { getCache, setCache } from "@/lib/redis";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.ok) return authResult.response;

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return errorResponse("workspaceId is required", 400);
    }

    const cacheKey = `dashboard:stats:${workspaceId}`;
    const cachedData = await getCache<any>(cacheKey);
    if (cachedData && cachedData.genderGroups) {
      return jsonResponse(cachedData);
    }

    const activeUnivFilter = {
      university: {
        isActive: true,
      },
    };

    const [
      totalApplicants,
      totalMentors,
      pendingLogbooks,
      totalLogbooks,
      totalUniversities,
      employeeCountResult,
      provincesResult,
      educationResult,
      sectorsResult,
      birthDatesResult,
      genderResult,
      totalApplicantsAll,
      totalMentorsAll,
      totalUniversitiesAll,
    ] = await Promise.all([
      prisma.applicant.count({
        where: {
          workspaceId,
          status: "ACTIVE",
          mentor: activeUnivFilter,
        },
      }),
      prisma.workspaceMember.count({
        where: {
          workspaceId,
          role: "MENTOR",
          verificationStatus: "APPROVED",
          university: {
            isActive: true,
          },
        },
      }),
      prisma.logbook.count({
        where: {
          workspaceId,
          verificationStatus: "PENDING",
          createdBy: activeUnivFilter,
        },
      }),
      prisma.logbook.count({
        where: {
          workspaceId,
          createdBy: activeUnivFilter,
        },
      }),
      prisma.workspaceUniversity.count({
        where: {
          workspaceId,
          university: { isActive: true },
        },
      }),
      prisma.employee.count({
        where: {
          output: {
            workspaceId,
            verificationStatus: "APPROVED",
            monthReport: { in: [1, 2, 3] },
            applicant: {
              status: "ACTIVE",
              mentor: activeUnivFilter,
            },
          },
        },
      }),
      prisma.address.groupBy({
        by: ["provinceName"],
        where: {
          label: "BUSINESS",
          profile: {
            applicant: {
              workspaceId,
              status: "ACTIVE",
              mentor: activeUnivFilter,
            },
          },
        },
        _count: {
          provinceName: true,
        },
        orderBy: {
          _count: {
            provinceName: "desc",
          },
        },
      }),
      prisma.profile.groupBy({
        by: ["lastEducation"],
        where: {
          applicant: {
            workspaceId,
            status: "ACTIVE",
            mentor: activeUnivFilter,
          },
        },
        _count: {
          lastEducation: true,
        },
        orderBy: {
          _count: {
            lastEducation: "desc",
          },
        },
      }),
      prisma.businessProfile.groupBy({
        by: ["businessSector"],
        where: {
          applicant: {
            workspaceId,
            status: "ACTIVE",
            mentor: activeUnivFilter,
          },
        },
        _count: {
          businessSector: true,
        },
        orderBy: {
          _count: {
            businessSector: "desc",
          },
        },
      }),
      prisma.profile.findMany({
        where: {
          applicant: {
            workspaceId,
            status: "ACTIVE",
            mentor: activeUnivFilter,
          },
        },
        select: {
          birthDate: true,
        },
      }),
      prisma.profile.groupBy({
        by: ["gender"],
        where: {
          applicant: {
            workspaceId,
            status: "ACTIVE",
            mentor: activeUnivFilter,
          },
        },
        _count: {
          gender: true,
        },
        orderBy: {
          _count: {
            gender: "desc",
          },
        },
      }),
      prisma.applicant.count({
        where: { workspaceId },
      }),
      prisma.workspaceMember.count({
        where: { workspaceId, role: "MENTOR" },
      }),
      prisma.workspaceUniversity.count({
        where: { workspaceId },
      }),
    ]);

    const maleCount = genderResult.find((g) => g.gender === "MALE")?._count.gender || 0;
    const femaleCount = genderResult.find((g) => g.gender === "FEMALE")?._count.gender || 0;
    const otherCount = genderResult
      .filter((g) => g.gender !== "MALE" && g.gender !== "FEMALE")
      .reduce((sum, g) => sum + g._count.gender, 0);

    const genderGroups = [
      { name: "Laki-laki", count: maleCount },
      { name: "Perempuan", count: femaleCount },
      ...(otherCount > 0 ? [{ name: "Lainnya", count: otherCount }] : []),
    ];

    const topProvinces = provincesResult.map((p) => ({
      name: p.provinceName || "-",
      count: p._count.provinceName,
    }));

    const topEducations = educationResult.map((e) => ({
      name: e.lastEducation || "-",
      count: e._count.lastEducation,
    }));

    const topSectors = sectorsResult.map((s) => ({
      name: s.businessSector || "-",
      count: s._count.businessSector,
    }));

    const now = new Date();
    const ageGroupsCount: Record<string, number> = {
      "< 20": 0,
      "20 - 29": 0,
      "30 - 39": 0,
      "40 - 49": 0,
      ">= 50": 0,
    };

    birthDatesResult.forEach((p) => {
      if (!p.birthDate) return;
      const birth = new Date(p.birthDate);
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }

      if (age < 20) {
        ageGroupsCount["< 20"]++;
      } else if (age >= 20 && age <= 29) {
        ageGroupsCount["20 - 29"]++;
      } else if (age >= 30 && age <= 39) {
        ageGroupsCount["30 - 39"]++;
      } else if (age >= 40 && age <= 49) {
        ageGroupsCount["40 - 49"]++;
      } else {
        ageGroupsCount[">= 50"]++;
      }
    });

    const ageGroups = Object.entries(ageGroupsCount)
      .map(([name, count]) => ({ name, count }))
      .filter((g) => g.count > 0)
      .sort((a, b) => b.count - a.count);

    // --- NEW QUERIES FOR TOP UNIVERSITIES ---
    const topUniversitiesResult = await prisma.applicant.groupBy({
      by: ["universityId"],
      where: {
        workspaceId,
        status: "ACTIVE",
        mentor: activeUnivFilter,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
      take: 5,
    });

    const topUniversities = await Promise.all(
      topUniversitiesResult.map(async (item) => {
        if (!item.universityId) {
          return { name: "Tanpa Universitas", count: item._count.id };
        }
        const univ = await prisma.university.findUnique({
          where: { id: item.universityId },
          select: { name: true },
        });
        return {
          name: univ?.name || "Tidak Diketahui",
          count: item._count.id,
        };
      })
    );

    // --- NEW QUERIES FOR DAILY ACTIVITY (LAST 30 DAYS) ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [logbooksLast30Days, outputsLast30Days] = await Promise.all([
      prisma.logbook.findMany({
        where: {
          workspaceId,
          createdAt: { gte: thirtyDaysAgo },
          createdBy: activeUnivFilter,
        },
        select: { createdAt: true },
      }),
      prisma.outputReport.findMany({
        where: {
          workspaceId,
          createdAt: { gte: thirtyDaysAgo },
          applicant: {
            status: "ACTIVE",
            mentor: activeUnivFilter,
          },
        },
        select: { createdAt: true },
      }),
    ]);

    const activityChartData = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const dateStr = d.toISOString().split("T")[0];
      return {
        date: dateStr,
        logbook: 0,
        output: 0,
      };
    });

    logbooksLast30Days.forEach((log) => {
      const dateStr = log.createdAt.toISOString().split("T")[0];
      const item = activityChartData.find((x) => x.date === dateStr);
      if (item) item.logbook++;
    });

    outputsLast30Days.forEach((out) => {
      const dateStr = out.createdAt.toISOString().split("T")[0];
      const item = activityChartData.find((x) => x.date === dateStr);
      if (item) item.output++;
    });

    // --- NEW QUERIES FOR PERFORMANCE CHART (6-MONTH TIMELINE) ---
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const logbooksLast6Months = await prisma.logbook.findMany({
      where: {
        workspaceId,
        createdAt: { gte: sixMonthsAgo },
        createdBy: activeUnivFilter,
      },
      select: { createdAt: true },
    });

    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const performanceChartData: { month: string; monthNum: number; year: number; target: number; realisasi: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      performanceChartData.push({
        month: monthNames[d.getMonth()],
        monthNum: d.getMonth(),
        year: d.getFullYear(),
        target: Math.max(totalApplicants * 4, 10),
        realisasi: 0,
      });
    }

    logbooksLast6Months.forEach((log) => {
      const logMonth = log.createdAt.getMonth();
      const logYear = log.createdAt.getFullYear();
      const item = performanceChartData.find((x) => x.monthNum === logMonth && x.year === logYear);
      if (item) {
        item.realisasi++;
      }
    });

    // --- NEW PROGRESS METRICS ---
    const [
      verifiedLogbooksCount,
      approvedOutputsCount,
      totalOutputReports,
      revenueSumResult,
    ] = await Promise.all([
      prisma.logbook.count({
        where: {
          workspaceId,
          verificationStatus: "APPROVED",
          createdBy: activeUnivFilter,
        },
      }),
      prisma.outputReport.count({
        where: {
          workspaceId,
          verificationStatus: "APPROVED",
          applicant: {
            status: "ACTIVE",
            mentor: activeUnivFilter,
          },
        },
      }),
      prisma.outputReport.count({
        where: {
          workspaceId,
          applicant: {
            status: "ACTIVE",
            mentor: activeUnivFilter,
          },
        },
      }),
      prisma.outputReport.aggregate({
        where: {
          workspaceId,
          verificationStatus: "APPROVED",
          applicant: {
            status: "ACTIVE",
            mentor: activeUnivFilter,
          },
        },
        _sum: {
          revenue: true,
        },
      }),
    ]);

    const totalRevenue = revenueSumResult._sum.revenue || 0;

    const stats = {
      totalApplicants,
      totalMentors,
      pendingLogbooks,
      totalLogbooks,
      totalUniversities,
      activeApplicants: totalApplicants,
      totalApplicantsAll: totalApplicantsAll,
      activeMentors: totalMentors,
      totalMentorsAll: totalMentorsAll,
      activeUniversities: totalUniversities,
      totalUniversitiesAll: totalUniversitiesAll,
      employeeAddedCount: employeeCountResult,
      topProvinces,
      ageGroups,
      genderGroups,
      topEducations,
      topSectors,
      topUniversities,
      activityChartData,
      performanceChartData,
      verifiedLogbooksCount,
      approvedOutputsCount,
      totalOutputReports,
      totalRevenue,
    };

    await setCache(cacheKey, stats, 60); // cache for 60 seconds
    return jsonResponse(stats);
  } catch (error: any) {
    console.error("[GET /api/dashboard/stats error]:", error);
    return errorResponse("Failed to fetch dashboard stats", 500);
  }
}
