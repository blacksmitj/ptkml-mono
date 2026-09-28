import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/rbac";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.ok) return authResult.response;

    const { id } = await context.params;
    const user = authResult.data;

    const dismissal = await prisma.dashboardEventDismissal.upsert({
      where: {
        eventId_userId: {
          eventId: id,
          userId: user.id,
        },
      },
      create: {
        eventId: id,
        userId: user.id,
      },
      update: {},
    });

    return jsonResponse({ success: true, dismissal });
  } catch (error: any) {
    console.error("[Dashboard Event Dismiss Error]:", error);
    return errorResponse("Failed to dismiss event", 500);
  }
}
