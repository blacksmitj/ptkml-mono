import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireGlobalRole, requireWorkspaceWriteAccess } from "@/lib/rbac";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { z } from "zod";

const createUniversitySchema = z.object({
  name: z.string().min(1, "Nama universitas wajib diisi"),
  logo: z.string().nullable().optional(),
  workspaceId: z.string().optional(),
});

// GET /api/universities
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");
    const excludeWorkspaceId = searchParams.get("excludeWorkspaceId");

    let whereClause = {};
    if (workspaceId) {
      whereClause = {
        workspaces: {
          some: {
            workspaceId,
          },
        },
      };
    } else if (excludeWorkspaceId) {
      whereClause = {
        workspaces: {
          none: {
            workspaceId: excludeWorkspaceId,
          },
        },
      };
    }

    const universities = await prisma.university.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      include: {
        applicants: {
          where: workspaceId ? { workspaceId } : undefined,
          select: { id: true },
        },
        members: {
          where: workspaceId ? { workspaceId } : undefined,
          select: { role: true },
        },
      },
    });

    const formatted = universities.map((u) => {
      const mentors = u.members.filter((m) => m.role === "MENTOR").length;
      const admins = u.members.filter((m) => m.role === "UNIVERSITY_ADMIN").length;
      return {
        id: u.id,
        name: u.name,
        logo: u.logo,
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        _count: {
          applicants: u.applicants.length,
          mentors,
          admins,
        },
      };
    });

    return jsonResponse(formatted);
  } catch (error) {
    console.error("GET /api/universities error:", error);
    return errorResponse("Failed to fetch universities", 500);
  }
}

// POST /api/universities
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (response) return response;

    const { data: body, error } = await parseBody(request, createUniversitySchema);
    if (error || !body) {
      return errorResponse(error || "Invalid payload", 400);
    }

    if (body.workspaceId) {
      const access = await requireWorkspaceWriteAccess(request, body.workspaceId);
      if (access.response) return access.response;
    }

    const university = await prisma.university.create({
      data: {
        name: body.name,
        logo: body.logo,
      },
    });

    if (body.workspaceId) {
      await prisma.workspaceUniversity.create({
        data: {
          workspaceId: body.workspaceId,
          universityId: university.id,
        },
      });
    }

    return jsonResponse(university, 201);
  } catch (error) {
    console.error("POST /api/universities error:", error);
    return errorResponse("Failed to create university", 500);
  }
}
