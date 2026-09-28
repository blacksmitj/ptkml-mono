import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { verifyWritePermission } from "@/lib/rbac";
import { clearApplicantsCache } from "@/lib/cache-helpers";
import { z } from "zod";

const bulkAssignMentorSchema = z.object({
  mentorId: z.string().min(1, "mentorId is required"),
  applicantIds: z.array(z.string()).min(1, "applicantIds array is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request, bulkAssignMentorSchema);
    const { mentorId, applicantIds } = body;

    const mentor = await prisma.workspaceMember.findUnique({
      where: { id: mentorId },
      select: { workspaceId: true },
    });

    const writeAllowed = await verifyWritePermission(request, mentor?.workspaceId);
    if (!writeAllowed) {
      return errorResponse("Forbidden: Read-only access", 403);
    }

    await prisma.$transaction([
      // Unassign applicants currently assigned to this mentor who are not in the new list
      prisma.applicant.updateMany({
        where: {
          mentorId: mentorId,
          id: { notIn: applicantIds },
        },
        data: {
          mentorId: null,
        },
      }),
      // Assign the new list of applicants to this mentor
      prisma.applicant.updateMany({
        where: {
          id: { in: applicantIds },
        },
        data: {
          mentorId: mentorId,
        },
      }),
    ]);

    if (mentor?.workspaceId) {
      await clearApplicantsCache(mentor.workspaceId);
    }

    return jsonResponse({ success: true, count: applicantIds.length });
  } catch (error: any) {
    console.error("[POST /api/applicants/assign-mentor error]:", error);
    return errorResponse(error.message || "Failed to assign mentor", 500);
  }
}
