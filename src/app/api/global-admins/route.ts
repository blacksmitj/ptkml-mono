import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireGlobalRole } from "@/lib/rbac";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

// GET /api/global-admins
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (response) return response;

    const admins = await prisma.user.findMany({
      where: {
        globalRole: {
          in: ["SUPER_ADMIN", "WORKSPACE_SUPERVISOR"],
        },
      },
      include: {
        profile: true,
      },
      orderBy: {
        profile: {
          name: "asc",
        },
      },
    });

    return jsonResponse(admins);
  } catch (error) {
    console.error("GET /api/global-admins error:", error);
    return errorResponse("Failed to fetch global admins", 500);
  }
}
