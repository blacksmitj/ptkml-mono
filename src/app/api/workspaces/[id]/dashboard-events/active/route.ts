import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { requireWorkspaceAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await context.params;
    const access = await requireWorkspaceAccess(request, workspaceId);
    if (!access.ok) return access.response;

    const { user, membership } = access.data;

    // Fetch events for workspace
    const events = await prisma.dashboardEvent.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      include: {
        dismissals: {
          where: {
            userId: user.id,
          },
        },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed

    const activeEvents: any[] = [];

    for (const event of events) {
      // Check if dismissed by user
      if (event.dismissals && event.dismissals.length > 0) {
        continue;
      }

      // Check role eligibility
      if (event.targetRole !== "ALL") {
        const isSuperAdmin = user.globalRole === "SUPER_ADMIN" || user.globalRole === "WORKSPACE_SUPERVISOR";
        const isMentor = membership?.role === "MENTOR";
        const isUniAdmin = membership?.role === "UNIVERSITY_ADMIN";
        const isUniSupervisor = membership?.role === "UNIVERSITY_SUPERVISOR";

        if (event.targetRole === "MENTOR" && !isMentor && !isSuperAdmin) continue;
        if (event.targetRole === "UNIVERSITY_ADMIN" && !isUniAdmin && !isSuperAdmin) continue;
        if (event.targetRole === "UNIVERSITY_SUPERVISOR" && !isUniSupervisor && !isSuperAdmin) continue;
        if (event.targetRole === "SUPER_ADMIN" && !isSuperAdmin) continue;
      }

      let targetDate: Date | null = null;

      if (event.recurrenceType === "MONTHLY_DAY" && event.dayOfMonth) {
        targetDate = new Date(currentYear, currentMonth, event.dayOfMonth);
      } else if (event.recurrenceType === "EXACT_DATE" && event.exactDate) {
        targetDate = new Date(event.exactDate);
        targetDate.setHours(0, 0, 0, 0);
      } else if (event.recurrenceType === "WEEKLY" && event.dayOfWeek) {
        // Calculate next day of week
        const currentDayOfWeek = today.getDay() || 7; // Convert Sun (0) to 7
        const diff = event.dayOfWeek - currentDayOfWeek;
        targetDate = new Date(today);
        targetDate.setDate(today.getDate() + diff);
      }

      if (!targetDate) continue;

      // Calculate Active Range: [targetDate - activeDaysBefore, targetDate + activeDaysAfter]
      const startDate = new Date(targetDate);
      startDate.setDate(startDate.getDate() - event.activeDaysBefore);

      const endDate = new Date(targetDate);
      endDate.setDate(endDate.getDate() + event.activeDaysAfter);

      if (today >= startDate && today <= endDate) {
        const diffTime = targetDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status = "PENDING";

        // Hybrid Auto-Status Check for MENTOR: Check if logbook submitted in this month
        if (
          membership?.role === "MENTOR" &&
          (event.title.toLowerCase().includes("laporan") ||
            event.title.toLowerCase().includes("logbook") ||
            event.title.toLowerCase().includes("capaian"))
        ) {
          const startOfMonth = new Date(currentYear, currentMonth, 1);
          const count = await prisma.logbook.count({
            where: {
              workspaceId,
              createdById: membership.id,
              logbookDate: {
                gte: startOfMonth,
                lte: endDate,
              },
            },
          });
          if (count > 0) {
            status = "COMPLETED";
          }
        }

        activeEvents.push({
          id: event.id,
          title: event.title,
          description: event.description,
          targetDate: targetDate.toISOString(),
          daysRemaining,
          status,
          actionUrl: event.actionUrl,
          actionLabel: event.actionLabel,
          targetRole: event.targetRole,
          recurrenceType: event.recurrenceType,
        });
      }
    }

    return jsonResponse({ events: activeEvents });
  } catch (error: any) {
    console.error("[Dashboard Events Active Error]:", error);
    return errorResponse("Failed to fetch active dashboard events", 500);
  }
}
