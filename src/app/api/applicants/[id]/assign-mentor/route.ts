import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireWorkspaceWriteAccess } from "@/lib/rbac";
import { clearApplicantsCache } from "@/lib/cache-helpers";
import { z } from "zod";

const assignMentorSchema = z.object({
  mentorId: z.string().optional().nullable(),
  universityId: z.string().optional().nullable(),
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
      if (!membership || membership.role !== "UNIVERSITY_ADMIN") {
        return errorResponse(
          "Forbidden: Hanya Admin Universitas atau Super Admin yang dapat menugaskan pendamping",
          403
        );
      }
      if (applicant.universityId && applicant.universityId !== membership.universityId) {
        return errorResponse("Forbidden: Peserta bukan bagian dari universitas Anda", 403);
      }
    }

    const body = await parseBody(request, assignMentorSchema);
    let mentorId = body.mentorId !== undefined ? body.mentorId : undefined;
    let universityId = body.universityId !== undefined ? body.universityId : undefined;

    if (mentorId) {
      const mentor = await prisma.workspaceMember.findUnique({
        where: { id: mentorId },
      });
      if (mentor?.universityId && !universityId) {
        universityId = mentor.universityId;
      }
    }

    const updatedApplicant = await prisma.applicant.update({
      where: { id },
      data: {
        mentorId: mentorId,
        universityId: universityId,
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
    console.error("[PATCH /api/applicants/:id/assign-mentor error]:", error);
    return errorResponse(error.message || "Failed to assign mentor to applicant", 500);
  }
}
