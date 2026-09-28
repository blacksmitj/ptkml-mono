import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireWorkspaceRole } from "@/lib/rbac";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { z } from "zod";

const verifyMemberSchema = z.object({
  verificationStatus: z.enum(["APPROVED", "REJECTED"]),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/members/[id]/verify
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const existingMember = await prisma.workspaceMember.findUnique({
      where: { id },
    });
    if (!existingMember) {
      return errorResponse("Member not found", 404);
    }

    const { user, response } = await requireAuth(request);
    if (response || !user) return response;

    const workspace = await prisma.workspace.findUnique({
      where: { id: existingMember.workspaceId },
      select: { isActive: true, isInputFrozen: true },
    });

    if (!workspace) {
      return errorResponse("Workspace not found", 404);
    }

    if (!workspace.isActive) {
      return errorResponse("Forbidden: Workspace is inactive", 403);
    }

    if (workspace.isInputFrozen && user.globalRole !== "SUPER_ADMIN") {
      return errorResponse("Forbidden: Workspace is frozen", 403);
    }

    const workspaceAuth = await requireWorkspaceRole(
      request,
      existingMember.workspaceId,
      ["UNIVERSITY_ADMIN"]
    );
    if (workspaceAuth.response) return workspaceAuth.response;

    const { data: body, error } = await parseBody(request, verifyMemberSchema);
    if (error || !body) {
      return errorResponse(error || "Status verifikasi tidak valid (harus APPROVED atau REJECTED)", 400);
    }

    const member = await prisma.workspaceMember.update({
      where: { id },
      data: {
        verificationStatus: body.verificationStatus,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        university: true,
      },
    });

    return jsonResponse(member);
  } catch (error) {
    console.error("PATCH /api/members/[id]/verify error:", error);
    return errorResponse("Failed to verify member", 500);
  }
}
