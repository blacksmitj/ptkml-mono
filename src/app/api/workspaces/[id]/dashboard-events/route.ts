import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireGlobalRole } from "@/lib/rbac";
import { z } from "zod";

const createDashboardEventSchema = z.object({
  title: z.string().min(1, "Judul harus diisi"),
  description: z.string().optional().nullable(),
  recurrenceType: z.enum(["MONTHLY_DAY", "EXACT_DATE", "WEEKLY"]).default("MONTHLY_DAY"),
  dayOfMonth: z.union([z.number(), z.string()]).optional().nullable(),
  dayOfWeek: z.union([z.number(), z.string()]).optional().nullable(),
  exactDate: z.string().optional().nullable(),
  activeDaysBefore: z.union([z.number(), z.string()]).optional().nullable(),
  activeDaysAfter: z.union([z.number(), z.string()]).optional().nullable(),
  actionUrl: z.string().optional().nullable(),
  actionLabel: z.string().optional().nullable(),
  targetRole: z.enum(["ALL", "MENTOR", "UNIVERSITY_ADMIN", "UNIVERSITY_SUPERVISOR", "SUPER_ADMIN"]).default("MENTOR"),
  isActive: z.boolean().optional().default(true),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (!adminUser.ok) return adminUser.response;

    const { id: workspaceId } = await context.params;

    const events = await prisma.dashboardEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse({ events });
  } catch (error: any) {
    console.error("[Dashboard Events List Error]:", error);
    return errorResponse("Failed to fetch dashboard events", 500);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (!adminUser.ok) return adminUser.response;

    const { id: workspaceId } = await context.params;
    const body = await parseBody(request, createDashboardEventSchema);

    const newEvent = await prisma.dashboardEvent.create({
      data: {
        workspaceId,
        title: body.title,
        description: body.description || null,
        recurrenceType: body.recurrenceType,
        dayOfMonth: body.dayOfMonth !== null && body.dayOfMonth !== undefined ? parseInt(String(body.dayOfMonth), 10) : null,
        dayOfWeek: body.dayOfWeek !== null && body.dayOfWeek !== undefined ? parseInt(String(body.dayOfWeek), 10) : null,
        exactDate: body.exactDate ? new Date(body.exactDate) : null,
        activeDaysBefore: body.activeDaysBefore !== null && body.activeDaysBefore !== undefined ? parseInt(String(body.activeDaysBefore), 10) : 5,
        activeDaysAfter: body.activeDaysAfter !== null && body.activeDaysAfter !== undefined ? parseInt(String(body.activeDaysAfter), 10) : 1,
        actionUrl: body.actionUrl || null,
        actionLabel: body.actionLabel || null,
        targetRole: body.targetRole,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });

    return jsonResponse({ event: newEvent }, 201);
  } catch (error: any) {
    console.error("[Dashboard Events Create Error]:", error);
    return errorResponse(error.message || "Failed to create dashboard event", 400);
  }
}
