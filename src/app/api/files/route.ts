import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { bucketName } from "@/lib/s3";
import { z } from "zod";
import type { FileCategory } from "@prisma/client";

const createFileSchema = z.object({
  url: z.string().optional(),
  objectKey: z.string().optional(),
  bucket: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  category: z.enum([
    "LOGBOOK_DOCUMENTATION",
    "EXPENSE_PROOF",
    "EMPLOYEE_KTP",
    "EMPLOYEE_SALARY_SLIP",
    "EMPLOYEE_BPJS_CARD",
    "OUTPUT_CASHFLOW_PROOF",
    "OUTPUT_INCOME_PROOF",
    "APPLICANT_BMC",
    "APPLICANT_ACTION_PLAN",
  ]),
  applicantId: z.string().nullable().optional(),
  logbookId: z.string().nullable().optional(),
  outputId: z.string().nullable().optional(),
  employeeId: z.string().nullable().optional(),
});

// GET /api/files
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const searchParams = request.nextUrl.searchParams;
    const applicantId = searchParams.get("applicantId");
    const logbookId = searchParams.get("logbookId");
    const outputId = searchParams.get("outputId");
    const employeeId = searchParams.get("employeeId");

    const files = await prisma.file.findMany({
      where: {
        AND: [
          applicantId ? { applicantId } : {},
          logbookId ? { logbookId } : {},
          outputId ? { outputId } : {},
          employeeId ? { employeeId } : {},
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse(files);
  } catch (error) {
    console.error("GET /api/files error:", error);
    return errorResponse("Failed to fetch files", 500);
  }
}

// POST /api/files
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response || !user) return response;

    if (user.globalRole === "WORKSPACE_SUPERVISOR") {
      return errorResponse("Forbidden: Supervisors cannot upload files", 403);
    }

    const { data: body, error } = await parseBody(request, createFileSchema);
    if (error || !body) {
      return errorResponse(error || "Invalid payload", 400);
    }

    const url = body.url;
    let objectKey = body.objectKey || "";
    let bucket = body.bucket || null;

    if (url && (!objectKey || !bucket)) {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;
        const parts = pathname.split("/");
        if (parts.length >= 2) {
          bucket = parts[0] || bucketName || "pendampingan";
          objectKey = parts.slice(1).join("/");
        } else {
          objectKey = parts[parts.length - 1] || "";
        }
      } catch (e) {
        const urlParts = url.split("/");
        objectKey = urlParts[urlParts.length - 1] || "";
        const parsedBucket = urlParts[urlParts.length - 2] || null;
        bucket = parsedBucket || bucketName || "pendampingan";
      }
    }

    const file = await prisma.file.create({
      data: {
        url,
        objectKey,
        bucket,
        mimeType: body.mimeType || null,
        category: body.category as FileCategory,
        applicantId: body.applicantId || null,
        logbookId: body.logbookId || null,
        outputId: body.outputId || null,
        employeeId: body.employeeId || null,
      },
    });

    return jsonResponse(file, 201);
  } catch (error) {
    console.error("POST /api/files error:", error);
    return errorResponse("Failed to create file metadata", 500);
  }
}
