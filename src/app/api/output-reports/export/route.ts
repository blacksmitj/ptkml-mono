import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { requireWorkspaceAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return errorResponse("workspaceId is required", 400);
    }

    const access = await requireWorkspaceAccess(request, workspaceId);
    if (!access.ok) return access.response;

    const { user, membership } = access.data;
    const whereAnd: any[] = [{ workspaceId }];

    if (user.globalRole !== "SUPER_ADMIN" && user.globalRole !== "WORKSPACE_SUPERVISOR") {
      if (!membership) {
        return errorResponse("Forbidden: No access to this workspace", 403);
      }
      if (membership.role === "MENTOR") {
        whereAnd.push({ applicant: { mentorId: membership.id } });
      } else if (
        membership.role === "UNIVERSITY_ADMIN" ||
        membership.role === "UNIVERSITY_SUPERVISOR"
      ) {
        whereAnd.push({
          applicant: { mentor: { universityId: membership.universityId } },
        });
      }
    }

    const verificationStatus = searchParams.get("verificationStatus");
    if (verificationStatus && verificationStatus !== "ALL") {
      whereAnd.push({ verificationStatus });
    }

    const monthReport = searchParams.get("monthReport");
    if (monthReport !== null && monthReport !== "ALL" && monthReport !== "") {
      whereAnd.push({ monthReport: parseInt(monthReport, 10) });
    }

    const search = searchParams.get("search");
    if (search) {
      const searchVal = search.trim();
      whereAnd.push({
        OR: [
          { businessCondition: { contains: searchVal, mode: "insensitive" } },
          { obstacle: { contains: searchVal, mode: "insensitive" } },
          {
            applicant: {
              profile: {
                OR: [
                  { name: { contains: searchVal, mode: "insensitive" } },
                  { nik: { contains: searchVal, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      });
    }

    const reports = await prisma.outputReport.findMany({
      where: { AND: whereAnd },
      include: {
        applicant: {
          include: {
            profile: {
              include: {
                addresses: true,
              },
            },
            businessProfile: true,
            mentor: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
            university: true,
          },
        },
        files: true,
        employees: { include: { files: true } },
        verifiedBy: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      orderBy: [{ monthReport: "desc" }, { createdAt: "desc" }],
    });

    const canViewNik =
      user.globalRole === "SUPER_ADMIN" || user.globalRole === "WORKSPACE_SUPERVISOR";

    if (!canViewNik) {
      reports.forEach((rep: any) => {
        if (rep.applicant?.profile) {
          rep.applicant.profile.nik = "-";
        }
        if (rep.employees && Array.isArray(rep.employees)) {
          rep.employees.forEach((emp: any) => {
            emp.nik = "-";
          });
        }
      });
    }

    return jsonResponse(reports);
  } catch (error: any) {
    console.error("[GET /api/output-reports/export error]:", error);
    return errorResponse("Failed to export output reports", 500);
  }
}
