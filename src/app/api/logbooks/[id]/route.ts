import { NextRequest } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth, requireWorkspaceWriteAccess } from "@/lib/rbac";
import { parseFileUrl } from "@/lib/file-helpers";
import { triggerOcrForLogbookFiles } from "@/lib/ocr-trigger";
import { clearApplicantsCache } from "@/lib/cache-helpers";
import { createActivity } from "@/lib/activity-log";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.ok) return authResult.response;

    const { id } = await context.params;
    const logbook = await prisma.logbook.findUnique({
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

    if (!logbook) {
      return errorResponse("Logbook not found", 404);
    }

    if (
      !logbook.verifiedBy &&
      (logbook.verificationStatus === "APPROVED" || logbook.verificationStatus === "REJECTED")
    ) {
      const mentorUnivId = logbook.createdBy?.universityId;
      if (mentorUnivId) {
        const fallbackAdmin = await prisma.workspaceMember.findFirst({
          where: {
            workspaceId: logbook.workspaceId,
            universityId: mentorUnivId,
            role: "UNIVERSITY_ADMIN",
          },
          include: {
            university: true,
            user: {
              include: {
                profile: true,
              },
            },
          },
        });
        if (fallbackAdmin) {
          (logbook as any).verifiedBy = fallbackAdmin;
          if (!logbook.verifiedAt) {
            (logbook as any).verifiedAt = logbook.updatedAt || logbook.createdAt;
          }
        }
      }
    }

    return jsonResponse(logbook);
  } catch (error: any) {
    console.error("[GET /api/logbooks/:id error]:", error);
    return errorResponse("Failed to fetch logbook", 500);
  }
}

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
    const body = await request.json();

    if (body.verificationStatus !== undefined || body.verificationNote !== undefined) {
      if (user.globalRole !== "SUPER_ADMIN" && (!membership || membership.role !== "UNIVERSITY_ADMIN")) {
        return errorResponse(
          "Forbidden: Hanya Admin Universitas yang dapat memverifikasi atau membatalkan verifikasi",
          403
        );
      }
      if (
        body.verificationStatus === "REJECTED" &&
        (!body.verificationNote || body.verificationNote.trim() === "")
      ) {
        return errorResponse("Catatan penolakan wajib diisi jika menolak laporan", 400);
      }
    }

    if (user.globalRole !== "SUPER_ADMIN") {
      if (!membership) {
        return errorResponse("Forbidden: No access to this workspace", 403);
      }
      if (membership.role === "MENTOR") {
        if (logbook.createdById !== membership.id) {
          return errorResponse("Forbidden: You did not create this logbook", 403);
        }
        if (body.verificationStatus !== undefined || body.verificationNote !== undefined) {
          return errorResponse("Forbidden: Mentors cannot verify logbooks", 403);
        }
      } else if (membership.role === "UNIVERSITY_ADMIN") {
        if (
          body.logbookDate !== undefined ||
          body.startTime !== undefined ||
          body.endTime !== undefined ||
          body.activitySummary !== undefined ||
          body.obstacle !== undefined ||
          body.solutions !== undefined ||
          body.rebuttalNote !== undefined
        ) {
          return errorResponse("Forbidden: Admins can only verify, not edit details", 403);
        }
      } else {
        return errorResponse("Forbidden: Insufficient role in workspace", 403);
      }
    }

    const updatedLogbookResult = await prisma.$transaction(async (tx) => {
      let verifiedById = body.verifiedById;
      let verificationStatus = body.verificationStatus;
      let verificationNote = body.verificationNote;
      let verifiedAt: Date | null | undefined = undefined;

      if (body.verificationStatus === "PENDING") {
        verificationStatus = "PENDING";
        verificationNote = null;
        verifiedAt = null;
        verifiedById = null;
      } else if (body.verificationStatus) {
        verifiedAt = body.verifiedAt ? new Date(body.verifiedAt) : new Date();

        if (membership) {
          verifiedById = membership.id;
        } else if (body.verifierUserId) {
          const member = await tx.workspaceMember.findFirst({
            where: { userId: body.verifierUserId, workspaceId: logbook.workspaceId },
          });
          if (member) verifiedById = member.id;
        }

        if (!verifiedById) {
          const member = await tx.workspaceMember.findFirst({
            where: { userId: user.id, workspaceId: logbook.workspaceId },
          });
          if (member) verifiedById = member.id;
        }

        if (!verifiedById && logbook.createdById) {
          const creatorMember = await tx.workspaceMember.findUnique({
            where: { id: logbook.createdById },
          });
          if (creatorMember?.universityId) {
            const adminMember = await tx.workspaceMember.findFirst({
              where: {
                workspaceId: logbook.workspaceId,
                universityId: creatorMember.universityId,
                role: "UNIVERSITY_ADMIN",
              },
            });
            if (adminMember) verifiedById = adminMember.id;
          }
        }
      }

      let rebuttalNote = body.rebuttalNote;
      let existingHistory: any[] = [];
      if (Array.isArray(logbook.verificationHistory)) {
        existingHistory = [...(logbook.verificationHistory as any[])];
      }

      if (
        membership &&
        membership.role === "MENTOR" &&
        logbook.verificationStatus === "REJECTED"
      ) {
        verificationStatus = "PENDING";
        verificationNote = null;
        verifiedAt = null;
        verifiedById = null;

        if (existingHistory.length === 0 && logbook.verificationNote) {
          existingHistory.push({
            id: crypto.randomUUID(),
            role: "UNIVERSITY_ADMIN",
            action: "REJECTED",
            authorName: "Admin Universitas",
            authorRole: "Admin Universitas",
            note: logbook.verificationNote,
            createdAt: logbook.verifiedAt ? new Date(logbook.verifiedAt).toISOString() : new Date().toISOString(),
          });
        }

        if (rebuttalNote && String(rebuttalNote).trim()) {
          const authorUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { profile: true },
          });
          const authorName =
            authorUser?.profile?.name || authorUser?.profile?.email || authorUser?.username || "Pendamping";
          existingHistory.push({
            id: crypto.randomUUID(),
            role: "MENTOR",
            action: "REBUTTAL",
            authorName: authorName,
            authorRole: "Pendamping",
            note: String(rebuttalNote).trim(),
            createdAt: new Date().toISOString(),
          });
        }
      }

      const targetDate = body.logbookDate || logbook.logbookDate;
      const parseTime = (timeInput: any, dateInput: any): Date => {
        if (!timeInput) return new Date("Invalid Date");
        const parsed = new Date(timeInput);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
        if (typeof timeInput === "string" && dateInput) {
          const baseDate = new Date(dateInput);
          if (!isNaN(baseDate.getTime())) {
            const match = timeInput.match(/^(\d{1,2}):(\d{2})/);
            if (match) {
              const result = new Date(baseDate);
              result.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
              return result;
            }
          }
        }
        return new Date(timeInput);
      };

      let calculatedJpl: number | undefined = undefined;
      if (typeof body.jpl === "number") {
        calculatedJpl = body.jpl;
      } else if (body.startTime && body.endTime) {
        const start = parseTime(body.startTime, targetDate);
        const end = parseTime(body.endTime, targetDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
          const diffMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
          calculatedJpl = Math.max(1, Math.round(diffMinutes / 45));
        }
      }

      let finalMeetingType = body.meetingType;
      if (body.applicantIds && Array.isArray(body.applicantIds)) {
        finalMeetingType = body.applicantIds.length > 1 ? "GROUP" : "INDIVIDUAL";
      } else if (finalMeetingType === undefined) {
        finalMeetingType = logbook.meetingType;
      }

      const finalDeliveryMethod =
        body.deliveryMethod !== undefined ? body.deliveryMethod : logbook.deliveryMethod;
      let finalVisitType = body.visitType !== undefined ? body.visitType : logbook.visitType;

      if (finalDeliveryMethod === "ONLINE" || finalMeetingType === "GROUP") {
        finalVisitType = "NONE";
      } else if (finalDeliveryMethod === "OFFLINE" && finalMeetingType === "INDIVIDUAL") {
        if (!finalVisitType || finalVisitType === "NONE") {
          finalVisitType = "LOCAL";
        }
      }

      const updatedLogbook = await tx.logbook.update({
        where: { id },
        data: {
          logbookDate: body.logbookDate ? new Date(body.logbookDate) : undefined,
          startTime: body.startTime ? parseTime(body.startTime, targetDate) : undefined,
          endTime: body.endTime ? parseTime(body.endTime, targetDate) : undefined,
          jpl: calculatedJpl,
          deliveryMethod: finalDeliveryMethod,
          meetingType: finalMeetingType,
          visitType: finalVisitType,
          mentoringMaterial: body.mentoringMaterial,
          activitySummary: body.activitySummary,
          obstacle: body.obstacle,
          solutions: body.solutions,
          totalExpense: body.totalExpense,
          reasonNoExpense: body.reasonNoExpense,
          verificationStatus: verificationStatus as any,
          verificationNote: verificationNote,
          rebuttalNote: rebuttalNote,
          verifiedAt: verifiedAt,
          verifiedById: verifiedById,
          ...(membership && membership.role === "MENTOR" && logbook.verificationStatus === "REJECTED"
            ? { verificationHistory: existingHistory }
            : {}),
        },
      });

      if (body.applicantIds && Array.isArray(body.applicantIds)) {
        await tx.logbookApplicant.deleteMany({
          where: { logbookId: id },
        });
        await tx.logbookApplicant.createMany({
          data: body.applicantIds.map((appId: string) => ({
            logbookId: id,
            applicantId: appId,
          })),
        });
      }

      if (body.files && Array.isArray(body.files)) {
        const existingFiles = await tx.file.findMany({
          where: { logbookId: id },
          select: { id: true },
        });
        const existingFileIds = existingFiles.map((f) => f.id);

        await tx.ocrResult.deleteMany({
          where: { file: { logbookId: id } },
        });
        if (existingFileIds.length > 0) {
          await tx.ocrJob.deleteMany({
            where: { fileId: { in: existingFileIds } },
          });
        }
        await tx.file.deleteMany({
          where: { logbookId: id },
        });

        await tx.file.createMany({
          data: body.files.map((f: any) => {
            const { objectKey, bucket } = parseFileUrl(f.url);
            return {
              url: f.url,
              objectKey,
              bucket,
              category: f.category,
              logbookId: id,
            };
          }),
        });
      }

      return updatedLogbook;
    });

    if (updatedLogbookResult) {
      await triggerOcrForLogbookFiles(id);
      await clearApplicantsCache(updatedLogbookResult.workspaceId);

      if (body.verificationStatus) {
        const verifier = await prisma.workspaceMember.findUnique({
          where: { id: updatedLogbookResult.verifiedById || "" },
          include: { user: { include: { profile: true } } },
        });
        const creator = await prisma.workspaceMember.findUnique({
          where: { id: updatedLogbookResult.createdById },
          include: { user: { include: { profile: true } } },
        });
        const currentUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { profile: true },
        });

        const actionUserName = currentUser?.profile?.name || verifier?.user?.profile?.name || "Admin";
        const mentorName = creator?.user?.profile?.name || "Mentor";
        const formattedDate = new Date(updatedLogbookResult.logbookDate).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        if (updatedLogbookResult.verificationStatus === "PENDING") {
          await createActivity({
            workspaceId: updatedLogbookResult.workspaceId,
            userId: user.id,
            type: "LOGBOOK_UNVERIFIED",
            title: "Verifikasi Logbook Dibatalkan",
            description: `Status verifikasi logbook ${formattedDate} milik ${mentorName} dikembalikan ke Menunggu Verifikasi (Pending) oleh ${actionUserName}`,
            status: "amber",
          });
        } else {
          const isApproved = updatedLogbookResult.verificationStatus === "APPROVED";
          await createActivity({
            workspaceId: updatedLogbookResult.workspaceId,
            userId: user.id,
            type: "LOGBOOK_VERIFIED",
            title: isApproved ? "Logbook Disetujui" : "Logbook Ditolak",
            description: `Logbook ${formattedDate} milik ${mentorName} telah ${
              isApproved ? "disetujui" : "ditolak"
            } oleh ${actionUserName}`,
            status: isApproved ? "emerald" : "destructive",
          });
        }
      }
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

    return jsonResponse(fullLogbook ?? updatedLogbookResult);
  } catch (error: any) {
    console.error("[PATCH /api/logbooks/:id error]:", error);
    return errorResponse("Failed to update logbook", 500);
  }
}

