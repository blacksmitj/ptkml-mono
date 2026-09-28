import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireGlobalRole } from "@/lib/rbac";
import { delCachePattern } from "@/lib/redis";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { z } from "zod";

const updateUniversitySchema = z.object({
  name: z.string().optional(),
  logo: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/universities/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const { id } = await params;
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");

    const memberWhere = workspaceId ? { workspaceId } : undefined;
    const applicantWhere = workspaceId ? { workspaceId } : undefined;

    const university = await prisma.university.findUnique({
      where: { id },
      include: {
        members: {
          where: memberWhere,
          include: {
            user: {
              include: {
                profile: true,
              },
            },
            applicants: {
              where: applicantWhere,
              include: {
                profile: true,
                businessProfile: true,
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
            },
          },
        },
        applicants: {
          where: applicantWhere,
          include: {
            profile: true,
            businessProfile: true,
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
        },
      },
    });

    if (!university) {
      return errorResponse("University not found", 404);
    }

    return jsonResponse(university);
  } catch (error) {
    console.error("GET /api/universities/[id] error:", error);
    return errorResponse("Failed to fetch university details", 500);
  }
}

// PATCH /api/universities/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, response } = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (response) return response;

    const { id } = await params;
    const { data: body, error } = await parseBody(request, updateUniversitySchema);
    if (error || !body) {
      return errorResponse(error || "Invalid payload", 400);
    }

    const data: Record<string, any> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.logo !== undefined) data.logo = body.logo;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const university = await prisma.university.update({
      where: { id },
      data,
    });

    if (body.isActive !== undefined) {
      await delCachePattern("dashboard:stats:*");
    }

    return jsonResponse(university);
  } catch (error) {
    console.error("PATCH /api/universities/[id] error:", error);
    return errorResponse("Failed to update university", 500);
  }
}

// DELETE /api/universities/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, response } = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (response) return response;

    const { id } = await params;

    const [applicantCount, memberCount, workspaceCount] = await Promise.all([
      prisma.applicant.count({
        where: { universityId: id },
      }),
      prisma.workspaceMember.count({
        where: { universityId: id },
      }),
      prisma.workspaceUniversity.count({
        where: { universityId: id },
      }),
    ]);

    if (applicantCount > 0 || memberCount > 0 || workspaceCount > 0) {
      const reasons: string[] = [];
      if (applicantCount > 0) reasons.push(`${applicantCount} Data Peserta/TKM`);
      if (memberCount > 0) reasons.push(`${memberCount} Anggota/Pendamping/Admin`);
      if (workspaceCount > 0) reasons.push(`${workspaceCount} Workspace terhubung`);

      return errorResponse(
        `Universitas tidak dapat dihapus karena masih memiliki data historis/relasi (${reasons.join(", ")}).`,
        400
      );
    }

    await prisma.university.delete({
      where: { id },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/universities/[id] error:", error);
    return errorResponse("Failed to delete university", 500);
  }
}
