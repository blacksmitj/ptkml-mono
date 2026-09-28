import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireGlobalRole, requireWorkspaceWriteAccess } from "@/lib/rbac";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { z } from "zod";

const connectSchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),
  universityIds: z.array(z.string()).min(1, "universityIds must be an array with at least one item"),
});

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (response) return response;

    const { data: body, error } = await parseBody(request, connectSchema);
    if (error || !body) {
      return errorResponse(error || "workspaceId and universityIds are required", 400);
    }

    const access = await requireWorkspaceWriteAccess(request, body.workspaceId);
    if (access.response) return access.response;

    const data = body.universityIds.map((univId: string) => ({
      workspaceId: body.workspaceId,
      universityId: univId,
    }));

    await prisma.workspaceUniversity.createMany({
      data,
      skipDuplicates: true,
    });

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("POST /api/universities/connect error:", error);
    return errorResponse("Failed to connect universities", 500);
  }
}
