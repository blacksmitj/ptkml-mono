import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireAuth, requireWorkspaceWriteAccess } from "@/lib/rbac";
import { computeRecapMetrics } from "@/lib/applicant-helpers";
import { clearApplicantsCache } from "@/lib/cache-helpers";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.ok) return authResult.response;

    const { id } = await context.params;
    const applicant = await prisma.applicant.findUnique({
      where: { id },
      include: {
        profile: {
          include: {
            addresses: true,
          },
        },
        university: true,
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
        outputReports: {
          include: {
            employees: true,
          },
          orderBy: { monthReport: "asc" },
        },
        logbooks: {
          include: {
            logbook: true,
          },
        },
        followUpRecommendation: {
          include: {
            mentor: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
            reviewedBy: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            logbooks: true,
          },
        },
      },
    });

    if (!applicant) {
      return errorResponse("Applicant not found", 404);
    }

    return jsonResponse({
      ...applicant,
      ...computeRecapMetrics(applicant),
    });
  } catch (error: any) {
    console.error("[GET /api/applicants/:id error]:", error);
    return errorResponse("Failed to fetch applicant", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const applicant = await prisma.applicant.findUnique({
      where: { id },
    });
    if (!applicant) {
      return errorResponse("Applicant not found", 404);
    }

    const access = await requireWorkspaceWriteAccess(request, applicant.workspaceId);
    if (!access.ok) return access.response;

    const { user, membership } = access.data;

    if (user.globalRole !== "SUPER_ADMIN") {
      if (!membership) {
        return errorResponse("Forbidden: No access to this workspace", 403);
      }
      if (membership.role === "MENTOR") {
        if (applicant.mentorId !== membership.id) {
          return errorResponse("Forbidden: You are not the mentor of this applicant", 403);
        }
      } else if (
        membership.role === "UNIVERSITY_ADMIN" ||
        membership.role === "UNIVERSITY_SUPERVISOR"
      ) {
        if (applicant.universityId !== membership.universityId) {
          return errorResponse("Forbidden: Applicant is not allocated to your university", 403);
        }
      } else {
        return errorResponse("Forbidden: Insufficient role in workspace", 403);
      }
    }

    const body = await request.json();
    const updatedApplicant = await prisma.applicant.update({
      where: { id },
      data: {
        universityId: body.universityId,
        mentorId: body.mentorId,
        communicationStatus: body.communicationStatus,
        fundDisbursement: body.fundDisbursement,
        willingness: body.willingness,
        reasonNotWilling: body.reasonNotWilling,
        presenceStatus: body.presenceStatus,
        status: body.status,
        reasonDropped: body.reasonDropped,
        profile: body.profileId || body.name || body.nik
          ? {
              update: {
                name: body.name,
                nik: body.nik,
                birthPlace: body.birthPlace,
                birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
                gender: body.gender,
                email: body.email,
                whatsapp: body.whatsapp,
                photo: body.photo,
                hasDisability:
                  body.hasDisability !== undefined ? Boolean(body.hasDisability) : undefined,
                disabilityType: body.hasDisability ? body.disabilityType || null : null,
              },
            }
          : undefined,
      },
    });

    if (body.businessProfile) {
      await prisma.businessProfile.upsert({
        where: { applicantId: id },
        create: {
          applicantId: id,
          businessName: body.businessProfile.businessName || "-",
          businessSector: body.businessProfile.businessSector || "-",
          businessType: body.businessProfile.businessType || "-",
          description: body.businessProfile.description || null,
          mainProduct: body.businessProfile.mainProduct || null,
        },
        update: {
          businessName: body.businessProfile.businessName,
          businessSector: body.businessProfile.businessSector,
          businessType: body.businessProfile.businessType,
          description: body.businessProfile.description,
          mainProduct: body.businessProfile.mainProduct,
        },
      });
    }

    if (body.businessAddress && applicant.profileId) {
      const existingAddress = await prisma.address.findFirst({
        where: {
          profileId: applicant.profileId,
          label: "BUSINESS",
        },
      });

      if (existingAddress) {
        await prisma.address.update({
          where: { id: existingAddress.id },
          data: {
            address: body.businessAddress.address,
            provinceId: body.businessAddress.provinceId,
            provinceName: body.businessAddress.provinceName,
            cityId: body.businessAddress.cityId,
            cityName: body.businessAddress.cityName,
            districtId: body.businessAddress.districtId,
            districtName: body.businessAddress.districtName,
            subdistrictId: body.businessAddress.subdistrictId,
            subdistrictName: body.businessAddress.subdistrictName,
            postalCode: body.businessAddress.postalCode,
          },
        });
      } else {
        await prisma.address.create({
          data: {
            profileId: applicant.profileId,
            label: "BUSINESS",
            address: body.businessAddress.address,
            provinceId: body.businessAddress.provinceId,
            provinceName: body.businessAddress.provinceName,
            cityId: body.businessAddress.cityId,
            cityName: body.businessAddress.cityName,
            districtId: body.businessAddress.districtId,
            districtName: body.businessAddress.districtName,
            subdistrictId: body.businessAddress.subdistrictId,
            subdistrictName: body.businessAddress.subdistrictName,
            postalCode: body.businessAddress.postalCode,
          },
        });
      }
    }

    await clearApplicantsCache(updatedApplicant.workspaceId);

    return jsonResponse(updatedApplicant);
  } catch (error: any) {
    console.error("[PATCH /api/applicants/:id error]:", error);
    return errorResponse("Failed to update applicant", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const applicant = await prisma.applicant.findUnique({
      where: { id },
      select: { workspaceId: true, profileId: true },
    });
    if (!applicant) {
      return errorResponse("Applicant not found", 404);
    }

    const access = await requireWorkspaceWriteAccess(request, applicant.workspaceId);
    if (!access.ok) return access.response;

    const { user } = access.data;
    if (user.globalRole !== "SUPER_ADMIN") {
      return errorResponse("Forbidden: Only Super Admin can delete applicants", 403);
    }

    // 1. Cari logbook yang terkait dengan peserta ini
    const logbookApplicants = await prisma.logbookApplicant.findMany({
      where: { applicantId: id },
      select: { logbookId: true },
    });
    const logbookIds = logbookApplicants.map((la) => la.logbookId);

    const logbooksToDelete: string[] = [];
    for (const logbookId of logbookIds) {
      const count = await prisma.logbookApplicant.count({
        where: { logbookId },
      });
      if (count <= 1) {
        logbooksToDelete.push(logbookId);
      }
    }

    // 2. Cari semua OutputReport terkait peserta ini
    const outputReports = await prisma.outputReport.findMany({
      where: { applicantId: id },
      select: { id: true },
    });
    const outputReportIds = outputReports.map((o) => o.id);

    // 3. Cari semua ID file yang akan terpengaruh untuk membersihkan OcrJob
    const files = await prisma.file.findMany({
      where: {
        OR: [
          { applicantId: id },
          { outputId: { in: outputReportIds } },
          { logbookId: { in: logbooksToDelete } },
          { employee: { outputId: { in: outputReportIds } } },
        ],
      },
      select: { id: true },
    });
    const fileIds = files.map((f) => f.id);

    await prisma.$transaction(async (tx) => {
      if (fileIds.length > 0) {
        await tx.ocrJob.deleteMany({
          where: { fileId: { in: fileIds } },
        });
      }

      if (logbooksToDelete.length > 0) {
        await tx.logbook.deleteMany({
          where: { id: { in: logbooksToDelete } },
        });
      }

      if (outputReportIds.length > 0) {
        await tx.outputReport.deleteMany({
          where: { id: { in: outputReportIds } },
        });
      }

      await tx.applicant.delete({
        where: { id },
      });

      if (applicant.profileId) {
        const profileHasUser = await tx.user.findUnique({
          where: { profileId: applicant.profileId },
          select: { id: true },
        });

        if (!profileHasUser) {
          await tx.address.deleteMany({
            where: { profileId: applicant.profileId },
          });
          await tx.profile.delete({
            where: { id: applicant.profileId },
          });
        }
      }
    });

    await clearApplicantsCache(applicant.workspaceId);

    return new Response(null, { status: 204 });
  } catch (error: any) {
    console.error("[DELETE /api/applicants/:id error]:", error);
    return errorResponse("Failed to delete applicant", 500);
  }
}
