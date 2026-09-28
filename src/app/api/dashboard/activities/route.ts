import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.ok) return authResult.response;

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return errorResponse("workspaceId is required", 400);
    }

    const activities = await prisma.activityLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return jsonResponse(
      activities.map((act) => ({
        id: act.id,
        type: act.type,
        title: act.title,
        description: act.description,
        status: act.status,
        timestamp: act.createdAt,
      }))
    );
  } catch (error: any) {
    console.error("[GET /api/dashboard/activities error]:", error);
    return errorResponse("Failed to fetch recent activities", 500);
  }
}
