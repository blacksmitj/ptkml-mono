import { NextRequest } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireWorkspaceWriteAccess } from "@/lib/rbac";
import { clearApplicantsCache } from "@/lib/cache-helpers";
import { createActivity } from "@/lib/activity-log";
import { z } from "zod";

const verifyLogbookSchema = z.object({
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
    const logbook = await prisma.logbook.findUnique({
      where: { id },
    });
    if (!logbook) {
      return errorResponse("Logbook not found", 404);
    }

    const access = await requireWorkspaceWriteAccess(request, logbook.workspaceId);
    if (!access.ok) return access.response;

    const { user, membership } = access.data;
    const body = await parseBody(request, verifyLogbookSchema);

    // RBAC: Only UNIVERSITY_ADMIN or SUPER_ADMIN can verify
    if (user.globalRole !== "SUPER_ADMIN") {
      if (!membership || membership.role !== "UNIVERSITY_ADMIN") {
        return errorResponse(
          "Forbidden: Hanya Admin Universitas yang dapat memverifikasi logbook",
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
        return errorResponse("Catatan penolakan wajib diisi jika menolak laporan", 400);
      }

      verifiedAt = body.verifiedAt ? new Date(body.verifiedAt) : new Date();

      if (membership) {
        verifiedById = membership.id;
      } else if (body.verifierUserId) {
        const member = await prisma.workspaceMember.findFirst({
          where: { userId: body.verifierUserId, workspaceId: logbook.workspaceId },
        });
        if (member) verifiedById = member.id;
      }

      if (!verifiedById) {
        const member = await prisma.workspaceMember.findFirst({
          where: { userId: user.id, workspaceId: logbook.workspaceId },
        });
        if (member) verifiedById = member.id;
      }
    }

    let existingHistory: any[] = [];
    if (Array.isArray(logbook.verificationHistory)) {
      existingHistory = [...(logbook.verificationHistory as any[])];
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

    const updatedLogbook = await prisma.logbook.update({
      where: { id },
      data: {
        verificationStatus: verificationStatus as any,
        verificationNote: verificationNote,
        verifiedAt: verifiedAt,
        verifiedById: verifiedById,
        ...(verificationStatus === "REJECTED" ? { verificationHistory: existingHistory } : {}),
      },
    });

    await clearApplicantsCache(updatedLogbook.workspaceId);

    const verifier = await prisma.workspaceMember.findUnique({
      where: { id: updatedLogbook.verifiedById || "" },
      include: { user: { include: { profile: true } } },
    });
    const creator = await prisma.workspaceMember.findUnique({
      where: { id: updatedLogbook.createdById },
      include: { user: { include: { profile: true } } },
    });
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });

    const actionUserName = currentUser?.profile?.name || verifier?.user?.profile?.name || "Admin";
    const mentorName = creator?.user?.profile?.name || "Mentor";
    const formattedDate = new Date(updatedLogbook.logbookDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    if (updatedLogbook.verificationStatus === "PENDING") {
      await createActivity({
        workspaceId: updatedLogbook.workspaceId,
        userId: user.id,
        type: "LOGBOOK_UNVERIFIED",
        title: "Verifikasi Logbook Dibatalkan",
        description: `Status verifikasi logbook ${formattedDate} milik ${mentorName} dikembalikan ke Menunggu Verifikasi (Pending) oleh ${actionUserName}`,
        status: "amber",
      });
    } else {
      const isApproved = updatedLogbook.verificationStatus === "APPROVED";
      await createActivity({
        workspaceId: updatedLogbook.workspaceId,
        userId: user.id,
        type: "LOGBOOK_VERIFIED",
        title: isApproved ? "Logbook Disetujui" : "Logbook Ditolak",
        description: `Logbook ${formattedDate} milik ${mentorName} telah ${
          isApproved ? "disetujui" : "ditolak"
        } oleh ${actionUserName}`,
        status: isApproved ? "emerald" : "destructive",
      });
    }

    const fullLogbook = await prisma.logbook.findUnique({
      where: { id },
      include: {
        createdBy: {
          include: {
            university: true,
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        applicants: {
          include: {
            applicant: {
              include: {
                profile: true,
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
              include: {
                validations: true,
              },
            },
          },
        },
      },
    });

    return jsonResponse(fullLogbook ?? updatedLogbook);
  } catch (error: any) {
    console.error("[PATCH /api/logbooks/:id/verify error]:", error);
    return errorResponse(error.message || "Failed to verify logbook", 500);
  }
}
