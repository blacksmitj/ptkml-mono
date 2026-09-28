import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireWorkspaceWriteAccess } from "@/lib/rbac";
import { Gender, BpjsStatus, BpjsType, NikStatus, ConflictSource } from "@prisma/client";
import { validateEmployeeOcr } from "@/lib/ocr-validation";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { z } from "zod";

const createEmployeeSchema = z.object({
  outputId: z.string().min(1, "outputId is required"),
  profileId: z.string().optional(),
  name: z.string().min(1, "Nama karyawan wajib diisi"),
  role: z.string().min(1, "Peran / posisi wajib diisi"),
  gender: z.enum(["MALE", "FEMALE"]),
  hasDisability: z.boolean().optional().default(false),
  disabilityType: z.string().nullable().optional(),
  employmentStatus: z.string().min(1, "Status ketenagakerjaan wajib diisi"),
  nik: z.string().min(1, "NIK wajib diisi"),
  bpjsStatus: z.enum(["REGISTERED", "NOT_REGISTERED"]),
  bpjsType: z.enum(["WAGE_EARNER", "NON_WAGE_EARNER"]).nullable().optional(),
  bpjsNumber: z.string().nullable().optional(),
  hasIdentityConflict: z.boolean().optional().default(false),
  conflictSource: z.enum(["APPLICANT", "MENTOR", "BOTH"]).nullable().optional(),
});

// GET /api/employees
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response || !user) return response;

    const searchParams = request.nextUrl.searchParams;
    const outputId = searchParams.get("outputId");
    const mentorId = searchParams.get("mentorId");
    const workspaceId = searchParams.get("workspaceId");

    const where: any = {};
    if (outputId) where.outputId = outputId;

    const outputConditions: any = {};
    if (workspaceId) {
      outputConditions.workspaceId = workspaceId;
    }
    if (mentorId) {
      outputConditions.applicant = {
        mentorId: mentorId,
      };
    }

    if (Object.keys(outputConditions).length > 0) {
      where.output = outputConditions;
    }

    if (user.globalRole !== "SUPER_ADMIN" && user.globalRole !== "WORKSPACE_SUPERVISOR") {
      const approvedMemberships = user.workspaceMemberships.filter(
        (m) => m.verificationStatus === "APPROVED"
      );

      if (approvedMemberships.length === 0) {
        return jsonResponse([]);
      }

      const workspaceFilters = approvedMemberships.map((m) => {
        const baseFilter: any = { output: { workspaceId: m.workspaceId } };
        if (m.role === "MENTOR") {
          baseFilter.output.applicant = { mentorId: m.id };
        } else if (m.role === "UNIVERSITY_ADMIN" || m.role === "UNIVERSITY_SUPERVISOR") {
          baseFilter.output.applicant = {
            mentor: {
              universityId: m.universityId,
            },
          };
        }
        return baseFilter;
      });

      where.OR = workspaceFilters;
    }

    const employees = await prisma.employee.findMany({
      where,
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
        output: {
          include: {
            applicant: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse(employees);
  } catch (error) {
    console.error("GET /api/employees error:", error);
    return errorResponse("Failed to fetch employees", 500);
  }
}

// POST /api/employees
export async function POST(request: NextRequest) {
  try {
    const { data: body, error } = await parseBody(request, createEmployeeSchema);
    if (error || !body) {
      return errorResponse(error || "Invalid payload", 400);
    }

    const output = await prisma.outputReport.findUnique({
      where: { id: body.outputId },
    });
    if (!output) {
      return errorResponse("Output report not found", 404);
    }

    const writeAccess = await requireWorkspaceWriteAccess(request, output.workspaceId);
    if (writeAccess.response) return writeAccess.response;

    if (body.nik) {
      const existingApplicant = await prisma.applicant.findFirst({
        where: {
          workspaceId: output.workspaceId,
          profile: { nik: body.nik },
        },
      });
      if (existingApplicant) {
        return errorResponse(`NIK Karyawan ${body.nik} tidak boleh sama dengan NIK Peserta/TKM`, 400);
      }

      const existingEmployee = await prisma.employee.findFirst({
        where: {
          nik: body.nik,
          output: { workspaceId: output.workspaceId },
        },
      });
      if (existingEmployee) {
        return errorResponse(`NIK Karyawan ${body.nik} sudah terdaftar di kelompok/peserta lain`, 400);
      }
    }

    const employee = await prisma.employee.create({
      data: {
        outputId: body.outputId,
        profileId: body.profileId,
        name: body.name,
        role: body.role,
        gender: body.gender as Gender,
        hasDisability: body.hasDisability,
        disabilityType: body.disabilityType,
        employmentStatus: body.employmentStatus,
        nik: body.nik,
        bpjsStatus: body.bpjsStatus as BpjsStatus,
        bpjsType: body.bpjsType ? (body.bpjsType as BpjsType) : null,
        bpjsNumber: body.bpjsNumber,
        nikStatus: NikStatus.VALID,
        hasIdentityConflict: body.hasIdentityConflict,
        conflictSource: body.conflictSource ? (body.conflictSource as ConflictSource) : null,
      },
    });

    // Trigger OCR validation check
    await validateEmployeeOcr(employee.id);

    return jsonResponse(employee, 201);
  } catch (error) {
    console.error("POST /api/employees error:", error);
    return errorResponse("Failed to create employee", 500);
  }
}
