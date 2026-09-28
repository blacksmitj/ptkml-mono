import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-session";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const currentUserId = await getSessionUserId(request);

    if (!currentUserId) {
      return errorResponse("Unauthorized", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: {
        profile: {
          include: {
            addresses: true,
          },
        },
        workspaceMemberships: {
          include: {
            workspace: true,
            university: true,
            _count: {
              select: {
                applicants: true,
                createdLogbooks: true,
                verifiedLogbooks: true,
                verifiedOutputs: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    return jsonResponse(user);
  } catch (error) {
    console.error("GET /api/me error:", error);
    return errorResponse("Failed to fetch user info", 500);
  }
}
