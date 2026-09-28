import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireWorkspaceWriteAccess } from "@/lib/rbac";
import { clearApplicantsCache } from "@/lib/cache-helpers";
import { z } from "zod";

const progressStatusSchema = z.object({
  communicationStatus: z.enum(["RESPONDED", "NO_RESPONSE"]).optional(),
  fundDisbursement: z.enum(["DISBURSED", "NOT_DISBURSED"]).optional(),
  willingness: z.enum(["WILLING", "NOT_WILLING"]).optional(),
  reasonNotWilling: z.string().optional().nullable(),
  presenceStatus: z.enum(["FOUND", "NOT_FOUND"]).optional(),
  status: z.enum(["ACTIVE", "DROPPED"]).optional(),
  reasonDropped: z.string().optional().nullable(),
});

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

    const body = await parseBody(request, progressStatusSchema);
    const updatedApplicant = await prisma.applicant.update({
      where: { id },
      data: {
        communicationStatus: body.communicationStatus,
        fundDisbursement: body.fundDisbursement,
        willingness: body.willingness,
        reasonNotWilling: body.reasonNotWilling,
        presenceStatus: body.presenceStatus,
        status: body.status,
        reasonDropped: body.reasonDropped,
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
          },
        },
      },
    });

    await clearApplicantsCache(updatedApplicant.workspaceId);

    return jsonResponse(updatedApplicant);
  } catch (error: any) {
    console.error("[PATCH /api/applicants/:id/progress-status error]:", error);
    return errorResponse(error.message || "Failed to update applicant progress status", 500);
  }
}
