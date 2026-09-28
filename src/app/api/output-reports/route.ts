import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireWorkspaceAccess, requireWorkspaceWriteAccess } from "@/lib/rbac";
import { parseFileUrl } from "@/lib/file-helpers";
import { triggerOcrForEmployeeFiles, triggerOcrForOutputFiles } from "@/lib/ocr-trigger";
import { clearApplicantsCache } from "@/lib/cache-helpers";
import { createActivity } from "@/lib/activity-log";
import {
  MarketingArea,
  BookkeepingType,
  Gender,
  BpjsStatus,
  BpjsType,
  NikStatus,
  FileCategory,
} from "@prisma/client";
import { z } from "zod";

const createOutputReportSchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),
  applicantId: z.string().min(1, "applicantId is required"),
  monthReport: z.number().min(0),
  productionCapacity: z.number().optional().default(0),
  productionCapacityUnit: z.string().optional().default("Pcs"),
  salesVolume: z.number().optional().default(0),
  salesVolumeUnit: z.string().optional().default("Pcs"),
  marketingArea: z.enum(["VILLAGE", "DISTRICT", "CITY", "PROVINCE", "NATIONAL", "INTERNATIONAL"]).optional().default("DISTRICT"),
  revenue: z.number().optional().default(0),
  bookkeepingCashflow: z.enum(["MANUAL", "DIGITAL", "NONE"]).optional().default("MANUAL"),
  bookkeepingIncomeStatement: z.enum(["MANUAL", "DIGITAL", "NONE"]).optional().default("MANUAL"),
  businessCondition: z.string().optional().nullable(),
  obstacle: z.string().optional().nullable(),
  hasRemindLpj: z.union([z.boolean(), z.string()]).optional().default(false),
  files: z
    .array(
      z.object({
        url: z.string().min(1),
        category: z.string().optional(),
        type: z.string().optional(),
        mimeType: z.string().optional(),
      })
    )
    .optional(),
  employees: z
    .array(
      z.object({
        name: z.string().min(1),
        role: z.string().optional().default("anggota"),
        gender: z.enum(["MALE", "FEMALE"]).optional().default("MALE"),
        hasDisability: z.boolean().optional().default(false),
        disabilityType: z.string().optional().nullable(),
        employmentStatus: z.string().optional().default("permanen"),
        nik: z.string().optional().nullable(),
        bpjsStatus: z.enum(["REGISTERED", "NOT_REGISTERED"]).optional().default("NOT_REGISTERED"),
        bpjsType: z.enum(["WAGE_EARNER", "NON_WAGE_EARNER"]).optional().nullable(),
        bpjsNumber: z.string().optional().nullable(),
        files: z.array(z.any()).optional(),
      })
    )
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const applicantId = searchParams.get("applicantId");
    const mentorId = searchParams.get("mentorId");

    if (!workspaceId) {
      return errorResponse("workspaceId is required", 400);
    }

    const access = await requireWorkspaceAccess(request, workspaceId);
    if (!access.ok) return access.response;

    const { user, membership } = access.data;
    const whereAnd: any[] = [{ workspaceId }];
    if (applicantId) whereAnd.push({ applicantId });
    if (mentorId) {
      whereAnd.push({
        applicant: {
          mentorId: mentorId,
        },
      });
    }

    if (user.globalRole !== "SUPER_ADMIN" && user.globalRole !== "WORKSPACE_SUPERVISOR") {
      if (!membership) {
        return errorResponse("Forbidden: No access to this workspace", 403);
      }
      if (membership.role === "MENTOR") {
        whereAnd.push({
          applicant: {
            mentorId: membership.id,
          },
        });
      } else if (
        membership.role === "UNIVERSITY_ADMIN" ||
        membership.role === "UNIVERSITY_SUPERVISOR"
      ) {
        whereAnd.push({
          applicant: {
            mentor: {
              universityId: membership.universityId,
            },
          },
        });
      }
    }

    const verificationStatus = searchParams.get("verificationStatus");
    if (verificationStatus && verificationStatus !== "ALL") {
      whereAnd.push({ verificationStatus });
    }

    const monthReport = searchParams.get("monthReport");
    if (monthReport !== null && monthReport !== "ALL" && monthReport !== "") {
      whereAnd.push({ monthReport: parseInt(monthReport, 10) });
    }

    const search = searchParams.get("search");
    if (search) {
      const searchVal = search.trim();
      whereAnd.push({
        OR: [
          { businessCondition: { contains: searchVal, mode: "insensitive" } },
          { obstacle: { contains: searchVal, mode: "insensitive" } },
          {
            applicant: {
              profile: {
                OR: [
                  { name: { contains: searchVal, mode: "insensitive" } },
                  { nik: { contains: searchVal, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      });
    }

    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";
    const sortBy = searchParams.get("sortBy");
    let orderBy: any = [{ monthReport: "desc" }, { createdAt: "desc" }];
    if (sortBy) {
      if (sortBy === "applicantName") {
        orderBy = { applicant: { profile: { name: sortOrder } } };
      } else {
        orderBy = { [sortBy]: sortOrder };
      }
    }

    const isPaginated = searchParams.get("page") !== null;
    const includeObject = {
      applicant: {
        include: {
          profile: true,
          mentor: {
            include: {
              university: true,
              user: {
                include: {
                  profile: true,
                },
              },
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
      employees: {
        include: {
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
      },
      _count: {
        select: {
          employees: true,
          files: true,
        },
      },
    };

    if (isPaginated) {
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
      const skip = (page - 1) * limit;

      const [total, reports] = await Promise.all([
        prisma.outputReport.count({
          where: {
            AND: whereAnd,
          },
        }),
        prisma.outputReport.findMany({
          where: {
            AND: whereAnd,
          },
          include: includeObject,
          orderBy,
          skip,
          take: limit,
        }),
      ]);

      const reportsWithOcrSummary = reports.map((report) => {
        let ocrMismatchCount = 0;
        let ocrFailedCount = 0;
        let ocrPendingCount = 0;
        let totalOcrProcessed = 0;
        let totalOcrEligible = 0;
        const mismatchFields: string[] = [];
        const eligibleCategories = [
          "OUTPUT_INCOME_PROOF",
          "OUTPUT_CASHFLOW_PROOF",
          "EMPLOYEE_KTP",
          "EMPLOYEE_BPJS_CARD",
          "EMPLOYEE_SALARY_SLIP",
        ];

        for (const file of report.files) {
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
                  const categoryLabel =
                    file.category === "OUTPUT_INCOME_PROOF"
                      ? "Bukti Omset"
                      : file.category === "OUTPUT_CASHFLOW_PROOF"
                      ? "Buku Kas"
                      : file.category;
                  mismatchFields.push(`${categoryLabel}: ${val.fieldName}`);
                }
              }
            }
          }
        }

        for (const emp of report.employees) {
          for (const file of emp.files) {
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
                    mismatchFields.push(`${emp.name}: ${val.fieldName}`);
                  }
                }
              }
            }
          }
        }

        const { files, employees, ...reportWithoutFiles } = report;

        return {
          ...reportWithoutFiles,
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
        data: reportsWithOcrSummary,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    const reports = await prisma.outputReport.findMany({
      where: {
        AND: whereAnd,
      },
      include: includeObject,
      orderBy,
    });

    const reportsWithOcrSummary = reports.map((report) => {
      let ocrMismatchCount = 0;
      let ocrFailedCount = 0;
      let ocrPendingCount = 0;
      let totalOcrProcessed = 0;
      let totalOcrEligible = 0;
      const mismatchFields: string[] = [];
      const eligibleCategories = [
        "OUTPUT_INCOME_PROOF",
        "OUTPUT_CASHFLOW_PROOF",
        "EMPLOYEE_KTP",
        "EMPLOYEE_BPJS_CARD",
        "EMPLOYEE_SALARY_SLIP",
      ];

      for (const file of report.files) {
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
                const categoryLabel =
                  file.category === "OUTPUT_INCOME_PROOF"
                    ? "Bukti Omset"
                    : file.category === "OUTPUT_CASHFLOW_PROOF"
                    ? "Buku Kas"
                    : file.category;
                mismatchFields.push(`${categoryLabel}: ${val.fieldName}`);
              }
            }
          }
        }
      }

      for (const emp of report.employees) {
        for (const file of emp.files) {
          if (eligibleCategories.includes(file.category)) {
            totalOcrEligible++;
            if (file.ocrResult) {
              if (file.ocrResult.status === "COMPLETED") totalOcrProcessed++;
              if (file.ocrResult.status === "FAILED") ocrFailedCount++;
              if (file.ocrResult.status === "PENDING" || file.ocrResult.status === "PROCESSING")
                ocrPendingCount++;
            }
          }
        }
      }

      const { files, employees, ...reportWithoutFiles } = report;

      return {
        ...reportWithoutFiles,
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

    return jsonResponse(reportsWithOcrSummary);
  } catch (error: any) {
    console.error("[GET /api/output-reports error]:", error);
    return errorResponse("Failed to fetch output reports", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request, createOutputReportSchema);

    const access = await requireWorkspaceWriteAccess(request, body.workspaceId);
    if (!access.ok) return access.response;

    const { user, membership } = access.data;

    if (user.globalRole !== "SUPER_ADMIN") {
      if (!membership) {
        return errorResponse("Forbidden: No access to this workspace", 403);
      }
      const applicant = await prisma.applicant.findUnique({
        where: { id: body.applicantId },
      });
      if (!applicant) {
        return errorResponse("Applicant not found", 404);
      }
      if (applicant.mentorId !== membership.id) {
        return errorResponse("Forbidden: You are not the mentor of this applicant", 403);
      }
    }

    if (body.monthReport > 0) {
      const prevMonth = body.monthReport - 1;
      const prevReport = await prisma.outputReport.findFirst({
        where: {
          applicantId: body.applicantId,
          monthReport: prevMonth,
        },
      });
      if (!prevReport) {
        return errorResponse(
          `Laporan bulan ke-${prevMonth} belum diisi. Isi laporan bulan sebelumnya terlebih dahulu.`,
          400
        );
      }
      if (prevReport.verificationStatus === "DRAFT") {
        return errorResponse(
          `Laporan bulan ke-${prevMonth} masih berstatus DRAFT. Mohon lengkapi dan simpan laporan tersebut terlebih dahulu.`,
          400
        );
      }
    }

    if (body.employees && Array.isArray(body.employees)) {
      const niks = body.employees.map((e) => e.nik).filter(Boolean);
      const hasDuplicates = niks.some((nik, idx) => niks.indexOf(nik) !== idx);
      if (hasDuplicates) {
        return errorResponse("NIK Karyawan tidak boleh duplikat dalam satu laporan", 400);
      }

      for (const emp of body.employees) {
        if (!emp.nik) continue;

        const existingApplicant = await prisma.applicant.findFirst({
          where: {
            workspaceId: body.workspaceId,
            profile: { nik: emp.nik },
          },
        });
        if (existingApplicant) {
          return errorResponse(
            `NIK Karyawan ${emp.nik} tidak boleh sama dengan NIK Peserta/TKM`,
            400
          );
        }

        const existingEmployee = await prisma.employee.findFirst({
          where: {
            nik: emp.nik,
            output: {
              workspaceId: body.workspaceId,
              applicantId: { not: body.applicantId },
            },
          },
        });
        if (existingEmployee) {
          return errorResponse(
            `NIK Karyawan ${emp.nik} sudah terdaftar di kelompok/peserta lain`,
            400
          );
        }
      }
    }

    const report = await prisma.outputReport.create({
      data: {
        workspaceId: body.workspaceId,
        applicantId: body.applicantId,
        monthReport: body.monthReport,
        productionCapacity: body.productionCapacity,
        productionCapacityUnit: body.productionCapacityUnit,
        salesVolume: body.salesVolume,
        salesVolumeUnit: body.salesVolumeUnit,
        marketingArea: body.marketingArea as MarketingArea,
        revenue: body.revenue,
        bookkeepingCashflow: body.bookkeepingCashflow as BookkeepingType,
        bookkeepingIncomeStatement: body.bookkeepingIncomeStatement as BookkeepingType,
        businessCondition: body.businessCondition || "",
        obstacle: body.obstacle || null,
        hasRemindLpj: body.hasRemindLpj === true || body.hasRemindLpj === "true",
        files:
          body.files && Array.isArray(body.files)
            ? {
                create: body.files.map((file) => {
                  const { objectKey, bucket } = parseFileUrl(file.url);
                  return {
                    url: file.url,
                    objectKey,
                    bucket,
                    category: (file.category || "OUTPUT_INCOME_PROOF") as FileCategory,
                    mimeType: file.type || file.mimeType || null,
                  };
                }),
              }
            : undefined,
        employees:
          body.employees && Array.isArray(body.employees)
            ? {
                create: body.employees.map((emp) => ({
                  name: emp.name,
                  role: emp.role,
                  gender: emp.gender as Gender,
                  hasDisability: emp.hasDisability,
                  disabilityType: emp.disabilityType || null,
                  employmentStatus: emp.employmentStatus,
                  nik: emp.nik || "",
                  bpjsStatus: emp.bpjsStatus as BpjsStatus,
                  bpjsType: emp.bpjsType as BpjsType | null,
                  bpjsNumber: emp.bpjsNumber || null,
                  nikStatus: NikStatus.VALID,
                  files:
                    emp.files && Array.isArray(emp.files)
                      ? {
                          create: emp.files
                            .filter((f: any) => !f.id)
                            .map((file: any) => {
                              const { objectKey, bucket } = parseFileUrl(file.url);
                              return {
                                url: file.url,
                                objectKey,
                                bucket,
                                category: (file.category || "EMPLOYEE_KTP") as FileCategory,
                                mimeType: file.type || file.mimeType || null,
                              };
                            }),
                        }
                      : undefined,
                })),
              }
            : undefined,
      },
      include: {
        employees: {
          include: {
            files: true,
          },
        },
        files: true,
      },
    });

    if (report.employees && Array.isArray(report.employees)) {
      for (let i = 0; i < report.employees.length; i++) {
        const dbEmp = report.employees[i];
        const inputEmp = body.employees?.[i];
        if (inputEmp && inputEmp.files && Array.isArray(inputEmp.files)) {
          for (const file of inputEmp.files) {
            if (file.id) {
              const { objectKey, bucket } = parseFileUrl(file.url);
              await prisma.file.update({
                where: { id: file.id },
                data: {
                  employeeId: dbEmp.id,
                  objectKey,
                  bucket,
                  mimeType: file.type || file.mimeType || null,
                },
              });
            }
          }
        }
      }
    }

    if (report.employees && Array.isArray(report.employees)) {
      for (const dbEmp of report.employees) {
        await triggerOcrForEmployeeFiles(dbEmp.id);
      }
    }

    await triggerOcrForOutputFiles(report.id);
    await clearApplicantsCache(body.workspaceId);

    const applicantObj = await prisma.applicant.findUnique({
      where: { id: report.applicantId },
      include: { profile: true },
    });
    const applicantName = applicantObj?.profile?.name || "Peserta";
    await createActivity({
      workspaceId: report.workspaceId,
      userId: user.id,
      type: "OUTPUT_CREATED",
      title: "Laporan Output Baru",
      description: `Laporan output bulan ke-${report.monthReport} disubmit untuk ${applicantName}`,
      status: "amber",
    });

    return jsonResponse(report, 201);
  } catch (error: any) {
    console.error("[POST /api/output-reports error]:", error);
    return errorResponse(error.message || "Failed to create output report", 500);
  }
}
