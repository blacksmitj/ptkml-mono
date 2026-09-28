-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('SUPER_ADMIN', 'USER', 'WORKSPACE_SUPERVISOR');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('UNIVERSITY_ADMIN', 'MENTOR', 'UNIVERSITY_SUPERVISOR');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "MarketingArea" AS ENUM ('VILLAGE', 'DISTRICT', 'CITY', 'PROVINCE', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "BookkeepingType" AS ENUM ('NONE', 'MANUAL', 'EXCEL', 'APPLICATION');

-- CreateEnum
CREATE TYPE "BpjsStatus" AS ENUM ('REGISTERED', 'NOT_REGISTERED');

-- CreateEnum
CREATE TYPE "BpjsType" AS ENUM ('WAGE_EARNER', 'NON_WAGE_EARNER');

-- CreateEnum
CREATE TYPE "NikStatus" AS ENUM ('IDLE', 'CHECKING', 'VALID', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('RESPONDED', 'NO_RESPONSE');

-- CreateEnum
CREATE TYPE "FundDisbursement" AS ENUM ('DISBURSED', 'NOT_DISBURSED');

-- CreateEnum
CREATE TYPE "Willingness" AS ENUM ('WILLING', 'NOT_WILLING');

-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('FOUND', 'NOT_FOUND');

-- CreateEnum
CREATE TYPE "ApplicantStatus" AS ENUM ('ACTIVE', 'DROPPED', 'PENDING');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('INDIVIDUAL', 'GROUP');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('LOCAL', 'OUT_OF_TOWN');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ConflictSource" AS ENUM ('APPLICANT', 'MENTOR', 'BOTH');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('LOGBOOK_DOCUMENTATION', 'EXPENSE_PROOF', 'EMPLOYEE_KTP', 'EMPLOYEE_SALARY_SLIP', 'EMPLOYEE_BPJS_CARD', 'OUTPUT_CASHFLOW_PROOF', 'OUTPUT_INCOME_PROOF', 'APPLICANT_BMC', 'APPLICANT_ACTION_PLAN');

-- CreateEnum
CREATE TYPE "EventRecurrenceType" AS ENUM ('MONTHLY_DAY', 'EXACT_DATE', 'WEEKLY');

-- CreateEnum
CREATE TYPE "EventTargetRole" AS ENUM ('ALL', 'MENTOR', 'UNIVERSITY_ADMIN', 'UNIVERSITY_SUPERVISOR', 'WORKSPACE_SUPERVISOR', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "OcrStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "OcrDocumentType" AS ENUM ('KTP', 'BPJS', 'SALARY_SLIP', 'REPORT', 'RECEIPT', 'CASHFLOW', 'OTHER');

-- CreateTable
CREATE TABLE "Province" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subdistrict" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subdistrict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isInputFrozen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "University" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "University_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "birthPlace" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "photo" TEXT,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "noKk" TEXT,
    "lastEducation" TEXT,
    "hasDisability" BOOLEAN NOT NULL DEFAULT false,
    "disabilityType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "provinceName" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "cityName" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "districtName" TEXT NOT NULL,
    "subdistrictId" TEXT NOT NULL,
    "subdistrictName" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "globalRole" "GlobalRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "universityId" TEXT,
    "role" "WorkspaceRole" NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Applicant" (
    "id" TEXT NOT NULL,
    "idTkm" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "universityId" TEXT,
    "mentorId" TEXT,
    "profileId" TEXT NOT NULL,
    "communicationStatus" "CommunicationStatus" NOT NULL DEFAULT 'NO_RESPONSE',
    "fundDisbursement" "FundDisbursement" NOT NULL DEFAULT 'NOT_DISBURSED',
    "willingness" "Willingness" NOT NULL DEFAULT 'NOT_WILLING',
    "reasonNotWilling" TEXT,
    "presenceStatus" "PresenceStatus" NOT NULL DEFAULT 'NOT_FOUND',
    "status" "ApplicantStatus" NOT NULL DEFAULT 'ACTIVE',
    "reasonDropped" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessSector" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "description" TEXT,
    "mainProduct" TEXT,
    "baselineData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Logbook" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "logbookDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "jpl" INTEGER NOT NULL DEFAULT 1,
    "deliveryMethod" "DeliveryMethod" NOT NULL,
    "meetingType" "MeetingType" NOT NULL,
    "visitType" "VisitType" NOT NULL,
    "mentoringMaterial" TEXT NOT NULL,
    "activitySummary" TEXT NOT NULL,
    "obstacle" TEXT NOT NULL,
    "solutions" TEXT NOT NULL,
    "totalExpense" DOUBLE PRECISION,
    "reasonNoExpense" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationNote" TEXT,
    "rebuttalNote" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Logbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogbookApplicant" (
    "logbookId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,

    CONSTRAINT "LogbookApplicant_pkey" PRIMARY KEY ("logbookId","applicantId")
);

-- CreateTable
CREATE TABLE "OutputReport" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "monthReport" INTEGER NOT NULL,
    "productionCapacity" DOUBLE PRECISION NOT NULL,
    "productionCapacityUnit" TEXT NOT NULL,
    "salesVolume" DOUBLE PRECISION NOT NULL,
    "salesVolumeUnit" TEXT NOT NULL,
    "marketingArea" "MarketingArea" NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "bookkeepingCashflow" "BookkeepingType" NOT NULL,
    "bookkeepingIncomeStatement" "BookkeepingType" NOT NULL,
    "businessCondition" TEXT NOT NULL,
    "obstacle" TEXT,
    "hasRemindLpj" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationNote" TEXT,
    "rebuttalNote" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutputReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "outputId" TEXT NOT NULL,
    "profileId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "hasDisability" BOOLEAN NOT NULL DEFAULT false,
    "disabilityType" TEXT,
    "employmentStatus" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "bpjsStatus" "BpjsStatus" NOT NULL,
    "bpjsType" "BpjsType",
    "bpjsNumber" TEXT,
    "nikStatus" "NikStatus" NOT NULL DEFAULT 'IDLE',
    "hasIdentityConflict" BOOLEAN NOT NULL DEFAULT false,
    "conflictSource" "ConflictSource",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL DEFAULT '',
    "bucket" TEXT,
    "url" TEXT,
    "mimeType" TEXT,
    "category" "FileCategory" NOT NULL,
    "logbookId" TEXT,
    "employeeId" TEXT,
    "outputId" TEXT,
    "applicantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQ" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceUniversity" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceUniversity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrResult" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "status" "OcrStatus" NOT NULL DEFAULT 'PENDING',
    "documentType" "OcrDocumentType" NOT NULL,
    "rawText" TEXT,
    "parsedData" JSONB,
    "confidence" DOUBLE PRECISION,
    "processingTime" INTEGER,
    "engine" TEXT,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcrResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrValidation" (
    "id" TEXT NOT NULL,
    "ocrResultId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "manualValue" TEXT,
    "extractedValue" TEXT,
    "isMatch" BOOLEAN NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcrValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrJob" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "status" "OcrStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcrJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "recurrenceType" "EventRecurrenceType" NOT NULL DEFAULT 'MONTHLY_DAY',
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "exactDate" TIMESTAMP(3),
    "activeDaysBefore" INTEGER NOT NULL DEFAULT 5,
    "activeDaysAfter" INTEGER NOT NULL DEFAULT 1,
    "actionUrl" TEXT,
    "actionLabel" TEXT,
    "targetRole" "EventTargetRole" NOT NULL DEFAULT 'MENTOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardEventDismissal" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardEventDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "City_provinceId_idx" ON "City"("provinceId");

-- CreateIndex
CREATE INDEX "District_cityId_idx" ON "District"("cityId");

-- CreateIndex
CREATE INDEX "Subdistrict_districtId_idx" ON "Subdistrict"("districtId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_nik_key" ON "Profile"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE INDEX "Address_provinceId_idx" ON "Address"("provinceId");

-- CreateIndex
CREATE INDEX "Address_cityId_idx" ON "Address"("cityId");

-- CreateIndex
CREATE INDEX "Address_districtId_idx" ON "Address"("districtId");

-- CreateIndex
CREATE INDEX "Address_subdistrictId_idx" ON "Address"("subdistrictId");

-- CreateIndex
CREATE INDEX "Address_profileId_idx" ON "Address"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "User_profileId_key" ON "User"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_universityId_idx" ON "WorkspaceMember"("universityId");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_idTkm_key" ON "Applicant"("idTkm");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_profileId_key" ON "Applicant"("profileId");

-- CreateIndex
CREATE INDEX "Applicant_workspaceId_idx" ON "Applicant"("workspaceId");

-- CreateIndex
CREATE INDEX "Applicant_universityId_idx" ON "Applicant"("universityId");

-- CreateIndex
CREATE INDEX "Applicant_mentorId_idx" ON "Applicant"("mentorId");

-- CreateIndex
CREATE INDEX "Applicant_workspaceId_status_idx" ON "Applicant"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Applicant_workspaceId_mentorId_idx" ON "Applicant"("workspaceId", "mentorId");

-- CreateIndex
CREATE INDEX "Applicant_workspaceId_universityId_idx" ON "Applicant"("workspaceId", "universityId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_applicantId_key" ON "BusinessProfile"("applicantId");

-- CreateIndex
CREATE INDEX "Logbook_workspaceId_idx" ON "Logbook"("workspaceId");

-- CreateIndex
CREATE INDEX "Logbook_createdById_idx" ON "Logbook"("createdById");

-- CreateIndex
CREATE INDEX "Logbook_verifiedById_idx" ON "Logbook"("verifiedById");

-- CreateIndex
CREATE INDEX "Logbook_workspaceId_verificationStatus_idx" ON "Logbook"("workspaceId", "verificationStatus");

-- CreateIndex
CREATE INDEX "LogbookApplicant_applicantId_idx" ON "LogbookApplicant"("applicantId");

-- CreateIndex
CREATE INDEX "OutputReport_workspaceId_idx" ON "OutputReport"("workspaceId");

-- CreateIndex
CREATE INDEX "OutputReport_applicantId_idx" ON "OutputReport"("applicantId");

-- CreateIndex
CREATE INDEX "OutputReport_verifiedById_idx" ON "OutputReport"("verifiedById");

-- CreateIndex
CREATE INDEX "OutputReport_applicantId_verificationStatus_idx" ON "OutputReport"("applicantId", "verificationStatus");

-- CreateIndex
CREATE INDEX "OutputReport_workspaceId_verificationStatus_idx" ON "OutputReport"("workspaceId", "verificationStatus");

-- CreateIndex
CREATE INDEX "Employee_outputId_idx" ON "Employee"("outputId");

-- CreateIndex
CREATE INDEX "Employee_profileId_idx" ON "Employee"("profileId");

-- CreateIndex
CREATE INDEX "File_logbookId_idx" ON "File"("logbookId");

-- CreateIndex
CREATE INDEX "File_employeeId_idx" ON "File"("employeeId");

-- CreateIndex
CREATE INDEX "File_outputId_idx" ON "File"("outputId");

-- CreateIndex
CREATE INDEX "File_applicantId_idx" ON "File"("applicantId");

-- CreateIndex
CREATE INDEX "WorkspaceUniversity_workspaceId_idx" ON "WorkspaceUniversity"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceUniversity_universityId_idx" ON "WorkspaceUniversity"("universityId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceUniversity_workspaceId_universityId_key" ON "WorkspaceUniversity"("workspaceId", "universityId");

-- CreateIndex
CREATE UNIQUE INDEX "OcrResult_fileId_key" ON "OcrResult"("fileId");

-- CreateIndex
CREATE INDEX "OcrResult_status_idx" ON "OcrResult"("status");

-- CreateIndex
CREATE INDEX "OcrResult_documentType_idx" ON "OcrResult"("documentType");

-- CreateIndex
CREATE INDEX "OcrValidation_ocrResultId_idx" ON "OcrValidation"("ocrResultId");

-- CreateIndex
CREATE UNIQUE INDEX "OcrJob_fileId_key" ON "OcrJob"("fileId");

-- CreateIndex
CREATE INDEX "OcrJob_status_idx" ON "OcrJob"("status");

-- CreateIndex
CREATE INDEX "ActivityLog_workspaceId_idx" ON "ActivityLog"("workspaceId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "DashboardEvent_workspaceId_idx" ON "DashboardEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "DashboardEvent_targetRole_idx" ON "DashboardEvent"("targetRole");

-- CreateIndex
CREATE INDEX "DashboardEvent_isActive_idx" ON "DashboardEvent"("isActive");

-- CreateIndex
CREATE INDEX "DashboardEventDismissal_eventId_idx" ON "DashboardEventDismissal"("eventId");

-- CreateIndex
CREATE INDEX "DashboardEventDismissal_userId_idx" ON "DashboardEventDismissal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardEventDismissal_eventId_userId_key" ON "DashboardEventDismissal"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subdistrict" ADD CONSTRAINT "Subdistrict_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_subdistrictId_fkey" FOREIGN KEY ("subdistrictId") REFERENCES "Subdistrict"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "WorkspaceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logbook" ADD CONSTRAINT "Logbook_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logbook" ADD CONSTRAINT "Logbook_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "WorkspaceMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logbook" ADD CONSTRAINT "Logbook_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "WorkspaceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogbookApplicant" ADD CONSTRAINT "LogbookApplicant_logbookId_fkey" FOREIGN KEY ("logbookId") REFERENCES "Logbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogbookApplicant" ADD CONSTRAINT "LogbookApplicant_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutputReport" ADD CONSTRAINT "OutputReport_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutputReport" ADD CONSTRAINT "OutputReport_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutputReport" ADD CONSTRAINT "OutputReport_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "WorkspaceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "OutputReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_logbookId_fkey" FOREIGN KEY ("logbookId") REFERENCES "Logbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_outputId_fkey" FOREIGN KEY ("outputId") REFERENCES "OutputReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceUniversity" ADD CONSTRAINT "WorkspaceUniversity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceUniversity" ADD CONSTRAINT "WorkspaceUniversity_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrResult" ADD CONSTRAINT "OcrResult_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrValidation" ADD CONSTRAINT "OcrValidation_ocrResultId_fkey" FOREIGN KEY ("ocrResultId") REFERENCES "OcrResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardEvent" ADD CONSTRAINT "DashboardEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardEventDismissal" ADD CONSTRAINT "DashboardEventDismissal_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "DashboardEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardEventDismissal" ADD CONSTRAINT "DashboardEventDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
