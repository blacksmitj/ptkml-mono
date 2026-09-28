import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireGlobalRole } from "@/lib/rbac";
import { z } from "zod";

const updateDashboardEventSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  recurrenceType: z.enum(["MONTHLY_DAY", "EXACT_DATE", "WEEKLY"]).optional(),
  dayOfMonth: z.union([z.number(), z.string()]).optional().nullable(),
  dayOfWeek: z.union([z.number(), z.string()]).optional().nullable(),
  exactDate: z.string().optional().nullable(),
  activeDaysBefore: z.union([z.number(), z.string()]).optional().nullable(),
  activeDaysAfter: z.union([z.number(), z.string()]).optional().nullable(),
  actionUrl: z.string().optional().nullable(),
  actionLabel: z.string().optional().nullable(),
  targetRole: z.enum(["ALL", "MENTOR", "UNIVERSITY_ADMIN", "UNIVERSITY_SUPERVISOR", "SUPER_ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (!adminUser.ok) return adminUser.response;

    const { id } = await context.params;
    const body = await parseBody(request, updateDashboardEventSchema);

    const updated = await prisma.dashboardEvent.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        recurrenceType: body.recurrenceType,
        dayOfMonth: body.dayOfMonth !== undefined ? (body.dayOfMonth !== null ? parseInt(String(body.dayOfMonth), 10) : null) : undefined,
        dayOfWeek: body.dayOfWeek !== undefined ? (body.dayOfWeek !== null ? parseInt(String(body.dayOfWeek), 10) : null) : undefined,
        exactDate: body.exactDate !== undefined ? (body.exactDate ? new Date(body.exactDate) : null) : undefined,
        activeDaysBefore: body.activeDaysBefore !== undefined ? (body.activeDaysBefore !== null ? parseInt(String(body.activeDaysBefore), 10) : 5) : undefined,
        activeDaysAfter: body.activeDaysAfter !== undefined ? (body.activeDaysAfter !== null ? parseInt(String(body.activeDaysAfter), 10) : 1) : undefined,
        actionUrl: body.actionUrl,
        actionLabel: body.actionLabel,
        targetRole: body.targetRole,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
    });

    return jsonResponse({ event: updated });
  } catch (error: any) {
    console.error("[Dashboard Event Update Error]:", error);
    return errorResponse(error.message || "Failed to update dashboard event", 400);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (!adminUser.ok) return adminUser.response;

    const { id } = await context.params;

    await prisma.dashboardEvent.delete({
      where: { id },
    });

    return jsonResponse({ success: true });
  } catch (error: any) {
    console.error("[Dashboard Event Delete Error]:", error);
    return errorResponse("Failed to delete dashboard event", 500);
  }
}
