-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InterventionPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "FollowUpRecommendation" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "findings" JSONB,
    "recommendations" JSONB,
    "mentorNote" TEXT,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FollowUpRecommendation_applicantId_key" ON "FollowUpRecommendation"("applicantId");

-- CreateIndex
CREATE INDEX "FollowUpRecommendation_applicantId_idx" ON "FollowUpRecommendation"("applicantId");

-- CreateIndex
CREATE INDEX "FollowUpRecommendation_mentorId_idx" ON "FollowUpRecommendation"("mentorId");

-- CreateIndex
CREATE INDEX "FollowUpRecommendation_workspaceId_idx" ON "FollowUpRecommendation"("workspaceId");

-- CreateIndex
CREATE INDEX "FollowUpRecommendation_workspaceId_status_idx" ON "FollowUpRecommendation"("workspaceId", "status");

-- AddForeignKey
ALTER TABLE "FollowUpRecommendation" ADD CONSTRAINT "FollowUpRecommendation_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpRecommendation" ADD CONSTRAINT "FollowUpRecommendation_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "WorkspaceMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpRecommendation" ADD CONSTRAINT "FollowUpRecommendation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpRecommendation" ADD CONSTRAINT "FollowUpRecommendation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "WorkspaceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
