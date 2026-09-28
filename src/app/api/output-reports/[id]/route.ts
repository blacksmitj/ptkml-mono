import { NextRequest } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-utils";
import { requireAuth, requireWorkspaceWriteAccess } from "@/lib/rbac";
import { parseFileUrl } from "@/lib/file-helpers";
import { triggerOcrForEmployeeFiles, triggerOcrForOutputFiles } from "@/lib/ocr-trigger";
import { clearApplicantsCache } from "@/lib/cache-helpers";
import { createActivity } from "@/lib/activity-log";
import {
  MarketingArea,
  BookkeepingType,
  VerificationStatus,
  Gender,
  BpjsStatus,
  BpjsType,
  NikStatus,
} from "@prisma/client";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.ok) return authResult.response;

    const { id } = await context.params;
    const report = await prisma.outputReport.findUnique({
      where: { id },
      include: {
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
        employees: {
          include: {
            profile: true,
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
            university: true,
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!report) {
      return errorResponse("Output report not found", 404);
    }

    if (
      !report.verifiedBy &&
      (report.verificationStatus === "APPROVED" || report.verificationStatus === "REJECTED")
    ) {
      const mentorUnivId = report.applicant?.mentor?.universityId;
      if (mentorUnivId) {
        const fallbackAdmin = await prisma.workspaceMember.findFirst({
          where: {
            workspaceId: report.workspaceId,
            universityId: mentorUnivId,
            role: "UNIVERSITY_ADMIN",
          },
          include: {
            university: true,
            user: {
              include: {
                profile: true,
              },
            },
          },
        });
        if (fallbackAdmin) {
          (report as any).verifiedBy = fallbackAdmin;
          if (!report.verifiedAt) {
            (report as any).verifiedAt = report.updatedAt || report.createdAt;
          }
        }
      }
    }

    return jsonResponse(report);
  } catch (error: any) {
    console.error("[GET /api/output-reports/:id error]:", error);
    return errorResponse("Failed to fetch output report", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const report = await prisma.outputReport.findUnique({
      where: { id },
      include: {
        applicant: true,
      },
    });
    if (!report) {
      return errorResponse("Output report not found", 404);
    }

    const access = await requireWorkspaceWriteAccess(request, report.workspaceId);
    if (!access.ok) return access.response;

    const { user, membership } = access.data;
    const body = await request.json();

    if (body.verificationStatus !== undefined || body.verificationNote !== undefined) {
      if (user.globalRole !== "SUPER_ADMIN" && (!membership || membership.role !== "UNIVERSITY_ADMIN")) {
        return errorResponse(
          "Forbidden: Hanya Admin Universitas yang dapat memverifikasi atau membatalkan verifikasi",
          403
        );
      }
      if (
        body.verificationStatus === "REJECTED" &&
        (!body.verificationNote || body.verificationNote.trim() === "")
      ) {
        return errorResponse("Catatan penolakan wajib diisi jika menolak laporan", 400);
      }
    }

    if (user.globalRole !== "SUPER_ADMIN") {
      if (!membership) {
        return errorResponse("Forbidden: No access to this workspace", 403);
      }
      if (membership.role === "MENTOR") {
        if (report.applicant.mentorId !== membership.id) {
          return errorResponse("Forbidden: You are not the mentor of this applicant", 403);
        }
        if (body.verificationStatus !== undefined || body.verificationNote !== undefined) {
          return errorResponse("Forbidden: Mentors cannot verify output reports", 403);
        }
      } else if (membership.role === "UNIVERSITY_ADMIN") {
        if (
          body.productionCapacity !== undefined ||
          body.salesVolume !== undefined ||
          body.revenue !== undefined ||
          body.businessCondition !== undefined ||
          body.hasRemindLpj !== undefined ||
          body.rebuttalNote !== undefined
        ) {
          return errorResponse("Forbidden: Admins can only verify, not edit details", 403);
        }
      } else {
        return errorResponse("Forbidden: Insufficient role in workspace", 403);
      }
    }

    let verifiedById = body.verifiedById;
    let verificationStatus = body.verificationStatus;
    let verificationNote = body.verificationNote;
    let verifiedAt: Date | null | undefined = undefined;

    if (body.verificationStatus === "PENDING") {
      verificationStatus = "PENDING";
      verificationNote = null;
      verifiedAt = null;
      verifiedById = null;
    } else if (body.verificationStatus) {
      verifiedAt = body.verifiedAt ? new Date(body.verifiedAt) : new Date();

      if (membership) {
        verifiedById = membership.id;
      } else if (body.verifierUserId) {
        const member = await prisma.workspaceMember.findFirst({
          where: { userId: body.verifierUserId, workspaceId: report.workspaceId },
        });
        if (member) verifiedById = member.id;
      }

      if (!verifiedById) {
        const member = await prisma.workspaceMember.findFirst({
          where: { userId: user.id, workspaceId: report.workspaceId },
        });
        if (member) verifiedById = member.id;
      }

      if (!verifiedById && report.applicant?.mentorId) {
        const mentorMember = await prisma.workspaceMember.findUnique({
          where: { id: report.applicant.mentorId },
        });
        if (mentorMember?.universityId) {
          const adminMember = await prisma.workspaceMember.findFirst({
            where: {
              workspaceId: report.workspaceId,
              universityId: mentorMember.universityId,
              role: "UNIVERSITY_ADMIN",
            },
          });
          if (adminMember) verifiedById = adminMember.id;
        }
      }
    }

    let rebuttalNote = body.rebuttalNote;
    let existingHistory: any[] = [];
    if (Array.isArray(report.verificationHistory)) {
      existingHistory = [...(report.verificationHistory as any[])];
    }

    if (
      membership &&
      membership.role === "MENTOR" &&
      report.verificationStatus === "REJECTED"
    ) {
      verificationStatus = "PENDING";
      verificationNote = null;
      verifiedAt = null;
      verifiedById = null;

      if (existingHistory.length === 0 && report.verificationNote) {
        existingHistory.push({
          id: crypto.randomUUID(),
          role: "UNIVERSITY_ADMIN",
          action: "REJECTED",
          authorName: "Admin Universitas",
          authorRole: "Admin Universitas",
          note: report.verificationNote,
          createdAt: report.verifiedAt ? new Date(report.verifiedAt).toISOString() : new Date().toISOString(),
        });
      }

      if (rebuttalNote && String(rebuttalNote).trim()) {
        const authorUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { profile: true },
        });
        const authorName =
          authorUser?.profile?.name || authorUser?.profile?.email || authorUser?.username || "Pendamping";
        existingHistory.push({
          id: crypto.randomUUID(),
          role: "MENTOR",
          action: "REBUTTAL",
          authorName: authorName,
          authorRole: "Pendamping",
          note: String(rebuttalNote).trim(),
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (
      membership &&
      membership.role === "MENTOR" &&
      report.verificationStatus === "DRAFT"
    ) {
      verificationStatus = "PENDING";
    }

    if (body.employees && Array.isArray(body.employees)) {
      const niks = body.employees.map((e: any) => e.nik).filter(Boolean);
      const hasDuplicates = niks.some((nik: string, idx: number) => niks.indexOf(nik) !== idx);
      if (hasDuplicates) {
        return errorResponse("NIK Karyawan tidak boleh duplikat dalam satu laporan", 400);
      }

      for (const emp of body.employees) {
        if (!emp.nik) continue;

        const existingApplicant = await prisma.applicant.findFirst({
          where: {
            workspaceId: report.workspaceId,
            profile: { nik: emp.nik },
          },
        });
        if (existingApplicant) {
          return errorResponse(`NIK Karyawan ${emp.nik} tidak boleh sama dengan NIK Peserta/TKM`, 400);
        }

        const existingEmployee = await prisma.employee.findFirst({
          where: {
            nik: emp.nik,
            output: {
              workspaceId: report.workspaceId,
              id: { not: id },
              applicantId: { not: report.applicantId },
            },
          },
        });
        if (existingEmployee) {
          return errorResponse(`NIK Karyawan ${emp.nik} sudah terdaftar di kelompok/peserta lain`, 400);
        }
      }
    }

    const { reportUpdated, newEmployeeIds } = await prisma.$transaction(async (tx) => {
      const updateData: any = {
        verificationNote: verificationNote,
        rebuttalNote: rebuttalNote,
        verifiedAt: verifiedAt,
        verifiedById: verifiedById,
      };

      if (
        membership &&
        membership.role === "MENTOR" &&
        report.verificationStatus === "REJECTED"
      ) {
        updateData.verificationHistory = existingHistory;
      }

      if (verificationStatus !== undefined) {
        updateData.verificationStatus = verificationStatus as VerificationStatus;
      }
      if (body.productionCapacity !== undefined) {
        updateData.productionCapacity = body.productionCapacity;
      }
      if (body.productionCapacityUnit !== undefined) {
        updateData.productionCapacityUnit = body.productionCapacityUnit;
      }
      if (body.salesVolume !== undefined) {
        updateData.salesVolume = body.salesVolume;
      }
      if (body.salesVolumeUnit !== undefined) {
        updateData.salesVolumeUnit = body.salesVolumeUnit;
      }
      if (body.marketingArea !== undefined) {
        updateData.marketingArea = body.marketingArea as MarketingArea;
      }
      if (body.revenue !== undefined) {
        updateData.revenue = body.revenue;
      }
      if (body.bookkeepingCashflow !== undefined) {
        updateData.bookkeepingCashflow = body.bookkeepingCashflow as BookkeepingType;
      }
      if (body.bookkeepingIncomeStatement !== undefined) {
        updateData.bookkeepingIncomeStatement = body.bookkeepingIncomeStatement as BookkeepingType;
      }
      if (body.businessCondition !== undefined) {
        updateData.businessCondition = body.businessCondition;
      }
      if (body.obstacle !== undefined) {
        updateData.obstacle = body.obstacle;
      }
      if (body.hasRemindLpj !== undefined) {
        updateData.hasRemindLpj = body.hasRemindLpj === true || body.hasRemindLpj === "true";
      }

      const reportUpdated = await tx.outputReport.update({
        where: { id },
        data: updateData,
      });

      if (body.files && Array.isArray(body.files)) {
        await tx.file.deleteMany({
          where: { outputId: id },
        });
        await tx.file.createMany({
          data: body.files.map((file: any) => {
            const { objectKey, bucket } = parseFileUrl(file.url);
            return {
              url: file.url,
              objectKey,
              bucket,
              category: file.category,
              outputId: id,
              mimeType: file.type || file.mimeType || null,
            };
          }),
        });
      }

      let newEmployeeIds: string[] = [];

      if (body.employees && Array.isArray(body.employees)) {
        const existingEmployees = await tx.employee.findMany({
          where: { outputId: id },
          include: { files: true },
        });

        const inputNiks = body.employees.map((e: any) => e.nik).filter(Boolean);

        const employeesToDelete = existingEmployees.filter((e) => !inputNiks.includes(e.nik));
        const deleteIds = employeesToDelete.map((e) => e.id);
        if (deleteIds.length > 0) {
          await tx.file.updateMany({
            where: { employeeId: { in: deleteIds } },
            data: { employeeId: null },
          });
          await tx.employee.deleteMany({
            where: { id: { in: deleteIds } },
          });
        }

        for (const emp of body.employees) {
          const existingEmp = existingEmployees.find((e) => e.nik === emp.nik);

          if (existingEmp) {
            await tx.employee.update({
              where: { id: existingEmp.id },
              data: {
                name: emp.name,
                role: emp.role,
                gender: emp.gender as Gender,
                hasDisability: emp.hasDisability,
                disabilityType: emp.disabilityType,
                employmentStatus: emp.employmentStatus,
                bpjsStatus: emp.bpjsStatus as BpjsStatus,
                bpjsType: emp.bpjsType as BpjsType,
                bpjsNumber: emp.bpjsNumber,
              },
            });

            if (emp.files && Array.isArray(emp.files)) {
              const newFileCategories = emp.files
                .filter((f: any) => !f.id)
                .map((f: any) => f.category)
                .filter(Boolean);

              if (newFileCategories.length > 0) {
                const oldFilesToDelete = existingEmp.files.filter((f: any) =>
                  newFileCategories.includes(f.category)
                );
                for (const oldFile of oldFilesToDelete) {
                  await tx.ocrResult.deleteMany({ where: { fileId: oldFile.id } });
                  await tx.ocrJob.deleteMany({ where: { fileId: oldFile.id } });
                  await tx.file.delete({ where: { id: oldFile.id } });
                }
              }

              const retainedFileIds = emp.files
                .filter((f: any) => f.id)
                .map((f: any) => f.id);

              const orphanFiles = existingEmp.files.filter(
                (f: any) =>
                  !retainedFileIds.includes(f.id) &&
                  !newFileCategories.includes(f.category)
              );
              for (const orphan of orphanFiles) {
                await tx.ocrResult.deleteMany({ where: { fileId: orphan.id } });
                await tx.ocrJob.deleteMany({ where: { fileId: orphan.id } });
                await tx.file.delete({ where: { id: orphan.id } });
              }

              for (const file of emp.files) {
                if (file.id) {
                  const existingFile = existingEmp.files.find((f: any) => f.id === file.id);
                  if (existingFile && existingFile.url !== file.url) {
                    const { objectKey, bucket } = parseFileUrl(file.url);
                    await tx.file.update({
                      where: { id: file.id },
                      data: {
                        url: file.url,
                        objectKey,
                        bucket,
                        mimeType: file.type || file.mimeType || null,
                        employeeId: existingEmp.id,
                      },
                    });
                    await tx.ocrResult.deleteMany({ where: { fileId: file.id } });
                    await tx.ocrJob.deleteMany({ where: { fileId: file.id } });
                    if (!newEmployeeIds.includes(existingEmp.id)) {
                      newEmployeeIds.push(existingEmp.id);
                    }
                  }
                } else {
                  const { objectKey, bucket } = parseFileUrl(file.url);
                  await tx.file.create({
                    data: {
                      url: file.url,
                      objectKey,
                      bucket,
                      category: file.category,
                      mimeType: file.type || file.mimeType || null,
                      employeeId: existingEmp.id,
                    },
                  });
                  if (!newEmployeeIds.includes(existingEmp.id)) {
                    newEmployeeIds.push(existingEmp.id);
                  }
                }
              }
            }
          } else {
            const employeeCreated = await tx.employee.create({
              data: {
                outputId: id,
                name: emp.name,
                role: emp.role,
                gender: emp.gender as Gender,
                hasDisability: emp.hasDisability,
                disabilityType: emp.disabilityType,
                employmentStatus: emp.employmentStatus,
                nik: emp.nik,
                bpjsStatus: emp.bpjsStatus as BpjsStatus,
                bpjsType: emp.bpjsType as BpjsType,
                bpjsNumber: emp.bpjsNumber,
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
                              category: file.category,
                              mimeType: file.type || file.mimeType || null,
                            };
                          }),
                      }
                    : undefined,
              },
            });

            newEmployeeIds.push(employeeCreated.id);

            if (emp.files && Array.isArray(emp.files)) {
              for (const file of emp.files) {
                if (file.id) {
                  const { objectKey, bucket } = parseFileUrl(file.url);
                  await tx.file.update({
                    where: { id: file.id },
                    data: {
                      employeeId: employeeCreated.id,
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
      }

      return { reportUpdated, newEmployeeIds };
    });

    for (const empId of newEmployeeIds) {
      await triggerOcrForEmployeeFiles(empId);
    }

    await triggerOcrForOutputFiles(id);
    await clearApplicantsCache(reportUpdated.workspaceId);

    if (body.verificationStatus) {
      const verifier = await prisma.workspaceMember.findUnique({
        where: { id: reportUpdated.verifiedById || "" },
        include: { user: { include: { profile: true } } },
      });
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { profile: true },
      });
      const actionUserName = currentUser?.profile?.name || verifier?.user?.profile?.name || "Admin";

      const applicantObj = await prisma.applicant.findUnique({
        where: { id: reportUpdated.applicantId },
        include: { profile: true },
      });
      const applicantName = applicantObj?.profile?.name || "Peserta";

      if (reportUpdated.verificationStatus === "PENDING") {
        await createActivity({
          workspaceId: reportUpdated.workspaceId,
          userId: user.id,
          type: "OUTPUT_UNVERIFIED",
          title: "Verifikasi Laporan Output Dibatalkan",
          description: `Status verifikasi laporan output bulan ke-${reportUpdated.monthReport} untuk ${applicantName} dikembalikan ke Menunggu Verifikasi (Pending) oleh ${actionUserName}`,
          status: "amber",
        });
      } else {
        const isApproved = reportUpdated.verificationStatus === "APPROVED";
        await createActivity({
          workspaceId: reportUpdated.workspaceId,
          userId: user.id,
          type: "OUTPUT_VERIFIED",
          title: isApproved ? "Laporan Output Disetujui" : "Laporan Output Ditolak",
          description: `Laporan output bulan ke-${reportUpdated.monthReport} untuk ${applicantName} telah ${
            isApproved ? "disetujui" : "ditolak"
          } oleh ${actionUserName}`,
          status: isApproved ? "emerald" : "destructive",
        });
      }
    }

    const fullReport = await prisma.outputReport.findUnique({
      where: { id },
      include: {
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
              include: { validations: true },
            },
          },
        },
        employees: {
          include: {
            files: {
              include: {
                ocrResult: {
                  include: { validations: true },
                },
              },
            },
          },
        },
      },
    });

    return jsonResponse(fullReport ?? reportUpdated);
  } catch (error: any) {
    console.error("[PATCH /api/output-reports/:id error]:", error);
    return errorResponse("Failed to update output report", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const report = await prisma.outputReport.findUnique({
      where: { id },
      include: {
        applicant: true,
      },
    });

    if (!report) {
      return errorResponse("Output report not found", 404);
    }

    const access = await requireWorkspaceWriteAccess(request, report.workspaceId);
    if (!access.ok) return access.response;

    const { user, membership } = access.data;

    if (user.globalRole !== "SUPER_ADMIN") {
      if (!membership) {
        return errorResponse("Forbidden: No access to this workspace", 403);
      }
      if (membership.role === "MENTOR") {
        if (report.applicant.mentorId !== membership.id) {
          return errorResponse("Forbidden: You are not the mentor of this applicant", 403);
        }
        if (report.verificationStatus !== "PENDING" && report.verificationStatus !== "REJECTED") {
          return errorResponse(
            "Forbidden: Only pending or rejected output reports can be deleted",
            403
          );
        }
      } else if (membership.role !== "UNIVERSITY_ADMIN") {
        return errorResponse("Forbidden: Insufficient permissions to delete", 403);
      }
    }

    await prisma.outputReport.delete({
      where: { id },
    });

    await clearApplicantsCache(report.workspaceId);

    const applicantObj = await prisma.applicant.findUnique({
      where: { id: report.applicantId },
      include: { profile: true },
    });
    const applicantName = applicantObj?.profile?.name || "Peserta";

    await createActivity({
      workspaceId: report.workspaceId,
      userId: user.id,
      type: "OUTPUT_DELETED",
      title: "Laporan Output Dihapus",
      description: `Laporan output bulan ke-${report.monthReport} milik ${applicantName} telah dihapus`,
      status: "destructive",
    });

    return new Response(null, { status: 204 });
  } catch (error: any) {
    console.error("[DELETE /api/output-reports/:id error]:", error);
    return errorResponse("Failed to delete output report", 500);
  }
}
