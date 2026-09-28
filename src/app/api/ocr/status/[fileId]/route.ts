import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth } from "@/lib/rbac";

// GET /api/ocr/status/[fileId] - Alias for polling OCR result
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const access = await requireAuth(request);
    if (!access.ok) return access.response;

    const { fileId } = await context.params;

    const ocrResult = await prisma.ocrResult.findUnique({
      where: { fileId },
      include: {
        validations: true,
      },
    });

    if (!ocrResult) {
      return errorResponse("OCR result not found for this file", 404);
    }

    return jsonResponse(ocrResult);
  } catch (error: any) {
    console.error("[GET /api/ocr/status/[fileId] error]:", error);
    return errorResponse(error.message || "Failed to retrieve OCR status", 500);
  }
}
