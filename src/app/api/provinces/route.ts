import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.ok) return authResult.response;

    const provinces = await prisma.province.findMany({
      orderBy: { name: "asc" },
    });

    return jsonResponse(provinces);
  } catch (error: any) {
    console.error("[GET /api/provinces error]:", error);
    return errorResponse("Failed to fetch provinces", 500);
  }
}
