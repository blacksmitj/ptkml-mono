import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireWorkspaceAccess, verifyWritePermission } from "@/lib/rbac";
import { clearApplicantsCache } from "@/lib/cache-helpers";
import { z } from "zod";

const divideAllocationSchema = z.object({
  allocations: z.array(
    z.object({
      idTkm: z.string().min(1),
      universityId: z.string().optional().nullable(),
    })
  ),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return errorResponse("workspaceId is required", 400);
    }

    const access = await requireWorkspaceAccess(request, workspaceId);
    if (!access.ok) return access.response;

    const { user, membership } = access.data;
    const whereAnd: any[] = [{ workspaceId }];

    if (user.globalRole !== "SUPER_ADMIN" && user.globalRole !== "WORKSPACE_SUPERVISOR") {
      if (!membership) {
        return errorResponse("Forbidden: No access to this workspace", 403);
      }
      if (
        membership.role === "UNIVERSITY_ADMIN" ||
        membership.role === "UNIVERSITY_SUPERVISOR"
      ) {
        whereAnd.push({
          universityId: membership.universityId,
        });
      }
    }

    const filterStatus = searchParams.get("filterStatus");
    if (filterStatus === "assigned") {
      whereAnd.push({ universityId: { not: null } });
    } else if (filterStatus === "unassigned") {
      whereAnd.push({ universityId: null });
    }

    const search = searchParams.get("search");
    if (search) {
      const searchVal = search.trim();
      whereAnd.push({
        OR: [
          { idTkm: { contains: searchVal, mode: "insensitive" } },
          {
            profile: {
              OR: [
                { name: { contains: searchVal, mode: "insensitive" } },
                { nik: { contains: searchVal, mode: "insensitive" } },
              ],
            },
          },
        ],
      });
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const [total, applicants] = await Promise.all([
      prisma.applicant.count({
        where: { AND: whereAnd },
      }),
      prisma.applicant.findMany({
        where: { AND: whereAnd },
        select: {
          id: true,
          idTkm: true,
          universityId: true,
          profile: {
            select: {
              id: true,
              name: true,
              nik: true,
              photo: true,
            },
          },
          university: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return jsonResponse({
      data: applicants,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[GET /api/applicants/divide error]:", error);
    return errorResponse("Failed to fetch divide applicants", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request, divideAllocationSchema);
    const { allocations } = body;

    let workspaceId: string | undefined;
    if (allocations.length > 0) {
      const firstApplicant = await prisma.applicant.findFirst({
        where: { idTkm: allocations[0].idTkm },
        select: { workspaceId: true },
      });
      workspaceId = firstApplicant?.workspaceId;
    }

    const writeAllowed = await verifyWritePermission(request, workspaceId);
    if (!writeAllowed) {
      return errorResponse("Forbidden: Read-only access", 403);
    }

    const validAllocations = allocations.filter((alloc) => alloc.idTkm);
    if (validAllocations.length === 0) {
      return jsonResponse({ success: true, count: 0 });
    }

    const targetMap = new Map<string | null, string[]>();
    for (const alloc of validAllocations) {
      const target = alloc.universityId || null;
      if (!targetMap.has(target)) {
        targetMap.set(target, []);
      }
      targetMap.get(target)!.push(alloc.idTkm);
    }

    let totalUpdated = 0;
    await prisma.$transaction(async (tx) => {
      for (const [universityId, idTkms] of targetMap.entries()) {
        const res = await tx.applicant.updateMany({
          where: {
            idTkm: { in: idTkms },
            ...(workspaceId ? { workspaceId } : {}),
          },
          data: {
            universityId,
            mentorId: null,
          },
        });
        totalUpdated += res.count;
      }
    });

    if (workspaceId) {
      await clearApplicantsCache(workspaceId);
    }

    return jsonResponse({ success: true, count: totalUpdated });
  } catch (error: any) {
    console.error("[POST /api/applicants/divide error]:", error);
    return errorResponse("Failed to save applicant allocations: " + error.message, 500);
  }
}
