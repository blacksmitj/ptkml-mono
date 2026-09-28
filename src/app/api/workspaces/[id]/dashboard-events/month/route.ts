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

    const { searchParams } = new URL(request.url);
    const reqYear = searchParams.get("year");
    const reqMonth = searchParams.get("month");

    const today = new Date();
    const year = reqYear ? parseInt(reqYear, 10) : today.getFullYear();
    const month = reqMonth ? parseInt(reqMonth, 10) - 1 : today.getMonth(); // 0-indexed for JS Date

    // Fetch active events for workspace
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

    const monthEvents: any[] = [];

    for (const event of events) {
      // Check role eligibility
      if (event.targetRole !== "ALL") {
        const isSuperAdmin =
          user.globalRole === "SUPER_ADMIN" ||
          user.globalRole === "WORKSPACE_SUPERVISOR";
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
        targetDate = new Date(year, month, event.dayOfMonth);
      } else if (event.recurrenceType === "EXACT_DATE" && event.exactDate) {
        const exDate = new Date(event.exactDate);
        if (exDate.getFullYear() === year && exDate.getMonth() === month) {
          targetDate = new Date(exDate);
          targetDate.setHours(0, 0, 0, 0);
        }
      } else if (event.recurrenceType === "WEEKLY" && event.dayOfWeek) {
        // Find all dates in this month matching the dayOfWeek
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const checkDate = new Date(year, month, d);
          const currentDayOfWeek = checkDate.getDay() || 7; // Convert Sun (0) to 7
          if (currentDayOfWeek === event.dayOfWeek) {
            const diffTime = checkDate.getTime() - new Date(today.setHours(0, 0, 0, 0)).getTime();
            const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const isDismissed = event.dismissals && event.dismissals.length > 0;

            monthEvents.push({
              id: `${event.id}-${d}`,
              eventId: event.id,
              title: event.title,
              description: event.description,
              targetDate: checkDate.toISOString(),
              daysRemaining,
              status: isDismissed ? "COMPLETED" : "PENDING",
              actionUrl: event.actionUrl,
              actionLabel: event.actionLabel,
              targetRole: event.targetRole,
              recurrenceType: event.recurrenceType,
              isDismissed,
            });
          }
        }
        continue;
      }

      if (!targetDate) continue;

      const todayZero = new Date();
      todayZero.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - todayZero.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isDismissed = event.dismissals && event.dismissals.length > 0;

      let status = "PENDING";

      // Hybrid Auto-Status Check for MENTOR: Check if logbook submitted in this month
      if (
        membership?.role === "MENTOR" &&
        (event.title.toLowerCase().includes("laporan") ||
          event.title.toLowerCase().includes("logbook") ||
          event.title.toLowerCase().includes("capaian"))
      ) {
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
        const count = await prisma.logbook.count({
          where: {
            workspaceId,
            createdById: membership.id,
            logbookDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        });
        if (count > 0) {
          status = "COMPLETED";
        }
      }

      monthEvents.push({
        id: event.id,
        eventId: event.id,
        title: event.title,
        description: event.description,
        targetDate: targetDate.toISOString(),
        daysRemaining,
        status: isDismissed ? "COMPLETED" : status,
        actionUrl: event.actionUrl,
        actionLabel: event.actionLabel,
        targetRole: event.targetRole,
        recurrenceType: event.recurrenceType,
        isDismissed,
      });
    }

    return jsonResponse({ events: monthEvents });
  } catch (error: any) {
    console.error("[Dashboard Events Month Error]:", error);
    return errorResponse("Failed to fetch monthly dashboard events", 500);
  }
}
