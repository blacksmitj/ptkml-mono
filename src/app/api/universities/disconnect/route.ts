import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireGlobalRole, requireWorkspaceWriteAccess } from "@/lib/rbac";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { z } from "zod";

const disconnectSchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),
  universityId: z.string().min(1, "universityId is required"),
});

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (response) return response;

    const { data: body, error } = await parseBody(request, disconnectSchema);
    if (error || !body) {
      return errorResponse(error || "workspaceId and universityId are required", 400);
    }

    const access = await requireWorkspaceWriteAccess(request, body.workspaceId);
    if (access.response) return access.response;

    // Check if there are applicants or members in this workspace belonging to this university
    const [applicantCount, memberCount] = await Promise.all([
      prisma.applicant.count({
        where: {
          workspaceId: body.workspaceId,
          universityId: body.universityId,
        },
      }),
      prisma.workspaceMember.count({
        where: {
          workspaceId: body.workspaceId,
          universityId: body.universityId,
        },
      }),
    ]);

    if (applicantCount > 0 || memberCount > 0) {
      const reasons: string[] = [];
      if (applicantCount > 0) reasons.push(`${applicantCount} Peserta/TKM`);
      if (memberCount > 0) reasons.push(`${memberCount} Anggota/Pendamping`);

      return errorResponse(
        `Universitas tidak dapat dilepas dari workspace ini karena masih memiliki data aktif (${reasons.join(", ")}). Hapus atau pindahkan data terkait terlebih dahulu.`,
        400
      );
    }

    // Delete from WorkspaceUniversity
    await prisma.workspaceUniversity.deleteMany({
      where: {
        workspaceId: body.workspaceId,
        universityId: body.universityId,
      },
    });

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("POST /api/universities/disconnect error:", error);
    return errorResponse("Failed to disconnect university", 500);
  }
}
