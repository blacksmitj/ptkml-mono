import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ applicantId: string }> }
) {
  try {
    const { applicantId } = await context.params;
    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
      include: {
        outputReports: {
          where: { verificationStatus: "APPROVED" },
          select: { monthReport: true },
        },
        followUpRecommendation: true,
      },
    });

    if (!applicant) {
      return errorResponse("Applicant not found", 404);
    }

    const months = new Set(applicant.outputReports.map((r) => r.monthReport));
    const isEligible = months.has(1) && months.has(2) && months.has(3);

    return jsonResponse({
      isEligible,
      hasExistingRecommendation: !!applicant.followUpRecommendation,
      status: applicant.followUpRecommendation?.status || null,
    });
  } catch (error: any) {
    console.error("[check-eligibility error]:", error);
    return errorResponse("Failed to check eligibility", 500);
  }
}
