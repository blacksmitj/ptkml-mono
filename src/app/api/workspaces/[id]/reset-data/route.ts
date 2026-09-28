import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireGlobalRole } from "@/lib/rbac";
import bcrypt from "bcryptjs";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "@/lib/s3";
import { delCachePattern } from "@/lib/redis";
import { createActivity } from "@/lib/activity-log";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { z } from "zod";

const resetWorkspaceSchema = z.object({
  confirmationText: z.string().min(1, "Teks konfirmasi wajib diisi"),
  password: z.string().min(1, "Password Super Admin wajib diisi"),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { user: authUser, response } = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (response || !authUser) return response;

    const { id } = await params;
    const { data: body, error } = await parseBody(request, resetWorkspaceSchema);
    if (error || !body) {
      return errorResponse(error || "Invalid payload", 400);
    }

    const { confirmationText, password } = body;

    const workspace = await prisma.workspace.findUnique({
      where: { id },
    });

    if (!workspace) {
      return errorResponse("Workspace tidak ditemukan", 404);
    }

    // Verify Super Admin Password
    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (!currentUser || !currentUser.password) {
      return errorResponse("Akun Super Admin tidak memiliki password yang valid", 400);
    }

    const isPasswordCorrect = await bcrypt.compare(password, currentUser.password);
    if (!isPasswordCorrect) {
      return errorResponse("Password Super Admin yang dimasukkan salah", 401);
    }

    // Verify Confirmation Text
    const expectedConfirmation = `HAPUS DATA ${workspace.name}`.trim().toUpperCase();
    if ((confirmationText || "").trim().toUpperCase() !== expectedConfirmation) {
      return errorResponse(
        `Teks konfirmasi salah. Harap ketik persis: "${expectedConfirmation}"`,
        400
      );
    }

    // 1. Gather all related entity IDs
    const applicants = await prisma.applicant.findMany({
      where: { workspaceId: id },
      select: { id: true, profileId: true },
    });
    const applicantIds = applicants.map((a) => a.id);
    const applicantProfileIds = applicants.map((a) => a.profileId);

    const logbooks = await prisma.logbook.findMany({
      where: { workspaceId: id },
      select: { id: true },
    });
    const logbookIds = logbooks.map((l) => l.id);

    const outputReports = await prisma.outputReport.findMany({
      where: { workspaceId: id },
      select: { id: true },
    });
    const outputReportIds = outputReports.map((o) => o.id);

    const employees = await prisma.employee.findMany({
      where: { outputId: { in: outputReportIds } },
      select: { id: true, profileId: true },
    });
    const employeeIds = employees.map((e) => e.id);
    const employeeProfileIds = employees.map((e) => e.profileId).filter(Boolean) as string[];

    // 2. Find all files to be deleted
    const files = await prisma.file.findMany({
      where: {
        OR: [
          ...(applicantIds.length > 0 ? [{ applicantId: { in: applicantIds } }] : []),
          ...(logbookIds.length > 0 ? [{ logbookId: { in: logbookIds } }] : []),
          ...(outputReportIds.length > 0 ? [{ outputId: { in: outputReportIds } }] : []),
          ...(employeeIds.length > 0 ? [{ employeeId: { in: employeeIds } }] : []),
        ],
      },
      select: { id: true, objectKey: true },
    });
    const fileIds = files.map((f) => f.id);

    // 3. Delete physical files from MinIO / S3 Storage
    const keysToDelete = files
      .map((f) => f.objectKey)
      .filter((k): k is string => Boolean(k && typeof k === "string" && k.trim().length > 0));

    if (keysToDelete.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < keysToDelete.length; i += chunkSize) {
        const chunk = keysToDelete.slice(i, i + chunkSize);
        try {
          await s3Client.send(
            new DeleteObjectsCommand({
              Bucket: bucketName,
              Delete: { Objects: chunk.map((Key) => ({ Key })) },
            })
          );
        } catch (s3Err) {
          console.warn(
            `Gagal menghapus beberapa file fisik di MinIO/S3 saat reset workspace ${id}:`,
            s3Err
          );
        }
      }
    }

    // 4. Execute atomic database transaction
    await prisma.$transaction(
      async (tx) => {
        // Delete OCR results, OCR validations, OCR jobs, and File records
        if (fileIds.length > 0) {
          await tx.ocrValidation.deleteMany({
            where: { ocrResult: { fileId: { in: fileIds } } },
          });
          await tx.ocrJob.deleteMany({
            where: { fileId: { in: fileIds } },
          });
          await tx.ocrResult.deleteMany({
            where: { fileId: { in: fileIds } },
          });
          await tx.file.deleteMany({
            where: { id: { in: fileIds } },
          });
        }

        // Delete FollowUpRecommendations
        await tx.followUpRecommendation.deleteMany({
          where: {
            OR: [
              { workspaceId: id },
              ...(applicantIds.length > 0 ? [{ applicantId: { in: applicantIds } }] : []),
            ],
          },
        });

        // Delete LogbookApplicant and Logbook
        if (logbookIds.length > 0) {
          await tx.logbookApplicant.deleteMany({
            where: { logbookId: { in: logbookIds } },
          });
        }
        if (applicantIds.length > 0) {
          await tx.logbookApplicant.deleteMany({
            where: { applicantId: { in: applicantIds } },
          });
        }
        await tx.logbook.deleteMany({
          where: { workspaceId: id },
        });

        // Delete Employee and OutputReport
        if (outputReportIds.length > 0) {
          await tx.employee.deleteMany({
            where: { outputId: { in: outputReportIds } },
          });
          await tx.outputReport.deleteMany({
            where: { workspaceId: id },
          });
        }

        // Delete BusinessProfile and Applicant
        if (applicantIds.length > 0) {
          await tx.businessProfile.deleteMany({
            where: { applicantId: { in: applicantIds } },
          });
          await tx.applicant.deleteMany({
            where: { workspaceId: id },
          });
        }

        // Clean up orphaned Profiles & Addresses
        const candidateProfileIds = Array.from(
          new Set([...applicantProfileIds, ...employeeProfileIds])
        );

        for (const pId of candidateProfileIds) {
          const hasUser = await tx.user.findUnique({
            where: { profileId: pId },
            select: { id: true },
          });
          const otherApplicant = await tx.applicant.findFirst({
            where: { profileId: pId },
            select: { id: true },
          });
          const otherEmployee = await tx.employee.findFirst({
            where: { profileId: pId },
            select: { id: true },
          });

          if (!hasUser && !otherApplicant && !otherEmployee) {
            await tx.address.deleteMany({
              where: { profileId: pId },
            });
            await tx.profile.delete({
              where: { id: pId },
            });
          }
        }
      },
      {
        maxWait: 10000,
        timeout: 60000,
      }
    );

    // 5. Invalidate caches
    try {
      await delCachePattern(`*${id}*`);
      await delCachePattern(`dashboard:*`);
      await delCachePattern(`applicants:*`);
      await delCachePattern(`logbooks:*`);
      await delCachePattern(`reports:*`);
    } catch (cacheErr) {
      console.warn("Gagal membersihkan cache Redis saat reset workspace:", cacheErr);
    }

    // 6. Log Activity
    await createActivity({
      workspaceId: id,
      userId: authUser.id,
      type: "WORKSPACE_RESET",
      title: "Reset Data Operasional Workspace",
      description: `Super Admin telah mereset seluruh data operasional (${applicants.length} peserta, ${logbooks.length} logbook, ${outputReports.length} laporan, ${files.length} file) pada workspace "${workspace.name}".`,
      status: "destructive",
      metadata: {
        deletedApplicants: applicants.length,
        deletedLogbooks: logbooks.length,
        deletedReports: outputReports.length,
        deletedFiles: files.length,
      },
    });

    return jsonResponse({
      message: "Data operasional workspace berhasil direset",
      summary: {
        deletedApplicants: applicants.length,
        deletedLogbooks: logbooks.length,
        deletedReports: outputReports.length,
        deletedFiles: files.length,
      },
    });
  } catch (error: any) {
    console.error("POST /api/workspaces/[id]/reset-data error:", error);
    return errorResponse(error?.message || "Gagal mereset data workspace", 500);
  }
}