export async function DELETE(
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

    if (user.globalRole !== "SUPER_ADMIN") {
      if (!membership || membership.role !== "MENTOR" || logbook.createdById !== membership.id) {
        return errorResponse(
          "Forbidden: Only the logbook creator or SUPER_ADMIN can delete this",
          403
        );
      }

      if (logbook.verificationStatus === "APPROVED") {
        return errorResponse("Forbidden: Logbook yang sudah disetujui tidak dapat dihapus", 400);
      }
    }

    await prisma.$transaction([
      prisma.logbookApplicant.deleteMany({ where: { logbookId: id } }),
      prisma.logbook.delete({ where: { id } }),
    ]);

    await clearApplicantsCache(logbook.workspaceId);

    const creator = await prisma.workspaceMember.findUnique({
      where: { id: logbook.createdById },
      include: { user: { include: { profile: true } } },
    });
    const mentorName = creator?.user?.profile?.name || "Mentor";
    const formattedDate = new Date(logbook.logbookDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    await createActivity({
      workspaceId: logbook.workspaceId,
      userId: user.id,
      type: "LOGBOOK_DELETED",
      title: "Logbook Dihapus",
      description: `Logbook ${formattedDate} milik ${mentorName} telah dihapus`,
      status: "destructive",
    });

    return new Response(null, { status: 204 });
  } catch (error: any) {
    console.error("[DELETE /api/logbooks/:id error]:", error);
    return errorResponse("Failed to delete logbook", 500);
  }
}
