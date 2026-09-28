import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireGlobalRole } from "@/lib/rbac";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

// GET /api/global-admins/search-users
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (response) return response;

    const query = request.nextUrl.searchParams.get("query");

    if (!query || query.trim() === "") {
      return jsonResponse([]);
    }

    const users = await prisma.user.findMany({
      where: {
        globalRole: "USER",
        OR: [
          {
            profile: {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
          {
            profile: {
              email: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
          {
            username: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      include: {
        profile: true,
      },
      take: 20,
    });

    return jsonResponse(users);
  } catch (error) {
    console.error("GET /api/global-admins/search-users error:", error);
    return errorResponse("Failed to search users", 500);
  }
}
