import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireAuth, requireGlobalRole } from "@/lib/rbac";
import { ocrQueue } from "@/lib/ocr-queue";
import { parseFileUrl } from "@/lib/file-helpers";
import { OcrDocumentType } from "@prisma/client";
import { z } from "zod";

function getOcrDocumentType(category: string): OcrDocumentType {
  if (category === "EMPLOYEE_KTP") return "KTP";
  if (category === "EMPLOYEE_BPJS_CARD") return "BPJS";
  if (category === "EMPLOYEE_SALARY_SLIP") return "SALARY_SLIP";
  if (category === "OUTPUT_CASHFLOW_PROOF") return "CASHFLOW";
  if (category === "OUTPUT_INCOME_PROOF") return "REPORT";
  if (category === "EXPENSE_PROOF") return "RECEIPT";
  return "OTHER";
}

const enqueueOcrSchema = z.object({
  url: z.string().min(1, "url is required"),
  category: z.string().min(1, "category is required"),
});

// GET /api/ocr - List OCR results for super admin
export async function GET(request: NextRequest) {
  try {
    const access = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const documentType = searchParams.get("documentType");
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.max(1, Number(searchParams.get("limit") || 10));
    const search = searchParams.get("search");
    const workspaceId = searchParams.get("workspaceId");

    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (documentType) {
      where.documentType = documentType;
    }
    if (search) {
      where.OR = [
        { rawText: { contains: search, mode: "insensitive" } },
        { file: { objectKey: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (workspaceId && workspaceId !== "all") {
      where.file = {
        OR: [
          { logbook: { workspaceId } },
          { output: { workspaceId } },
          { applicant: { workspaceId } },
          { employee: { output: { workspaceId } } },
        ],
      };
    }

    const [ocrResults, total] = await Promise.all([
      prisma.ocrResult.findMany({
        where,
        include: {
          file: true,
          validations: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.ocrResult.count({ where }),
    ]);

    return jsonResponse({
      data: ocrResults,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[GET /api/ocr error]:", error);
    return errorResponse(error.message || "Failed to fetch OCR list", 500);
  }
}

// POST /api/ocr - Enqueue OCR processing job asynchronously
export async function POST(request: NextRequest) {
  try {
    const access = await requireAuth(request);
    if (!access.ok) return access.response;

    const body = await parseBody(request, enqueueOcrSchema);
    const { objectKey, bucket } = parseFileUrl(body.url);

    // 1. Create File record
    const file = await prisma.file.create({
      data: {
        url: body.url,
        objectKey,
        bucket,
        category: body.category as any,
      },
    });

    const docType = getOcrDocumentType(body.category);

    // 2. Initialize OcrResult
    await prisma.ocrResult.create({
      data: {
        fileId: file.id,
        status: "PENDING",
        documentType: docType,
      },
    });

    // 3. Initialize OcrJob
    await prisma.ocrJob.create({
      data: {
        fileId: file.id,
        status: "PENDING",
      },
    });

    // 4. Add job to BullMQ
    const job = await ocrQueue.add("process-ocr", {
      fileId: file.id,
      url: body.url,
      category: body.category,
      objectKey,
      bucket,
    });

    console.log(`[POST /api/ocr] Enqueued OCR job ${job.id} for file ${file.id} (category: ${body.category})`);

    return jsonResponse({
      fileId: file.id,
      jobId: job.id,
      status: "PENDING",
    });
  } catch (error: any) {
    console.error("[POST /api/ocr error]:", error);
    return errorResponse(error.message || "Failed to process OCR", 500);
  }
}
