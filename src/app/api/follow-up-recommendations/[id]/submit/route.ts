import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { requireWorkspaceRole, requireWorkspaceWriteAccess } from "@/lib/rbac";
import { clearApplicantsCache } from "@/lib/cache-helpers";
import { createActivity } from "@/lib/activity-log";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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
      return errorResponse("Forbidden: Only assigned mentor can submit this recommendation", 403);
    }

    if (existing.status === "APPROVED" || existing.status === "SUBMITTED") {
      return errorResponse(`Recommendation is already ${existing.status}`, 400);
    }

    const updated = await prisma.followUpRecommendation.update({
      where: { id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        reviewNote: null,
        reviewedAt: null,
        reviewedById: null,
      },
      include: {
        applicant: { include: { profile: true } },
        mentor: { include: { user: { include: { profile: true } } } },
      },
    });

    await clearApplicantsCache(existing.workspaceId);

    await createActivity({
      workspaceId: existing.workspaceId,
      userId: user.id,
      type: "FOLLOW_UP_SUBMITTED",
      title: "Rekomendasi Tindak Lanjut Diajukan",
      description: `Rekomendasi tindak lanjut untuk ${existing.applicant.profile.name} telah diajukan ke Admin.`,
      status: "blue",
      metadata: { recommendationId: id, applicantId: existing.applicantId },
    });

    return jsonResponse(updated);
  } catch (error: any) {
    console.error("[PATCH /api/follow-up-recommendations/:id/submit error]:", error);
    return errorResponse("Failed to submit follow-up recommendation", 500);
  }
}
