import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireWorkspaceRole, requireWorkspaceAccess } from "@/lib/rbac";
import { createActivity } from "@/lib/activity-log";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { z } from "zod";
import type { WorkspaceRole, VerificationStatus } from "@prisma/client";

const createMemberSchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),
  userId: z.string().min(1, "userId is required"),
  universityId: z.string().nullable().optional(),
  role: z.enum(["UNIVERSITY_ADMIN", "MENTOR", "UNIVERSITY_SUPERVISOR"]),
});

// GET /api/members
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");
    const role = searchParams.get("role");
    const universityId = searchParams.get("universityId");
    const verificationStatus = searchParams.get("verificationStatus");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    if (!workspaceId) {
      return errorResponse("workspaceId is required", 400);
    }

    const access = await requireWorkspaceAccess(request, workspaceId);
    if (access.response) return access.response;

    const { user, membership } = access;
    if (!user) return errorResponse("Unauthorized", 401);

    const where: any = { workspaceId };
    if (role) where.role = role;
    if (universityId) where.universityId = universityId;
    if (verificationStatus && verificationStatus !== "ALL") {
      where.verificationStatus = verificationStatus;
    }

    if (user.globalRole !== "SUPER_ADMIN" && user.globalRole !== "WORKSPACE_SUPERVISOR") {
      if (!membership) {
        return errorResponse("Forbidden: No access to this workspace", 403);
      }
      where.universityId = membership.universityId;
    }

    if (search) {
      const searchVal = String(search).trim();
      where.user = {
        profile: {
          OR: [
            { name: { contains: searchVal, mode: "insensitive" } },
            { nik: { contains: searchVal, mode: "insensitive" } },
            { email: { contains: searchVal, mode: "insensitive" } },
          ],
        },
      };
    }

    let orderBy: any = { createdAt: "desc" };
    if (sortBy) {
      if (sortBy === "name") {
        orderBy = { user: { profile: { name: sortOrder } } };
      } else if (sortBy === "universityName") {
        orderBy = { university: { name: sortOrder } };
      } else {
        orderBy = { [sortBy]: sortOrder };
      }
    }

    const memberSelect = {
      id: true,
      workspaceId: true,
      userId: true,
      universityId: true,
      role: true,
      verificationStatus: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          globalRole: true,
          profile: {
            select: {
              id: true,
              name: true,
              nik: true,
              email: true,
              whatsapp: true,
              photo: true,
              lastEducation: true,
              hasDisability: true,
              addresses: {
                select: {
                  id: true,
                  label: true,
                  address: true,
                  subdistrictName: true,
                  districtName: true,
                  cityName: true,
                  provinceName: true,
                  postalCode: true,
                },
              },
            },
          },
        },
      },
      university: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
      _count: {
        select: {
          applicants: true,
        },
      },
    };

    if (pageParam !== null) {
      const page = Math.max(1, parseInt(pageParam) || 1);
      const limit = Math.max(1, parseInt(limitParam || "10") || 10);
      const skip = (page - 1) * limit;

      const total = await prisma.workspaceMember.count({ where });
      const members = await prisma.workspaceMember.findMany({
        where,
        select: memberSelect,
        orderBy,
        skip,
        take: limit,
      });

      return jsonResponse({
        data: members,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    const members = await prisma.workspaceMember.findMany({
      where,
      select: memberSelect,
      orderBy,
    });

    return jsonResponse(members);
  } catch (error) {
    console.error("GET /api/members error:", error);
    return errorResponse("Failed to fetch members", 500);
  }
}

// POST /api/members
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response || !user) return response;

    const { data: body, error } = await parseBody(request, createMemberSchema);
    if (error || !body) {
      return errorResponse(error || "workspaceId is required", 400);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: body.workspaceId },
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

    // Check if user is self-registering to join a workspace
    const isSelfRegister = body.userId === user.id && body.role === "MENTOR";

    if (!isSelfRegister) {
      const workspaceAuth = await requireWorkspaceRole(request, body.workspaceId, [
        "UNIVERSITY_ADMIN",
      ]);
      if (workspaceAuth.response) return workspaceAuth.response;
    } else {
      const existing = await prisma.workspaceMember.findFirst({
        where: { workspaceId: body.workspaceId, userId: user.id },
      });
      if (existing) {
        return errorResponse("Already a member of this workspace", 400);
      }
    }

    // Check if user is already an applicant in this workspace
    const targetUser = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { profileId: true },
    });
    if (targetUser?.profileId) {
      const isApplicantInSameWorkspace = await prisma.applicant.findFirst({
        where: {
          workspaceId: body.workspaceId,
          profileId: targetUser.profileId,
        },
      });
      if (isApplicantInSameWorkspace) {
        return errorResponse(
          "Orang ini sudah terdaftar sebagai Peserta di workspace tahun ini, tidak dapat didaftarkan sebagai Pendamping/Anggota.",
          400
        );
      }
    }

    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId: body.workspaceId,
        userId: body.userId,
        universityId: body.universityId || null,
        role: body.role as WorkspaceRole,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Log member registration
    const memberName = member.user?.profile?.name || "Mentor";
    const roleLabel = member.role === "MENTOR" ? "Mentor" : member.role;
    await createActivity({
      workspaceId: member.workspaceId,
      userId: user.id,
      type: "MEMBER_REGISTERED",
      title: "Mentor Bergabung",
      description: `${memberName} telah bergabung sebagai ${roleLabel}`,
      status: "indigo",
    });

    return jsonResponse(member, 201);
  } catch (error) {
    console.error("POST /api/members error:", error);
    return errorResponse("Failed to create member", 500);
  }
}
