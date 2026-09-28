import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.ok) return authResult.response;

    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get("cityId");

    if (!cityId) {
      return errorResponse("cityId is required", 400);
    }

    const districts = await prisma.district.findMany({
      where: { cityId },
      orderBy: { name: "asc" },
    });

    return jsonResponse(districts);
  } catch (error: any) {
    console.error("[GET /api/districts error]:", error);
    return errorResponse("Failed to fetch districts", 500);
  }
}
