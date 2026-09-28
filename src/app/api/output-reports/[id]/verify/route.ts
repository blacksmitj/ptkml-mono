import { NextRequest } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireWorkspaceWriteAccess } from "@/lib/rbac";
import { clearApplicantsCache } from "@/lib/cache-helpers";
import { createActivity } from "@/lib/activity-log";
import { VerificationStatus } from "@prisma/client";
import { z } from "zod";

const verifyOutputReportSchema = z.object({
  verificationStatus: z.enum(["APPROVED", "REJECTED", "PENDING"]),
  verificationNote: z.string().optional().nullable(),
  verifiedAt: z.string().optional().nullable(),
  verifierUserId: z.string().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const report = await prisma.outputReport.findUnique({
      where: { id },
      include: {
        applicant: true,
      },
    });

    if (!report) {
      return errorResponse("Output report not found", 404);
    }

    const access = await requireWorkspaceWriteAccess(request, report.workspaceId);
    if (!access.ok) return access.response;

    const { user, membership } = access.data;
    const body = await parseBody(request, verifyOutputReportSchema);

    // RBAC: Only UNIVERSITY_ADMIN or SUPER_ADMIN can verify output reports
    if (user.globalRole !== "SUPER_ADMIN") {
      if (!membership || membership.role !== "UNIVERSITY_ADMIN") {
        return errorResponse(
          "Forbidden: Hanya Admin Universitas yang dapat memverifikasi laporan output",
          403
        );
      }
    }

    const verificationStatus = body.verificationStatus;
    let verifiedById: string | null = null;
    let verifiedAt: Date | null = null;
    let verificationNote: string | null = null;

    if (verificationStatus !== "PENDING") {
      verificationNote = body.verificationNote || null;
      if (verificationStatus === "REJECTED" && (!verificationNote || verificationNote.trim() === "")) {
        return errorResponse("Catatan verifikasi wajib diisi jika menolak laporan", 400);
      }

      verifiedAt = body.verifiedAt ? new Date(body.verifiedAt) : new Date();

      if (membership) {
        verifiedById = membership.id;
      } else if (body.verifierUserId) {
        const member = await prisma.workspaceMember.findFirst({
          where: { userId: body.verifierUserId, workspaceId: report.workspaceId },
        });
        if (member) verifiedById = member.id;
      }

      if (!verifiedById) {
        const member = await prisma.workspaceMember.findFirst({
          where: { userId: user.id, workspaceId: report.workspaceId },
        });
        if (member) verifiedById = member.id;
      }
    }

    let existingHistory: any[] = [];
    if (Array.isArray(report.verificationHistory)) {
      existingHistory = [...(report.verificationHistory as any[])];
    }

    if (verificationStatus === "REJECTED" && verificationNote && verificationNote.trim()) {
      const currentUserObj = await prisma.user.findUnique({
        where: { id: user.id },
        include: { profile: true },
      });
      const authorName =
        currentUserObj?.profile?.name ||
        currentUserObj?.profile?.email ||
        currentUserObj?.username ||
        (user.globalRole === "SUPER_ADMIN" ? "Super Admin" : "Admin Universitas");
      existingHistory.push({
        id: crypto.randomUUID(),
        role: (membership?.role as any) || user.globalRole || "UNIVERSITY_ADMIN",
        action: "REJECTED",
        authorName: authorName,
        authorRole: user.globalRole === "SUPER_ADMIN" ? "Super Admin" : "Admin Universitas",
        note: verificationNote.trim(),
        createdAt: new Date().toISOString(),
      });
    }

    const reportUpdated = await prisma.outputReport.update({
      where: { id },
      data: {
        verificationStatus: verificationStatus as VerificationStatus,
        verificationNote: verificationNote,
        verifiedAt: verifiedAt,
        verifiedById: verifiedById,
        ...(verificationStatus === "REJECTED" ? { verificationHistory: existingHistory } : {}),
      },
    });

    await clearApplicantsCache(reportUpdated.workspaceId);

    const verifier = await prisma.workspaceMember.findUnique({
      where: { id: reportUpdated.verifiedById || "" },
      include: { user: { include: { profile: true } } },
    });
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });
    const actionUserName = currentUser?.profile?.name || verifier?.user?.profile?.name || "Admin";

    const applicantObj = await prisma.applicant.findUnique({
      where: { id: reportUpdated.applicantId },
      include: { profile: true },
    });
    const applicantName = applicantObj?.profile?.name || "Peserta";

    if (reportUpdated.verificationStatus === "PENDING") {
      await createActivity({
        workspaceId: reportUpdated.workspaceId,
        userId: user.id,
        type: "OUTPUT_UNVERIFIED",
        title: "Verifikasi Laporan Output Dibatalkan",
        description: `Status verifikasi laporan output bulan ke-${reportUpdated.monthReport} untuk ${applicantName} dikembalikan ke Menunggu Verifikasi (Pending) oleh ${actionUserName}`,
        status: "amber",
      });
    } else {
      const isApproved = reportUpdated.verificationStatus === "APPROVED";
      await createActivity({
        workspaceId: reportUpdated.workspaceId,
        userId: user.id,
        type: "OUTPUT_VERIFIED",
        title: isApproved ? "Laporan Output Disetujui" : "Laporan Output Ditolak",
        description: `Laporan output bulan ke-${reportUpdated.monthReport} untuk ${applicantName} telah ${
          isApproved ? "disetujui" : "ditolak"
        } oleh ${actionUserName}`,
        status: isApproved ? "emerald" : "destructive",
      });
    }

    const fullReport = await prisma.outputReport.findUnique({
      where: { id },
      include: {
        applicant: {
          include: {
            profile: true,
            mentor: {
              include: {
                university: true,
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
        verifiedBy: {
          include: {
            university: true,
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        files: {
          include: {
            ocrResult: {
              include: { validations: true },
            },
          },
        },
        employees: {
          include: {
            files: {
              include: {
                ocrResult: {
                  include: { validations: true },
                },
              },
            },
          },
        },
      },
    });

    return jsonResponse(fullReport ?? reportUpdated);
  } catch (error: any) {
    console.error("[PATCH /api/output-reports/:id/verify error]:", error);
    return errorResponse(error.message || "Failed to verify output report", 500);
  }
}
