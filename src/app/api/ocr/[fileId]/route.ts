import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireAuth, requireGlobalRole } from "@/lib/rbac";
import { z } from "zod";

const updateOcrSchema = z.object({
  parsedData: z.any(),
});

// GET /api/ocr/[fileId] - Get OCR result for file
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
        file: true,
        validations: true,
      },
    });

    if (!ocrResult) {
      return errorResponse("OCR result not found for this file", 404);
    }

    return jsonResponse(ocrResult);
  } catch (error: any) {
    console.error("[GET /api/ocr/[fileId] error]:", error);
    return errorResponse(error.message || "Failed to retrieve OCR status", 500);
  }
}

// PUT /api/ocr/[fileId] - Manually override OCR parsed data (SUPER_ADMIN)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const access = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (!access.ok) return access.response;

    const { fileId } = await context.params;
    const body = await parseBody(request, updateOcrSchema);

    const ocrResult = await prisma.ocrResult.findUnique({
      where: { fileId },
    });

    if (!ocrResult) {
      return errorResponse("OCR result not found", 404);
    }

    const updated = await prisma.ocrResult.update({
      where: { fileId },
      data: {
        parsedData: body.parsedData,
      },
      include: {
        file: true,
        validations: true,
      },
    });

    return jsonResponse(updated);
  } catch (error: any) {
    console.error("[PUT /api/ocr/[fileId] error]:", error);
    return errorResponse(error.message || "Failed to update OCR parsed data", 500);
  }
}
