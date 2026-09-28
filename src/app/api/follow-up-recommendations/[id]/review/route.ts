import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireWorkspaceRole, requireWorkspaceWriteAccess } from "@/lib/rbac";
import { clearApplicantsCache } from "@/lib/cache-helpers";
import { createActivity } from "@/lib/activity-log";
import { z } from "zod";

const reviewRecommendationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "SUBMITTED"]),
  reviewNote: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await parseBody(request, reviewRecommendationSchema);
    const { status, reviewNote } = body;

    if (status === "REJECTED" && !reviewNote) {
      return errorResponse("Catatan revisi wajib diisi jika rekomendasi dibatalkan/ditolak", 400);
    }

    const existing = await prisma.followUpRecommendation.findUnique({
      where: { id },
      include: {
        applicant: {
          include: { profile: true },
        },
      },
    });

    if (!existing) {
      return errorResponse("Recommendation not found", 404);
    }

    const access = await requireWorkspaceRole(request, existing.workspaceId, [
      "UNIVERSITY_ADMIN",
    ]);
    if (!access.ok) return access.response;

    const writePerm = await requireWorkspaceWriteAccess(request, existing.workspaceId);
    if (!writePerm.ok) return writePerm.response;

    const { membership, user } = access.data;
    // University admin can only review applicants in their university
    if (user.globalRole !== "SUPER_ADMIN" && user.globalRole !== "WORKSPACE_SUPERVISOR") {
      if (membership && existing.applicant.universityId !== membership.universityId) {
        return errorResponse("Forbidden: This applicant belongs to another university", 403);
      }
    }

    const isCancel = status === "SUBMITTED";

    const updated = await prisma.followUpRecommendation.update({
      where: { id },
      data: {
        status,
        reviewNote: isCancel ? null : reviewNote || null,
        reviewedAt: isCancel ? null : new Date(),
        reviewedById: isCancel ? null : membership?.id || null,
      },
      include: {
        applicant: { include: { profile: true } },
        mentor: { include: { user: { include: { profile: true } } } },
        reviewedBy: { include: { user: { include: { profile: true } } } },
      },
    });

    await clearApplicantsCache(existing.workspaceId);

    if (isCancel) {
      await createActivity({
        workspaceId: existing.workspaceId,
        userId: user.id,
        type: "FOLLOW_UP_UNVERIFIED",
        title: "Verifikasi Rekomendasi Tindak Lanjut Dibatalkan",
        description: `Verifikasi rekomendasi tindak lanjut untuk ${existing.applicant.profile.name} telah dibatalkan oleh Admin Universitas.`,
        status: "amber",
        metadata: { recommendationId: id, applicantId: existing.applicantId },
      });
    } else {
      const isApproved = status === "APPROVED";
      await createActivity({
        workspaceId: existing.workspaceId,
        userId: user.id,
        type: isApproved ? "FOLLOW_UP_APPROVED" : "FOLLOW_UP_REJECTED",
        title: isApproved ? "Rekomendasi Tindak Lanjut Disetujui" : "Rekomendasi Tindak Lanjut Perlu Revisi",
        description: isApproved
          ? `Rekomendasi tindak lanjut untuk ${existing.applicant.profile.name} telah disetujui.`
          : `Rekomendasi tindak lanjut untuk ${existing.applicant.profile.name} ditolak/minta revisi dengan catatan: "${reviewNote}".`,
        status: isApproved ? "emerald" : "destructive",
        metadata: { recommendationId: id, applicantId: existing.applicantId, reviewNote },
      });
    }

    return jsonResponse(updated);
  } catch (error: any) {
    console.error("[PATCH /api/follow-up-recommendations/:id/review error]:", error);
    return errorResponse(error.message || "Failed to review follow-up recommendation", 500);
  }
}
