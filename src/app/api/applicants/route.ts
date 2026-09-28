import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireWorkspaceAccess, requireWorkspaceWriteAccess } from "@/lib/rbac";
import { computeRecapMetrics } from "@/lib/applicant-helpers";
import { clearApplicantsCache } from "@/lib/cache-helpers";
import { z } from "zod";

const createApplicantSchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),
  idTkm: z.string().min(1, "idTkm is required"),
  profileId: z.string().min(1, "profileId is required"),
  universityId: z.string().optional().nullable(),
  mentorId: z.string().optional().nullable(),
  communicationStatus: z.enum(["RESPONDED", "NO_RESPONSE"]).optional().default("NO_RESPONSE"),
  fundDisbursement: z.enum(["DISBURSED", "NOT_DISBURSED"]).optional().default("NOT_DISBURSED"),
  willingness: z.enum(["WILLING", "NOT_WILLING"]).optional().default("NOT_WILLING"),
  reasonNotWilling: z.string().optional().nullable(),
  presenceStatus: z.enum(["FOUND", "NOT_FOUND"]).optional().default("FOUND"),
  status: z.enum(["ACTIVE", "DROPPED", "PENDING"]).optional().default("ACTIVE"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const mentorId = searchParams.get("mentorId");

    if (!workspaceId) {
      return errorResponse("workspaceId is required", 400);
    }

    const access = await requireWorkspaceAccess(request, workspaceId);
    if (!access.ok) return access.response;

    const { user, membership } = access.data;

    const whereAnd: any[] = [{ workspaceId }];
    if (mentorId) {
      whereAnd.push({ mentorId });
    }

    if (user.globalRole !== "SUPER_ADMIN" && user.globalRole !== "WORKSPACE_SUPERVISOR") {
      if (!membership) {
        return errorResponse("Forbidden: No access to this workspace", 403);
      }
      if (membership.role === "MENTOR") {
        whereAnd.push({ mentorId: membership.id });
      } else if (
        membership.role === "UNIVERSITY_ADMIN" ||
        membership.role === "UNIVERSITY_SUPERVISOR"
      ) {
        whereAnd.push({
          universityId: membership.universityId,
        });
      }
    }

    const status = searchParams.get("status");
    if (status && status !== "ALL") {
      whereAnd.push({ status });
    }

    const mentorStatus = searchParams.get("mentorStatus");
    if (mentorStatus && mentorStatus !== "ALL") {
      if (mentorStatus === "ASSIGNED") {
        whereAnd.push({ mentorId: { not: null } });
      } else if (mentorStatus === "UNASSIGNED") {
        whereAnd.push({ mentorId: null });
      }
    }

    const communicationStatus = searchParams.get("communicationStatus");
    if (communicationStatus && communicationStatus !== "ALL") {
      whereAnd.push({ communicationStatus });
    }

    const presenceStatus = searchParams.get("presenceStatus");
    if (presenceStatus && presenceStatus !== "ALL") {
      whereAnd.push({ presenceStatus });
    }

    const willingness = searchParams.get("willingness");
    if (willingness && willingness !== "ALL") {
      whereAnd.push({ willingness });
    }

    const fundDisbursement = searchParams.get("fundDisbursement");
    if (fundDisbursement && fundDisbursement !== "ALL") {
      whereAnd.push({ fundDisbursement });
    }

    const universityIdParam = searchParams.get("universityId");
    if (universityIdParam) {
      if (universityIdParam === "unassigned") {
        whereAnd.push({ universityId: null });
      } else if (universityIdParam !== "ALL") {
        whereAnd.push({ universityId: universityIdParam });
      }
    }

    const search = searchParams.get("search");
    if (search) {
      const searchVal = search.trim();
      whereAnd.push({
        OR: [
          { idTkm: { contains: searchVal, mode: "insensitive" } },
          {
            profile: {
              OR: [
                { name: { contains: searchVal, mode: "insensitive" } },
                { nik: { contains: searchVal, mode: "insensitive" } },
              ],
            },
          },
        ],
      });
    }

    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";
    const sortBy = searchParams.get("sortBy");
    let orderBy: any = { createdAt: "desc" };

    if (sortBy) {
      if (sortBy === "name") {
        orderBy = { profile: { name: sortOrder } };
      } else if (sortBy === "universityName") {
        orderBy = { university: { name: sortOrder } };
      } else if (sortBy === "mentorName") {
        orderBy = { mentor: { user: { profile: { name: sortOrder } } } };
      } else if (
        ![
          "mentoringCount",
          "offlineIndividualVisitCount",
          "avgRevenue",
          "revenueChangePercentage",
          "avgProduction",
          "productionChangePercentage",
        ].includes(sortBy)
      ) {
        orderBy = { [sortBy]: sortOrder };
      }
    }

    const applicantSelect = {
      id: true,
      idTkm: true,
      workspaceId: true,
      universityId: true,
      mentorId: true,
      profileId: true,
      communicationStatus: true,
      fundDisbursement: true,
      willingness: true,
      reasonNotWilling: true,
      presenceStatus: true,
      status: true,
      reasonDropped: true,
      createdAt: true,
      updatedAt: true,
      profile: {
        select: {
          id: true,
          name: true,
          nik: true,
          gender: true,
          photo: true,
          email: true,
          whatsapp: true,
          lastEducation: true,
          hasDisability: true,
        },
      },
      university: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
      mentor: {
        select: {
          id: true,
          role: true,
          user: {
            select: {
              id: true,
              profile: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  whatsapp: true,
                },
              },
            },
          },
          university: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      businessProfile: {
        select: {
          id: true,
          businessName: true,
          businessSector: true,
          businessType: true,
          mainProduct: true,
        },
      },
      followUpRecommendation: {
        select: {
          id: true,
          status: true,
          updatedAt: true,
          reviewNote: true,
        },
      },
      _count: {
        select: {
          logbooks: true,
          outputReports: true,
        },
      },
      outputReports: {
        where: {
          verificationStatus: "APPROVED" as const,
        },
        select: {
          id: true,
          monthReport: true,
          revenue: true,
          productionCapacity: true,
          verificationStatus: true,
        },
        orderBy: {
          monthReport: "asc" as const,
        },
      },
      logbooks: {
        where: {
          logbook: {
            verificationStatus: "APPROVED" as const,
            deliveryMethod: "OFFLINE" as const,
            meetingType: "INDIVIDUAL" as const,
          },
        },
        select: {
          logbookId: true,
          logbook: {
            select: {
              deliveryMethod: true,
              meetingType: true,
              verificationStatus: true,
            },
          },
        },
      },
    };

    const isPaginated = searchParams.get("page") !== null;

    if (isPaginated) {
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
      const skip = (page - 1) * limit;

      const isCalculatedMetricSort =
        sortBy &&
        [
          "mentoringCount",
          "offlineIndividualVisitCount",
          "avgRevenue",
          "revenueChangePercentage",
          "avgProduction",
          "productionChangePercentage",
        ].includes(sortBy);

      if (isCalculatedMetricSort) {
        const allApplicants = await prisma.applicant.findMany({
          where: {
            AND: whereAnd,
          },
          select: applicantSelect,
        });

        const applicantsWithMetrics = allApplicants.map((app: any) => ({
          ...app,
          ...computeRecapMetrics(app),
        }));

        applicantsWithMetrics.sort((a: any, b: any) => {
          const valA = a[sortBy] ?? 0;
          const valB = b[sortBy] ?? 0;
          if (valA < valB) return sortOrder === "asc" ? -1 : 1;
          if (valA > valB) return sortOrder === "asc" ? 1 : -1;
          return 0;
        });

        const total = applicantsWithMetrics.length;
        const paginatedData = applicantsWithMetrics.slice(skip, skip + limit);

        return jsonResponse({
          data: paginatedData,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        });
      } else {
        const total = await prisma.applicant.count({
          where: {
            AND: whereAnd,
          },
        });

        const applicants = await prisma.applicant.findMany({
          where: {
            AND: whereAnd,
          },
          select: applicantSelect,
          orderBy,
          skip,
          take: limit,
        });

        const paginatedData = applicants.map((app: any) => ({
          ...app,
          ...computeRecapMetrics(app),
        }));

        return jsonResponse({
          data: paginatedData,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        });
      }
    }

    const isCalculatedMetricSort =
      sortBy &&
      [
        "mentoringCount",
        "offlineIndividualVisitCount",
        "avgRevenue",
        "revenueChangePercentage",
        "avgProduction",
        "productionChangePercentage",
      ].includes(sortBy);

    const applicants = await prisma.applicant.findMany({
      where: {
        AND: whereAnd,
      },
      include: {
        profile: true,
        university: true,
        mentor: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
            university: true,
          },
        },
        businessProfile: true,
        outputReports: {
          where: {
            verificationStatus: "APPROVED",
          },
          orderBy: {
            monthReport: "asc",
          },
        },
        logbooks: {
          where: {
            logbook: {
              verificationStatus: "APPROVED",
            },
          },
          include: {
            logbook: true,
          },
        },
      },
      orderBy: isCalculatedMetricSort ? undefined : orderBy,
    });

    const data = applicants.map((app: any) => ({
      ...app,
      ...computeRecapMetrics(app),
    }));

    if (isCalculatedMetricSort && sortBy) {
      data.sort((a: any, b: any) => {
        const valA = a[sortBy] ?? 0;
        const valB = b[sortBy] ?? 0;
        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return jsonResponse(data);
  } catch (error: any) {
    console.error("[GET /api/applicants error]:", error);
    return errorResponse("Failed to fetch applicants", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request, createApplicantSchema);

    const authWorkspace = await requireWorkspaceWriteAccess(request, body.workspaceId);
    if (!authWorkspace.ok) return authWorkspace.response;

    if (authWorkspace.data.user.globalRole !== "SUPER_ADMIN") {
      return errorResponse("Hanya Super Admin yang diizinkan menambahkan peserta", 403);
    }

    if (body.profileId) {
      const isMemberInSameWorkspace = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: body.workspaceId,
          user: { profileId: body.profileId },
        },
      });
      if (isMemberInSameWorkspace) {
        return errorResponse(
          "Orang ini sudah terdaftar sebagai Pendamping/Anggota di workspace tahun ini.",
          400
        );
      }
    }

    const applicant = await prisma.applicant.create({
      data: {
        idTkm: body.idTkm,
        workspaceId: body.workspaceId,
        universityId: body.universityId || null,
        mentorId: body.mentorId || null,
        profileId: body.profileId,
        communicationStatus: body.communicationStatus,
        fundDisbursement: body.fundDisbursement,
        willingness: body.willingness,
        reasonNotWilling: body.reasonNotWilling || null,
        presenceStatus: body.presenceStatus,
        status: body.status,
      },
      include: {
        profile: true,
        university: true,
      },
    });

    await clearApplicantsCache(body.workspaceId);

    return jsonResponse(applicant, 201);
  } catch (error: any) {
    console.error("[POST /api/applicants error]:", error);
    return errorResponse(error.message || "Failed to create applicant", 500);
  }
}
