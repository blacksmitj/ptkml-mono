import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.ok) return authResult.response;

    const { searchParams } = new URL(request.url);
    const districtId = searchParams.get("districtId");

    if (!districtId) {
      return errorResponse("districtId is required", 400);
    }

    const subdistricts = await prisma.subdistrict.findMany({
      where: { districtId },
      orderBy: { name: "asc" },
    });

    return jsonResponse(subdistricts);
  } catch (error: any) {
    console.error("[GET /api/subdistricts error]:", error);
    return errorResponse("Failed to fetch subdistricts", 500);
  }
}
