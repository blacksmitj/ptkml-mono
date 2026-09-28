import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireWorkspaceWriteAccess } from "@/lib/rbac";
import { Gender, BpjsStatus, BpjsType, NikStatus, ConflictSource } from "@prisma/client";
import { validateEmployeeOcr } from "@/lib/ocr-validation";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { z } from "zod";

const updateEmployeeSchema = z.object({
  name: z.string().optional(),
  nik: z.string().optional(),
  role: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  hasIdentityConflict: z.boolean().optional(),
  conflictSource: z.enum(["APPLICANT", "MENTOR", "BOTH"]).nullable().optional(),
  employmentStatus: z.string().optional(),
  bpjsStatus: z.enum(["REGISTERED", "NOT_REGISTERED"]).optional(),
  bpjsType: z.enum(["WAGE_EARNER", "NON_WAGE_EARNER"]).nullable().optional(),
  bpjsNumber: z.string().nullable().optional(),
  hasDisability: z.boolean().optional(),
  disabilityType: z.string().nullable().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/employees/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: { id },
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
    });

    if (!employee) {
      return errorResponse("Employee not found", 404);
    }

    return jsonResponse(employee);
  } catch (error) {
    console.error("GET /api/employees/[id] error:", error);
    return errorResponse("Failed to fetch employee", 500);
  }
}

// PATCH /api/employees/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { output: true },
    });
    if (!employee) {
      return errorResponse("Employee not found", 404);
    }

    const writeAccess = await requireWorkspaceWriteAccess(request, employee.output.workspaceId);
    if (writeAccess.response) return writeAccess.response;

    const { data: body, error } = await parseBody(request, updateEmployeeSchema);
    if (error || !body) {
      return errorResponse(error || "Invalid payload", 400);
    }

    if (body.nik) {
      const existingApplicant = await prisma.applicant.findFirst({
        where: {
          workspaceId: employee.output.workspaceId,
          profile: { nik: body.nik },
        },
      });
      if (existingApplicant) {
        return errorResponse(`NIK Karyawan ${body.nik} tidak boleh sama dengan NIK Peserta/TKM`, 400);
      }

      const existingEmployee = await prisma.employee.findFirst({
        where: {
          nik: body.nik,
          id: { not: id },
          output: { workspaceId: employee.output.workspaceId },
        },
      });
      if (existingEmployee) {
        return errorResponse(`NIK Karyawan ${body.nik} sudah terdaftar di kelompok/peserta lain`, 400);
      }
    }

    const data: Record<string, any> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.nik !== undefined) {
      data.nik = body.nik;
      data.nikStatus = NikStatus.VALID;
    }
    if (body.role !== undefined) data.role = body.role;
    if (body.gender !== undefined) data.gender = body.gender as Gender;
    if (body.hasIdentityConflict !== undefined) data.hasIdentityConflict = body.hasIdentityConflict;
    if (body.conflictSource !== undefined) data.conflictSource = body.conflictSource as ConflictSource;
    if (body.employmentStatus !== undefined) data.employmentStatus = body.employmentStatus;
    if (body.bpjsStatus !== undefined) data.bpjsStatus = body.bpjsStatus as BpjsStatus;
    if (body.bpjsType !== undefined) data.bpjsType = body.bpjsType as BpjsType;
    if (body.bpjsNumber !== undefined) data.bpjsNumber = body.bpjsNumber;
    if (body.hasDisability !== undefined) data.hasDisability = body.hasDisability;
    if (body.disabilityType !== undefined) data.disabilityType = body.disabilityType;

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data,
    });

    // Trigger OCR validation check
    await validateEmployeeOcr(updatedEmployee.id);

    return jsonResponse(updatedEmployee);
  } catch (error) {
    console.error("PATCH /api/employees/[id] error:", error);
    return errorResponse("Failed to update employee", 500);
  }
}

// DELETE /api/employees/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { output: true },
    });
    if (!employee) {
      return errorResponse("Employee not found", 404);
    }

    const writeAccess = await requireWorkspaceWriteAccess(request, employee.output.workspaceId);
    if (writeAccess.response) return writeAccess.response;

    await prisma.employee.delete({
      where: { id },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/employees/[id] error:", error);
    return errorResponse("Failed to delete employee", 500);
  }
}
