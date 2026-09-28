import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { requireWorkspaceAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const mentorId = searchParams.get("mentorId");
    const universityId = searchParams.get("universityId");

    if (!workspaceId) {
      return errorResponse("workspaceId is required", 400);
    }

    const access = await requireWorkspaceAccess(request, workspaceId);
    if (!access.ok) return access.response;

    const { user, membership } = access.data;
    const recWhereAnd: any[] = [{ workspaceId }];
    const appWhereAnd: any[] = [{ workspaceId, status: "ACTIVE" }];

    // RBAC filtering
    if (user.globalRole !== "SUPER_ADMIN" && user.globalRole !== "WORKSPACE_SUPERVISOR") {
      if (!membership) {
        return errorResponse("Forbidden: No access to this workspace", 403);
      }
      if (membership.role === "MENTOR") {
        recWhereAnd.push({ mentorId: membership.id });
        appWhereAnd.push({ mentorId: membership.id });
      } else if (
        membership.role === "UNIVERSITY_ADMIN" ||
        membership.role === "UNIVERSITY_SUPERVISOR"
      ) {
        recWhereAnd.push({
          applicant: {
            universityId: membership.universityId,
          },
        });
        appWhereAnd.push({
          universityId: membership.universityId,
        });
      }
    } else {
      if (mentorId) {
        recWhereAnd.push({ mentorId });
        appWhereAnd.push({ mentorId });
      }
      if (universityId) {
        recWhereAnd.push({
          applicant: {
            universityId,
          },
        });
        appWhereAnd.push({
          universityId,
        });
      }
    }

    // 1. Get status counts for recommendations
    const statusGroups = await prisma.followUpRecommendation.groupBy({
      by: ["status"],
      where: {
        AND: recWhereAnd,
      },
      _count: {
        _all: true,
      },
    });

    let draft = 0;
    let submitted = 0;
    let approved = 0;
    let rejected = 0;
    let total = 0;

    for (const item of statusGroups) {
      const count = item._count._all;
      total += count;
      if (item.status === "DRAFT") draft = count;
      else if (item.status === "SUBMITTED") submitted = count;
      else if (item.status === "APPROVED") approved = count;
      else if (item.status === "REJECTED") rejected = count;
    }

    // 2. Calculate eligible applicants (Month 1, 2, 3 Output Reports APPROVED)
    const activeApplicants = await prisma.applicant.findMany({
      where: {
        AND: appWhereAnd,
      },
      select: {
        id: true,
        outputReports: {
          where: { verificationStatus: "APPROVED" },
          select: { monthReport: true },
        },
        followUpRecommendation: {
          select: { id: true, status: true },
        },
      },
    });

    let eligible = 0;
    let pendingCreation = 0;

    for (const app of activeApplicants) {
      const approvedMonths = new Set(app.outputReports.map((r) => r.monthReport));
      const isEligible = approvedMonths.has(1) && approvedMonths.has(2) && approvedMonths.has(3);
      if (isEligible) {
        eligible++;
        if (!app.followUpRecommendation) {
          pendingCreation++;
        }
      }
    }

    return jsonResponse({
      total,
      draft,
      submitted,
      approved,
      rejected,
      eligible,
      pendingCreation,
    });
  } catch (error: any) {
    console.error("[GET /api/follow-up-recommendations/stats error]:", error);
    return errorResponse("Failed to fetch follow-up recommendation stats", 500);
  }
}
