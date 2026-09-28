import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.ok) return authResult.response;

    const { searchParams } = new URL(request.url);
    const provinceId = searchParams.get("provinceId");

    if (!provinceId) {
      return errorResponse("provinceId is required", 400);
    }

    const cities = await prisma.city.findMany({
      where: { provinceId },
      orderBy: { name: "asc" },
    });

    return jsonResponse(cities);
  } catch (error: any) {
    console.error("[GET /api/cities error]:", error);
    return errorResponse("Failed to fetch cities", 500);
  }
}
