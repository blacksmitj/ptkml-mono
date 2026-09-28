import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireWorkspaceRole } from "@/lib/rbac";
import { createActivity } from "@/lib/activity-log";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { z } from "zod";
import type { WorkspaceRole, VerificationStatus } from "@prisma/client";

const updateMemberSchema = z.object({
  universityId: z.string().nullable().optional(),
  role: z.enum(["UNIVERSITY_ADMIN", "MENTOR", "UNIVERSITY_SUPERVISOR"]).optional(),
  verificationStatus: z.enum(["DRAFT", "PENDING", "APPROVED", "REJECTED"]).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/members/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const { id } = await params;
    const member = await prisma.workspaceMember.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            profile: {
              include: {
                addresses: true,
              },
            },
          },
        },
        university: true,
        workspace: true,
        applicants: {
          include: {
            profile: true,
          },
        },
        _count: {
          select: {
            applicants: true,
          },
        },
      },
    });

    if (!member) {
      return errorResponse("Member not found", 404);
    }

    return jsonResponse(member);
  } catch (error) {
    console.error("GET /api/members/[id] error:", error);
    return errorResponse("Failed to fetch member", 500);
  }
}

// PATCH /api/members/[id]
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

    // Check if user is self-updating their own membership
    const isSelfUpdate = existingMember.userId === user.id;

    if (!isSelfUpdate) {
      const workspaceAuth = await requireWorkspaceRole(
        request,
        existingMember.workspaceId,
        ["UNIVERSITY_ADMIN"]
      );
      if (workspaceAuth.response) return workspaceAuth.response;
    }

    const { data: body, error } = await parseBody(request, updateMemberSchema);
    if (error || !body) {
      return errorResponse(error || "Invalid payload", 400);
    }

    const member = await prisma.workspaceMember.update({
      where: { id },
      data: {
        universityId: body.universityId,
        role: body.role ? (body.role as WorkspaceRole) : undefined,
        verificationStatus: body.verificationStatus ? (body.verificationStatus as VerificationStatus) : undefined,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    return jsonResponse(member);
  } catch (error) {
    console.error("PATCH /api/members/[id] error:", error);
    return errorResponse("Failed to update member", 500);
  }
}

// DELETE /api/members/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, response } = await requireAuth(request);
    if (response || !user) return response;

    const { id } = await params;
    const memberToDelete = await prisma.workspaceMember.findUnique({
      where: { id },
      include: {
        user: { include: { profile: true } },
        _count: {
          select: {
            applicants: true,
          },
        },
      },
    });

    if (!memberToDelete) {
      return errorResponse("Member not found", 404);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: memberToDelete.workspaceId },
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

    const isSuperAdmin = user.globalRole === "SUPER_ADMIN";
    let isAuthorized = isSuperAdmin;

    if (!isAuthorized) {
      const currentMembership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: memberToDelete.workspaceId,
          userId: user.id,
          verificationStatus: "APPROVED",
        },
      });

      if (
        currentMembership &&
        currentMembership.role === "UNIVERSITY_ADMIN" &&
        memberToDelete.role === "MENTOR" &&
        currentMembership.universityId === memberToDelete.universityId
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return errorResponse("Forbidden: Anda tidak memiliki akses untuk menghapus anggota ini", 403);
    }

    if (memberToDelete._count.applicants > 0) {
      return errorResponse(
        `Tidak dapat menghapus anggota ini karena masih memiliki ${memberToDelete._count.applicants} peserta bimbingan. Silakan pindahkan peserta terlebih dahulu.`,
        400
      );
    }

    await prisma.workspaceMember.delete({
      where: { id },
    });

    const memberName = memberToDelete.user?.profile?.name || "Mentor";
    await createActivity({
      workspaceId: memberToDelete.workspaceId,
      userId: user.id,
      type: "MEMBER_REMOVED",
      title: "Mentor Dikeluarkan",
      description: `${memberName} telah dikeluarkan dari workspace`,
      status: "destructive",
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/members/[id] error:", error);
    return errorResponse("Failed to delete member", 500);
  }
}
