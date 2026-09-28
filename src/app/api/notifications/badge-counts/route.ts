import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/rbac";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

// GET /api/notifications/badge-counts?workspaceId=...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return errorResponse("workspaceId is required", 400);
    }

    const access = await requireWorkspaceAccess(request, workspaceId);
    if (access.response) return access.response;

    const { user, membership } = access;
    if (!user) return errorResponse("Unauthorized", 401);

    const isSuper =
      user.globalRole === "SUPER_ADMIN" ||
      user.globalRole === "WORKSPACE_SUPERVISOR";

    const isMentor = !isSuper && membership?.role === "MENTOR";
    const isUnivStaff =
      !isSuper &&
      (membership?.role === "UNIVERSITY_ADMIN" ||
        membership?.role === "UNIVERSITY_SUPERVISOR");

    if (isMentor) {
      if (!membership) {
        return errorResponse("Forbidden: No membership found", 403);
      }
      const mentorId = membership.id;

      // --- SISI 1: PENDING ---
      const pendingLogbooksPromise = prisma.logbook.count({
        where: {
          workspaceId,
          createdById: mentorId,
          verificationStatus: "PENDING",
        },
      });

      const pendingOutputsPromise = prisma.outputReport.count({
        where: {
          workspaceId,
          applicant: {
            mentorId: mentorId,
          },
          verificationStatus: "PENDING",
        },
      });

      const pendingRtlPromise = prisma.followUpRecommendation.count({
        where: {
          workspaceId,
          mentorId: mentorId,
          status: "SUBMITTED",
        },
      });

      // --- SISI 2: NEEDS ACTION ---
      const rejectedLogbooksPromise = prisma.logbook.count({
        where: {
          workspaceId,
          createdById: mentorId,
          verificationStatus: "REJECTED",
        },
      });

      const rejectedOutputsPromise = prisma.outputReport.count({
        where: {
          workspaceId,
          applicant: {
            mentorId: mentorId,
          },
          verificationStatus: "REJECTED",
        },
      });

      const mentorApplicantsPromise = prisma.applicant.findMany({
        where: {
          workspaceId,
          mentorId: mentorId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          outputReports: {
            where: { verificationStatus: "APPROVED" },
            select: { monthReport: true },
          },
          followUpRecommendation: {
            select: { status: true },
          },
        },
      });

      // --- SISI 3: APPLICANT ISSUES ---
      const mentorApplicantIssuesPromise = prisma.applicant.findMany({
        where: {
          workspaceId,
          mentorId: mentorId,
          status: "ACTIVE",
          OR: [
            { communicationStatus: "NO_RESPONSE" },
            { presenceStatus: "NOT_FOUND" },
            { willingness: "NOT_WILLING" },
            { fundDisbursement: "NOT_DISBURSED" },
          ],
        },
        select: {
          id: true,
          communicationStatus: true,
          presenceStatus: true,
          willingness: true,
          fundDisbursement: true,
        },
      });

      const [
        pendingLogbooks,
        pendingOutputs,
        pendingRtl,
        rejectedLogbooks,
        rejectedOutputs,
        mentorApplicants,
        mentorIssuesList,
      ] = await Promise.all([
        pendingLogbooksPromise,
        pendingOutputsPromise,
        pendingRtlPromise,
        rejectedLogbooksPromise,
        rejectedOutputsPromise,
        mentorApplicantsPromise,
        mentorApplicantIssuesPromise,
      ]);

      let rtlActionCount = 0;
      for (const applicant of mentorApplicants) {
        const approvedMonths = new Set(
          applicant.outputReports.map((r) => r.monthReport)
        );
        const isEligible =
          approvedMonths.has(1) &&
          approvedMonths.has(2) &&
          approvedMonths.has(3);

        if (isEligible) {
          const rtlStatus = applicant.followUpRecommendation?.status;
          if (!rtlStatus || rtlStatus === "DRAFT" || rtlStatus === "REJECTED") {
            rtlActionCount++;
          }
        }
      }

      let noResponseCount = 0;
      let notFoundCount = 0;
      let notWillingCount = 0;
      let notDisbursedCount = 0;

      for (const app of mentorIssuesList) {
        if (app.communicationStatus === "NO_RESPONSE") noResponseCount++;
        if (app.presenceStatus === "NOT_FOUND") notFoundCount++;
        if (app.willingness === "NOT_WILLING") notWillingCount++;
        if (app.fundDisbursement === "NOT_DISBURSED") notDisbursedCount++;
      }

      const pendingTotal = pendingLogbooks + pendingOutputs + pendingRtl;
      const needsActionTotal = rejectedLogbooks + rejectedOutputs + rtlActionCount;

      return jsonResponse({
        roleType: "MENTOR",
        scope: "PERSONAL",
        pending: {
          logbook: pendingLogbooks,
          outputReport: pendingOutputs,
          rtl: pendingRtl,
          total: pendingTotal,
        },
        needsAction: {
          logbook: rejectedLogbooks,
          outputReport: rejectedOutputs,
          rtl: rtlActionCount,
          total: needsActionTotal,
        },
        applicantIssues: {
          noResponse: noResponseCount,
          notFound: notFoundCount,
          notWilling: notWillingCount,
          notDisbursed: notDisbursedCount,
          total: mentorIssuesList.length,
        },
        counts: {
          logbook: rejectedLogbooks,
          outputReport: rejectedOutputs,
          rtl: rtlActionCount,
          total: needsActionTotal,
        },
      });
    } else {
      // ADMIN / VERIFIKATOR
      const univId = isUnivStaff && membership?.universityId ? membership.universityId : null;
      const scope = isSuper ? "ALL" : "UNIVERSITY";

      // --- SISI 1: PENDING ---
      const logbookPendingWhere: any = {
        workspaceId,
        verificationStatus: "PENDING",
      };
      const outputPendingWhere: any = {
        workspaceId,
        verificationStatus: "PENDING",
      };
      const rtlPendingWhere: any = {
        workspaceId,
        status: "SUBMITTED",
      };

      // --- SISI 2: NEEDS ACTION ---
      const logbookRejectedWhere: any = {
        workspaceId,
        verificationStatus: "REJECTED",
      };
      const outputRejectedWhere: any = {
        workspaceId,
        verificationStatus: "REJECTED",
      };

      const applicantWhere: any = {
        workspaceId,
        status: "ACTIVE",
      };

      if (univId) {
        logbookPendingWhere.createdBy = { universityId: univId };
        outputPendingWhere.applicant = { mentor: { universityId: univId } };
        rtlPendingWhere.applicant = { universityId: univId };

        logbookRejectedWhere.createdBy = { universityId: univId };
        outputRejectedWhere.applicant = { mentor: { universityId: univId } };
        applicantWhere.universityId = univId;
      }

      const applicantIssuesWhere: any = {
        workspaceId,
        status: "ACTIVE",
        OR: [
          { communicationStatus: "NO_RESPONSE" },
          { presenceStatus: "NOT_FOUND" },
          { willingness: "NOT_WILLING" },
          { fundDisbursement: "NOT_DISBURSED" },
        ],
      };

      if (univId) {
        applicantIssuesWhere.universityId = univId;
      }

      const [
        pendingLogbooks,
        pendingOutputs,
        pendingRtl,
        rejectedLogbooks,
        rejectedOutputs,
        eligibleApplicants,
        adminIssuesList,
      ] = await Promise.all([
        prisma.logbook.count({ where: logbookPendingWhere }),
        prisma.outputReport.count({ where: outputPendingWhere }),
        prisma.followUpRecommendation.count({ where: rtlPendingWhere }),
        prisma.logbook.count({ where: logbookRejectedWhere }),
        prisma.outputReport.count({ where: outputRejectedWhere }),
        prisma.applicant.findMany({
          where: applicantWhere,
          select: {
            id: true,
            outputReports: {
              where: { verificationStatus: "APPROVED" },
              select: { monthReport: true },
            },
            followUpRecommendation: {
              select: { status: true },
            },
          },
        }),
        prisma.applicant.findMany({
          where: applicantIssuesWhere,
          select: {
            id: true,
            communicationStatus: true,
            presenceStatus: true,
            willingness: true,
            fundDisbursement: true,
          },
        }),
      ]);

      let unsubmittedRtlCount = 0;
      for (const applicant of eligibleApplicants) {
        const approvedMonths = new Set(
          applicant.outputReports.map((r) => r.monthReport)
        );
        const isEligible =
          approvedMonths.has(1) &&
          approvedMonths.has(2) &&
          approvedMonths.has(3);

        if (isEligible) {
          const rtlStatus = applicant.followUpRecommendation?.status;
          if (!rtlStatus || rtlStatus === "DRAFT" || rtlStatus === "REJECTED") {
            unsubmittedRtlCount++;
          }
        }
      }

      let noResponseCount = 0;
      let notFoundCount = 0;
      let notWillingCount = 0;
      let notDisbursedCount = 0;

      for (const app of adminIssuesList) {
        if (app.communicationStatus === "NO_RESPONSE") noResponseCount++;
        if (app.presenceStatus === "NOT_FOUND") notFoundCount++;
        if (app.willingness === "NOT_WILLING") notWillingCount++;
        if (app.fundDisbursement === "NOT_DISBURSED") notDisbursedCount++;
      }

      const pendingTotal = pendingLogbooks + pendingOutputs + pendingRtl;
      const needsActionTotal = rejectedLogbooks + rejectedOutputs + unsubmittedRtlCount;

      return jsonResponse({
        roleType: "ADMIN",
        scope,
        pending: {
          logbook: pendingLogbooks,
          outputReport: pendingOutputs,
          rtl: pendingRtl,
          total: pendingTotal,
        },
        needsAction: {
          logbook: rejectedLogbooks,
          outputReport: rejectedOutputs,
          rtl: unsubmittedRtlCount,
          total: needsActionTotal,
        },
        applicantIssues: {
          noResponse: noResponseCount,
          notFound: notFoundCount,
          notWilling: notWillingCount,
          notDisbursed: notDisbursedCount,
          total: adminIssuesList.length,
        },
        counts: {
          logbook: pendingLogbooks,
          outputReport: pendingOutputs,
          rtl: pendingRtl,
          total: pendingTotal,
        },
      });
    }
  } catch (error) {
    console.error("GET /api/notifications/badge-counts error:", error);
    return errorResponse("Failed to get badge counts", 500);
  }
}
