import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireWorkspaceAccess, requireWorkspaceRole, requireWorkspaceWriteAccess } from "@/lib/rbac";
import { clearApplicantsCache } from "@/lib/cache-helpers";
import { createActivity } from "@/lib/activity-log";
import { z } from "zod";

const createRecommendationSchema = z.object({
  applicantId: z.string().min(1, "applicantId is required"),
  workspaceId: z.string().min(1, "workspaceId is required"),
  findings: z.array(z.string()).optional().default([]),
  recommendations: z.array(z.string()).optional().default([]),
  mentorNote: z.string().optional().nullable(),
  submitNow: z.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const applicantId = searchParams.get("applicantId");
    const mentorId = searchParams.get("mentorId");
    const status = searchParams.get("status");

    if (!workspaceId) {
      return errorResponse("workspaceId is required", 400);
    }

    const access = await requireWorkspaceAccess(request, workspaceId);
    if (!access.ok) return access.response;

    const { user, membership } = access.data;
    const whereAnd: any[] = [{ workspaceId }];

    if (applicantId) whereAnd.push({ applicantId });
    if (mentorId) whereAnd.push({ mentorId });
    if (status && status !== "ALL") whereAnd.push({ status });

    // RBAC filtering
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
          applicant: {
            universityId: membership.universityId,
          },
        });
      }
    }

    const recommendations = await prisma.followUpRecommendation.findMany({
      where: {
        AND: whereAnd,
      },
      include: {
        applicant: {
          include: {
            profile: true,
            businessProfile: true,
            university: true,
          },
        },
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
      orderBy: { updatedAt: "desc" },
    });

    return jsonResponse(recommendations);
  } catch (error: any) {
    console.error("[GET /api/follow-up-recommendations error]:", error);
    return errorResponse("Failed to fetch follow-up recommendations", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request, createRecommendationSchema);
    const { applicantId, workspaceId, findings, recommendations, mentorNote, submitNow } = body;

    const access = await requireWorkspaceRole(request, workspaceId, ["MENTOR"]);
    if (!access.ok) return access.response;

    const writePerm = await requireWorkspaceWriteAccess(request, workspaceId);
    if (!writePerm.ok) return writePerm.response;

    const { membership, user } = access.data;
    if (!membership) {
      return errorResponse("Only mentors can create follow-up recommendations", 403);
    }

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
      include: {
        outputReports: {
          where: { verificationStatus: "APPROVED" },
          select: { monthReport: true },
        },
        followUpRecommendation: true,
        profile: true,
      },
    });

    if (!applicant) {
      return errorResponse("Applicant not found", 404);
    }

    // Verify mentor assignment
    if (applicant.mentorId !== membership.id && user.globalRole !== "SUPER_ADMIN") {
      return errorResponse("Forbidden: You are not assigned as the mentor for this participant", 403);
    }

    // Verify B1, B2, B3 are approved
    const approvedMonths = new Set(applicant.outputReports.map((r) => r.monthReport));
    if (!approvedMonths.has(1) || !approvedMonths.has(2) || !approvedMonths.has(3)) {
      return errorResponse(
        "Cannot create recommendation: Output reports for months 1, 2, and 3 must all be APPROVED first.",
        400
      );
    }

    // If already exists
    if (applicant.followUpRecommendation) {
      return jsonResponse(
        {
          error: "Follow-up recommendation already exists for this participant. Use update endpoint.",
          existingId: applicant.followUpRecommendation.id,
        },
        409
      );
    }

    const status = submitNow ? "SUBMITTED" : "DRAFT";
    const submittedAt = submitNow ? new Date() : null;

    const newRecommendation = await prisma.followUpRecommendation.create({
      data: {
        applicantId,
        mentorId: membership.id,
        workspaceId,
        findings: findings || [],
        recommendations: recommendations || [],
        mentorNote: mentorNote || null,
        status,
        submittedAt,
      },
      include: {
        applicant: {
          include: { profile: true },
        },
        mentor: {
          include: { user: { include: { profile: true } } },
        },
      },
    });

    await clearApplicantsCache(workspaceId);

    await createActivity({
      workspaceId,
      userId: user.id,
      type: submitNow ? "FOLLOW_UP_SUBMITTED" : "FOLLOW_UP_CREATED",
      title: submitNow ? "Rekomendasi Tindak Lanjut Diajukan" : "Draft Rekomendasi Tindak Lanjut Dibuat",
      description: `Rekomendasi tindak lanjut untuk ${applicant.profile.name} telah ${
        submitNow ? "diajukan ke Admin" : "disimpan sebagai draft"
      }.`,
      status: submitNow ? "blue" : "indigo",
      metadata: { recommendationId: newRecommendation.id, applicantId },
    });

    return jsonResponse(newRecommendation, 201);
  } catch (error: any) {
    console.error("[POST /api/follow-up-recommendations error]:", error);
    return errorResponse(error.message || "Failed to create follow-up recommendation", 500);
  }
}
