import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireAuth, requireWorkspaceAccess, requireWorkspaceRole, requireWorkspaceWriteAccess } from "@/lib/rbac";
import { clearApplicantsCache } from "@/lib/cache-helpers";
import { createActivity } from "@/lib/activity-log";
import { z } from "zod";

const updateRecommendationSchema = z.object({
  findings: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  mentorNote: z.string().optional().nullable(),
  submitNow: z.boolean().optional().default(false),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicantId } = await context.params;
    const authResult = await requireAuth(request);
    if (!authResult.ok) return authResult.response;

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
      include: {
        profile: true,
        businessProfile: true,
        university: true,
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
      },
    });

    if (!applicant) {
      return errorResponse("Applicant not found", 404);
    }

    const access = await requireWorkspaceAccess(request, applicant.workspaceId);
    if (!access.ok) return access.response;

    // Check if B1-B3 are approved
    const approvedReports = (applicant.outputReports || []).filter(
      (r) => r.verificationStatus === "APPROVED"
    );
    const hasB1 = approvedReports.some((r) => r.monthReport === 1);
    const hasB2 = approvedReports.some((r) => r.monthReport === 2);
    const hasB3 = approvedReports.some((r) => r.monthReport === 3);
    const isEligible = hasB1 && hasB2 && hasB3;

    const recommendation = await prisma.followUpRecommendation.findUnique({
      where: { applicantId },
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
    });

    return jsonResponse({
      applicant,
      isEligible,
      recommendation,
    });
  } catch (error: any) {
    console.error("[GET /api/follow-up-recommendations/:id error]:", error);
    return errorResponse("Failed to fetch follow-up recommendation", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await parseBody(request, updateRecommendationSchema);
    const { findings, recommendations, mentorNote, submitNow } = body;

    const existing = await prisma.followUpRecommendation.findUnique({
      where: { id },
      include: {
        applicant: { include: { profile: true } },
      },
    });

    if (!existing) {
      return errorResponse("Recommendation not found", 404);
    }

    const access = await requireWorkspaceRole(request, existing.workspaceId, ["MENTOR"]);
    if (!access.ok) return access.response;

    const writePerm = await requireWorkspaceWriteAccess(request, existing.workspaceId);
    if (!writePerm.ok) return writePerm.response;

    const { membership, user } = access.data;
    if (!membership || (existing.mentorId !== membership.id && user.globalRole !== "SUPER_ADMIN")) {
      return errorResponse("Forbidden: You cannot edit this recommendation", 403);
    }

    // Can only edit if status is DRAFT or REJECTED
    if (existing.status === "APPROVED" || existing.status === "SUBMITTED") {
      return errorResponse(
        `Cannot edit recommendation with status ${existing.status}. It is currently under review or already approved.`,
        400
      );
    }

    const newStatus = submitNow ? "SUBMITTED" : existing.status;
    const submittedAt = submitNow ? new Date() : existing.submittedAt;

    const updated = await prisma.followUpRecommendation.update({
      where: { id },
      data: {
        findings: findings !== undefined ? (findings as any) : existing.findings,
        recommendations: recommendations !== undefined ? (recommendations as any) : existing.recommendations,
        mentorNote: mentorNote !== undefined ? mentorNote : existing.mentorNote,
        status: newStatus,
        submittedAt,
        ...(submitNow ? { reviewNote: null, reviewedAt: null, reviewedById: null } : {}),
      },
      include: {
        applicant: { include: { profile: true } },
        mentor: { include: { user: { include: { profile: true } } } },
      },
    });

    await clearApplicantsCache(existing.workspaceId);

    if (submitNow) {
      await createActivity({
        workspaceId: existing.workspaceId,
        userId: user.id,
        type: "FOLLOW_UP_SUBMITTED",
        title: "Rekomendasi Tindak Lanjut Diajukan",
        description: `Rekomendasi tindak lanjut untuk ${existing.applicant.profile.name} telah diajukan ke Admin.`,
        status: "blue",
        metadata: { recommendationId: id, applicantId: existing.applicantId },
      });
    }

    return jsonResponse(updated);
  } catch (error: any) {
    console.error("[PATCH /api/follow-up-recommendations/:id error]:", error);
    return errorResponse(error.message || "Failed to update follow-up recommendation", 500);
  }
}
