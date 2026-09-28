import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireWorkspaceAccess, requireWorkspaceWriteAccess } from "@/lib/rbac";
import { parseFileUrl } from "@/lib/file-helpers";
import { triggerOcrForLogbookFiles } from "@/lib/ocr-trigger";
import { clearApplicantsCache } from "@/lib/cache-helpers";
import { createActivity } from "@/lib/activity-log";
import { z } from "zod";

const createLogbookSchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),
  createdById: z.string().optional(),
  userId: z.string().optional(),
  logbookDate: z.string().min(1, "logbookDate is required"),
  startTime: z.any().optional(),
  endTime: z.any().optional(),
  jpl: z.number().optional(),
  deliveryMethod: z.enum(["OFFLINE", "ONLINE"]).optional().default("OFFLINE"),
  meetingType: z.enum(["INDIVIDUAL", "GROUP"]).optional().default("INDIVIDUAL"),
  visitType: z.enum(["LOCAL", "OUTSIDE_CITY", "OUTSIDE_PROVINCE", "NONE"]).optional().default("NONE"),
  mentoringMaterial: z.string().min(1, "mentoringMaterial is required"),
  activitySummary: z.string().min(1, "activitySummary is required"),
  obstacle: z.string().optional().nullable(),
  solutions: z.string().optional().nullable(),
  totalExpense: z.number().optional().nullable(),
  reasonNoExpense: z.string().optional().nullable(),
  applicantIds: z.array(z.string()).optional(),
  files: z
    .array(
      z.object({
        url: z.string().min(1),
        category: z.string().optional(),
      })
    )
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const createdById = searchParams.get("createdById");
    const applicantId = searchParams.get("applicantId");

    if (!workspaceId) {
      return errorResponse("workspaceId is required", 400);
    }

    const access = await requireWorkspaceAccess(request, workspaceId);
    if (!access.ok) return access.response;

    const { user, membership } = access.data;
    const whereAnd: any[] = [{ workspaceId }];
    if (createdById) whereAnd.push({ createdById });
    if (applicantId) {
      whereAnd.push({
        applicants: {
          some: { applicantId },
        },
      });
    }

    if (user.globalRole !== "SUPER_ADMIN" && user.globalRole !== "WORKSPACE_SUPERVISOR") {
      if (!membership) {
        return errorResponse("Forbidden: No access to this workspace", 403);
      }
      if (membership.role === "MENTOR") {
        whereAnd.push({ createdById: membership.id });
      } else if (
        membership.role === "UNIVERSITY_ADMIN" ||
        membership.role === "UNIVERSITY_SUPERVISOR"
      ) {
        whereAnd.push({
          createdBy: {
            universityId: membership.universityId,
          },
        });
      }
    }

    const verificationStatus = searchParams.get("verificationStatus");
    if (verificationStatus && verificationStatus !== "ALL") {
      whereAnd.push({ verificationStatus });
    }

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      whereAnd.push({ logbookDate: dateFilter });
    }

    const search = searchParams.get("search");
    if (search) {
      const searchVal = search.trim();
      whereAnd.push({
        OR: [
          { mentoringMaterial: { contains: searchVal, mode: "insensitive" } },
          { activitySummary: { contains: searchVal, mode: "insensitive" } },
          { obstacle: { contains: searchVal, mode: "insensitive" } },
          { solutions: { contains: searchVal, mode: "insensitive" } },
          {
            applicants: {
              some: {
                applicant: {
                  profile: {
                    name: { contains: searchVal, mode: "insensitive" },
                  },
                },
              },
            },
          },
          {
            createdBy: {
              user: {
                profile: {
                  name: { contains: searchVal, mode: "insensitive" },
                },
              },
            },
          },
        ],
      });
    }

    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";
    const sortBy = searchParams.get("sortBy");
    let orderBy: any = { logbookDate: "desc" };
    if (sortBy) {
      if (sortBy === "createdBy") {
        orderBy = { createdBy: { user: { profile: { name: sortOrder } } } };
      } else {
        orderBy = { [sortBy]: sortOrder };
      }
    }

    const includeClause = {
      createdBy: {
        include: {
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
      files: {
        include: {
          ocrResult: {
            include: {
              validations: true,
            },
          },
        },
      },
      verifiedBy: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      },
    };

    const isPaginated = searchParams.get("page") !== null;

    if (isPaginated) {
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
      const skip = (page - 1) * limit;

      const [total, logbooks] = await Promise.all([
        prisma.logbook.count({
          where: {
            AND: whereAnd,
          },
        }),
        prisma.logbook.findMany({
          where: {
            AND: whereAnd,
          },
          include: includeClause,
          orderBy,
          skip,
          take: limit,
        }),
      ]);

      const logbooksWithOcrSummary = logbooks.map((logbook) => {
        let ocrMismatchCount = 0;
        let ocrFailedCount = 0;
        let ocrPendingCount = 0;
        let totalOcrProcessed = 0;
        let totalOcrEligible = 0;
        const mismatchFields: string[] = [];
        const eligibleCategories = ["EXPENSE_PROOF"];

        for (const file of logbook.files) {
          if (eligibleCategories.includes(file.category)) {
            totalOcrEligible++;
            if (file.ocrResult) {
              if (file.ocrResult.status === "COMPLETED") totalOcrProcessed++;
              if (file.ocrResult.status === "FAILED") ocrFailedCount++;
              if (file.ocrResult.status === "PENDING" || file.ocrResult.status === "PROCESSING")
                ocrPendingCount++;
              for (const val of file.ocrResult.validations) {
                if (!val.isMatch) {
                  ocrMismatchCount++;
                  mismatchFields.push(`Bukti Pengeluaran: ${val.fieldName}`);
                }
              }
            }
          }
        }

        return {
          ...logbook,
          ocrSummary: {
            mismatchCount: ocrMismatchCount,
            failedCount: ocrFailedCount,
            pendingCount: ocrPendingCount,
            totalProcessed: totalOcrProcessed,
            totalEligible: totalOcrEligible,
            mismatchFields,
          },
        };
      });

      return jsonResponse({
        data: logbooksWithOcrSummary,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    const logbooks = await prisma.logbook.findMany({
      where: {
        AND: whereAnd,
      },
      include: includeClause,
      orderBy,
    });

    const logbooksWithOcrSummary = logbooks.map((logbook) => {
      let ocrMismatchCount = 0;
      let ocrFailedCount = 0;
      let ocrPendingCount = 0;
      let totalOcrProcessed = 0;
      let totalOcrEligible = 0;
      const mismatchFields: string[] = [];
      const eligibleCategories = ["EXPENSE_PROOF"];

      for (const file of logbook.files) {
        if (eligibleCategories.includes(file.category)) {
          totalOcrEligible++;
          if (file.ocrResult) {
            if (file.ocrResult.status === "COMPLETED") totalOcrProcessed++;
            if (file.ocrResult.status === "FAILED") ocrFailedCount++;
            if (file.ocrResult.status === "PENDING" || file.ocrResult.status === "PROCESSING")
              ocrPendingCount++;
            for (const val of file.ocrResult.validations) {
              if (!val.isMatch) {
                ocrMismatchCount++;
                mismatchFields.push(`Bukti Pengeluaran: ${val.fieldName}`);
              }
            }
          }
        }
      }

      return {
        ...logbook,
        ocrSummary: {
          mismatchCount: ocrMismatchCount,
          failedCount: ocrFailedCount,
          pendingCount: ocrPendingCount,
          totalProcessed: totalOcrProcessed,
          totalEligible: totalOcrEligible,
          mismatchFields,
        },
      };
    });

    return jsonResponse(logbooksWithOcrSummary);
  } catch (error: any) {
    console.error("[GET /api/logbooks error]:", error);
    return errorResponse("Failed to fetch logbooks", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request, createLogbookSchema);

    const access = await requireWorkspaceWriteAccess(request, body.workspaceId);
    if (!access.ok) return access.response;

    const { user, membership } = access.data;
    if (user.globalRole !== "SUPER_ADMIN") {
      if (!membership || membership.role !== "MENTOR") {
        return errorResponse("Forbidden: Only Mentors can create logbooks", 403);
      }
    }

    let createdById = body.createdById;

    if (user.globalRole !== "SUPER_ADMIN") {
      if (!membership) {
        return errorResponse("Forbidden: No access to this workspace", 403);
      }
      createdById = membership.id;
    } else {
      if (body.userId && body.workspaceId) {
        const member = await prisma.workspaceMember.findFirst({
          where: {
            userId: body.userId,
            workspaceId: body.workspaceId,
          },
        });
        if (member) {
          createdById = member.id;
        }
      }
    }

    if (!createdById) {
      return errorResponse("Member ID could not be resolved", 400);
    }

    const logbook = await prisma.$transaction(async (tx) => {
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

      const startTime = parseTime(body.startTime, body.logbookDate);
      const endTime = parseTime(body.endTime, body.logbookDate);
      const diffMs = endTime.getTime() - startTime.getTime();
      const diffMinutes = isNaN(diffMs) ? 0 : diffMs / (1000 * 60);
      const jpl = typeof body.jpl === "number" ? body.jpl : Math.max(1, Math.round(diffMinutes / 45));

      const meetingType =
        body.applicantIds && Array.isArray(body.applicantIds) && body.applicantIds.length > 1
          ? "GROUP"
          : body.meetingType || "INDIVIDUAL";
      const deliveryMethod = body.deliveryMethod || "OFFLINE";
      const isOfflineIndividual = deliveryMethod === "OFFLINE" && meetingType === "INDIVIDUAL";
      const visitType = isOfflineIndividual
        ? body.visitType && body.visitType !== "NONE"
          ? (body.visitType as any)
          : "LOCAL"
        : "NONE";

      const newLogbook = await tx.logbook.create({
        data: {
          workspaceId: body.workspaceId,
          createdById: createdById!,
          logbookDate: new Date(body.logbookDate),
          startTime: startTime,
          endTime: endTime,
          jpl: jpl,
          deliveryMethod: deliveryMethod,
          meetingType: meetingType,
          visitType: visitType as any,
          mentoringMaterial: body.mentoringMaterial,
          activitySummary: body.activitySummary,
          obstacle: body.obstacle ?? null,
          solutions: body.solutions ?? null,
          totalExpense: body.totalExpense ?? null,
          reasonNoExpense: body.reasonNoExpense ?? null,
        },
      });

      if (body.applicantIds && Array.isArray(body.applicantIds)) {
        await tx.logbookApplicant.createMany({
          data: body.applicantIds.map((applicantId: string) => ({
            logbookId: newLogbook.id,
            applicantId,
          })),
        });
      }

      if (body.files && Array.isArray(body.files)) {
        await tx.file.createMany({
          data: body.files.map((f: any) => {
            const { objectKey, bucket } = parseFileUrl(f.url);
            return {
              url: f.url,
              objectKey,
              bucket,
              category: f.category || "EXPENSE_PROOF",
              logbookId: newLogbook.id,
            };
          }),
        });
      }

      return tx.logbook.findUnique({
        where: { id: newLogbook.id },
        include: {
          applicants: true,
          files: true,
        },
      });
    });

    if (logbook) {
      await triggerOcrForLogbookFiles(logbook.id);
      await clearApplicantsCache(logbook.workspaceId);

      const creator = await prisma.workspaceMember.findUnique({
        where: { id: createdById },
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
        type: "LOGBOOK_CREATED",
        title: "Logbook Baru Dikirim",
        description: `Logbook harian dikirim oleh ${mentorName} untuk tanggal ${formattedDate}`,
        status: "blue",
      });
    }

    return jsonResponse(logbook, 201);
  } catch (error: any) {
    console.error("[POST /api/logbooks error]:", error);
    return errorResponse(error.message || "Failed to create logbook", 500);
  }
}
