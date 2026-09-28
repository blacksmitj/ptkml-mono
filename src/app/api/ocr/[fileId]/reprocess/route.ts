import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { requireGlobalRole } from "@/lib/rbac";
import { ocrQueue } from "@/lib/ocr-queue";
import { Prisma, OcrDocumentType } from "@prisma/client";

function getOcrDocumentType(category: string): OcrDocumentType {
  if (category === "EMPLOYEE_KTP") return "KTP";
  if (category === "EMPLOYEE_BPJS_CARD") return "BPJS";
  if (category === "EMPLOYEE_SALARY_SLIP") return "SALARY_SLIP";
  if (category === "OUTPUT_CASHFLOW_PROOF") return "CASHFLOW";
  if (category === "OUTPUT_INCOME_PROOF") return "REPORT";
  if (category === "EXPENSE_PROOF") return "RECEIPT";
  return "OTHER";
}

// POST /api/ocr/[fileId]/reprocess - Reprocess OCR job (SUPER_ADMIN)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const access = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (!access.ok) return access.response;

    const { fileId } = await context.params;

    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return errorResponse("File not found", 404);
    }

    // Reset OCR result
    await prisma.ocrResult.upsert({
      where: { fileId },
      update: {
        status: "PENDING",
        rawText: null,
        parsedData: Prisma.DbNull,
        confidence: null,
        processingTime: null,
        engine: null,
        errorMessage: null,
        processedAt: null,
      },
      create: {
        fileId,
        status: "PENDING",
        documentType: getOcrDocumentType(file.category),
      },
    });

    // Reset OCR Job status
    await prisma.ocrJob.upsert({
      where: { fileId },
      update: {
        status: "PENDING",
        startedAt: null,
        finishedAt: null,
      },
      create: {
        fileId,
        status: "PENDING",
      },
    });

    // Add back to BullMQ
    const job = await ocrQueue.add("process-ocr", {
      fileId: file.id,
      url: file.url,
      category: file.category,
      objectKey: file.objectKey,
      bucket: file.bucket,
    });

    console.log(`[POST /api/ocr/[fileId]/reprocess] Re-enqueued OCR job ${job.id} for file ${file.id}`);

    return jsonResponse({
      fileId: file.id,
      jobId: job.id,
      status: "PENDING",
    });
  } catch (error: any) {
    console.error("[POST /api/ocr/[fileId]/reprocess error]:", error);
    return errorResponse(error.message || "Failed to reprocess OCR", 500);
  }
}
